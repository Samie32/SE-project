/**
 * Lưu / đọc cài đặt cá nhân hóa giao diện trong localStorage.
 * - Mỗi cài đặt một key riêng với tiền tố `cliniccare_settings_`, không đụng key khác của dự án.
 * - Dữ liệu hỏng / giá trị lạ / localStorage bị chặn → quay về giá trị mặc định, không ném lỗi.
 * - Không xóa khi đăng xuất (tùy chọn hiển thị cục bộ trên trình duyệt).
 */

export const THEMES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEMES)[number];

export const FONT_SIZES = ["small", "medium", "large", "xlarge"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const LANGUAGES = ["vi", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Settings {
  theme: ThemeMode;
  fontSize: FontSize;
  language: Language;
}

/** Cỡ chữ gốc (px) của từng mức. */
export const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

/**
 * Mặc định "large" (18px) khớp với cỡ chữ gốc của ClinicCare Design System:
 * người dùng chưa từng cài đặt sẽ thấy giao diện y hệt trước khi có Settings.
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  fontSize: "large",
  language: "vi",
};

const KEYS = {
  theme: "cliniccare_settings_theme",
  fontSize: "cliniccare_settings_fontSize",
  language: "cliniccare_settings_language",
} as const;

function pick<T extends string>(allowed: readonly T[], raw: string | null, fallback: T): T {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function readRaw(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  } catch {
    /* Private mode / quota đầy: giữ hoạt động trên RAM cho phiên hiện tại. */
  }
}

export function loadSettings(): Settings {
  return {
    theme: pick(THEMES, readRaw(KEYS.theme), DEFAULT_SETTINGS.theme),
    fontSize: pick(FONT_SIZES, readRaw(KEYS.fontSize), DEFAULT_SETTINGS.fontSize),
    language: pick(LANGUAGES, readRaw(KEYS.language), DEFAULT_SETTINGS.language),
  };
}

export function saveSettings(s: Settings): void {
  writeRaw(KEYS.theme, s.theme);
  writeRaw(KEYS.fontSize, s.fontSize);
  writeRaw(KEYS.language, s.language);
}

export function systemPrefersDark(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveTheme(theme: ThemeMode, prefersDark: boolean = systemPrefersDark()): "light" | "dark" {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

export function applySettingsToDocument(s: Settings, prefersDark: boolean = systemPrefersDark()): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolveTheme(s.theme, prefersDark));
  root.setAttribute("data-font-size", s.fontSize);
  root.setAttribute("lang", s.language);
}
