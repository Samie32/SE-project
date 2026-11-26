import type { Language } from "@/core/preferences/settingsStorage";
import { VI_TO_EN_DICT } from "./viToEnDict";
import { VI_TO_EN_PATTERNS } from "./viToEnPatterns";

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
const VI_CHAR_RE =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
const CODE_ONLY_RE = /^(?:LH-[A-F0-9]+|BN-[A-F0-9]+|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})$/i;

const origText = new WeakMap<Text, string>();
const translatedText = new WeakMap<Text, string>();
const trackedTextNodes = new Set<Text>();

const origAttrs = new WeakMap<Element, Map<string, string>>();
const translatedAttrs = new WeakMap<Element, Map<string, string>>();
const trackedElements = new Set<Element>();

let observer: MutationObserver | null = null;
let currentMode: Language = "vi";

function normKey(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function translateText(raw: string): string {
  const lead = raw.match(/^\s*/)?.[0] ?? "";
  const tail = raw.match(/\s*$/)?.[0] ?? "";
  const trimmed = normKey(raw);
  if (!trimmed || CODE_ONLY_RE.test(trimmed)) return raw;

  const exact = VI_TO_EN_DICT[trimmed];
  if (exact !== undefined) return lead + exact + tail;

  if (!VI_CHAR_RE.test(trimmed)) return raw;

  for (const [re, rep] of VI_TO_EN_PATTERNS) {
    if (re.test(trimmed)) {
      const out = typeof rep === "string" ? trimmed.replace(re, rep) : trimmed.replace(re, rep);
      if (out !== trimmed) return lead + out + tail;
    }
  }
  return raw;
}

function shouldSkipElement(el: Element | null): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (SKIP_TAGS.has(cur.tagName)) return true;
    if (cur.hasAttribute("data-no-i18n")) return true;
    cur = cur.parentElement;
  }
  return false;
}

function processTextNode(node: Text): void {
  const val = node.nodeValue ?? "";
  if (!val.trim()) return;
  if (shouldSkipElement(node.parentElement)) return;

  // Nếu giá trị hiện tại chính là chuỗi đã dịch bởi lần quét trước thì bỏ qua.
  if (translatedText.get(node) === val) return;

  // React vừa thay đổi text gốc (hoặc đây là node mới): lưu bản tiếng Việt mới nhất.
  origText.set(node, val);
  trackedTextNodes.add(node);

  const out = translateText(val);
  if (out !== val) {
    translatedText.set(node, out);
    node.nodeValue = out;
  } else {
    translatedText.delete(node);
  }
}

function processElementAttrs(el: Element): void {
  if (shouldSkipElement(el)) return;
  let oMap = origAttrs.get(el);
  let tMap = translatedAttrs.get(el);
  for (const attr of ATTRS) {
    const val = el.getAttribute(attr);
    if (!val || !val.trim()) continue;
    if (tMap?.get(attr) === val) continue;

    if (!oMap) {
      oMap = new Map();
      origAttrs.set(el, oMap);
    }
    oMap.set(attr, val);
    trackedElements.add(el);

    const out = translateText(val);
    if (out !== val) {
      if (!tMap) {
        tMap = new Map();
        translatedAttrs.set(el, tMap);
      }
      tMap.set(attr, out);
      el.setAttribute(attr, out);
    } else {
      tMap?.delete(attr);
    }
  }
}

function walkSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (shouldSkipElement(el)) return;

  processElementAttrs(el);
  for (let child = el.firstChild; child; child = child.nextSibling) {
    walkSubtree(child);
  }
}

function restoreAll(): void {
  for (const node of trackedTextNodes) {
    if (!node.isConnected) {
      trackedTextNodes.delete(node);
      continue;
    }
    const orig = origText.get(node);
    const trans = translatedText.get(node);
    if (orig !== undefined && trans !== undefined && node.nodeValue === trans) {
      node.nodeValue = orig;
    }
    translatedText.delete(node);
  }
  for (const el of trackedElements) {
    if (!el.isConnected) {
      trackedElements.delete(el);
      continue;
    }
    const oMap = origAttrs.get(el);
    const tMap = translatedAttrs.get(el);
    if (!oMap || !tMap) continue;
    for (const attr of ATTRS) {
      const orig = oMap.get(attr);
      const trans = tMap.get(attr);
      if (orig !== undefined && trans !== undefined && el.getAttribute(attr) === trans) {
        el.setAttribute(attr, orig);
      }
      tMap.delete(attr);
    }
  }
}

function ensureObserver(): void {
  if (observer || typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) {
    return;
  }
  observer = new MutationObserver((records) => {
    if (currentMode !== "en") return;
    for (const r of records) {
      if (r.type === "characterData") {
        if (r.target.nodeType === Node.TEXT_NODE) processTextNode(r.target as Text);
      } else if (r.type === "attributes") {
        if (r.target.nodeType === Node.ELEMENT_NODE) processElementAttrs(r.target as Element);
      } else if (r.type === "childList") {
        for (const n of r.addedNodes) walkSubtree(n);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

export function syncDomTranslation(language: Language): void {
  currentMode = language;
  if (typeof document === "undefined" || !document.body) return;

  if (language === "vi") {
    observer?.disconnect();
    observer = null;
    restoreAll();
    return;
  }

  walkSubtree(document.body);
  ensureObserver();
}
