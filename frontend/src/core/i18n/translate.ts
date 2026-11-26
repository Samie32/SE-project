import { loadSettings, type Language } from "@/core/preferences/settingsStorage";
import { uiEn, uiVi, type UiTranslationKey } from "./uiStrings";

export type { UiTranslationKey };
export type TranslateParams = Record<string, string | number>;

const DICTIONARIES: Record<Language, Record<UiTranslationKey, string>> = {
  vi: uiVi,
  en: uiEn,
};

let current: Language = loadSettings().language;

export const getLanguage = (): Language => current;

export function setCurrentLanguage(lang: Language): void {
  current = lang;
}

function fill(text: string, params?: TranslateParams): string {
  return params
    ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m))
    : text;
}

export function translate(language: Language, key: UiTranslationKey, params?: TranslateParams): string {
  return fill(DICTIONARIES[language]?.[key] ?? uiVi[key] ?? key, params);
}

export function tt(key: UiTranslationKey, params?: TranslateParams): string {
  return translate(current, key, params);
}

export function translateOr(language: Language, key: string, fallback: string): string {
  const dict = DICTIONARIES[language] as Record<string, string> | undefined;
  return dict?.[key] ?? fallback;
}
