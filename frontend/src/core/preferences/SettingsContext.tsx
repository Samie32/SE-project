import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { setCurrentLanguage } from "@/core/i18n/translate";
import { syncDomTranslation } from "@/core/i18n/domTranslator";
import {
  DEFAULT_SETTINGS,
  applySettingsToDocument,
  loadSettings,
  resolveTheme,
  saveSettings,
  systemPrefersDark,
  type FontSize,
  type Language,
  type Settings,
  type ThemeMode,
} from "./settingsStorage";

export interface SettingsApi extends Settings {
  setTheme: (v: ThemeMode) => void;
  setFontSize: (v: FontSize) => void;
  setLanguage: (v: Language) => void;
  /** Giao diện đang hiển thị thực tế (đã quy đổi system → light/dark). */
  resolvedTheme: "light" | "dark";
}

const fallback: SettingsApi = {
  ...DEFAULT_SETTINGS,
  setTheme: () => {},
  setFontSize: () => {},
  setLanguage: () => {},
  resolvedTheme: "light",
};

export const SettingsContext = createContext<SettingsApi>(fallback);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  setCurrentLanguage(settings.language);
  const [prefersDark, setPrefersDark] = useState<boolean>(() => systemPrefersDark());

  useEffect(() => {
    let mq: MediaQueryList | undefined;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    } catch {
      mq = undefined;
    }
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener?.(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener?.(onChange);
    };
  }, []);

  useLayoutEffect(() => {
    applySettingsToDocument(settings, prefersDark);
    saveSettings(settings);
    if (typeof document !== "undefined") {
      document.title = settings.language === "en" ? "ClinicCare — Clinic System" : "ClinicCare — Hệ thống phòng khám";
    }
    syncDomTranslation(settings.language);
  }, [settings, prefersDark]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("cliniccare_settings_")) setSettings(loadSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => setSettings((s) => ({ ...s, theme })), []);
  const setFontSize = useCallback((fontSize: FontSize) => setSettings((s) => ({ ...s, fontSize })), []);
  const setLanguage = useCallback((language: Language) => setSettings((s) => ({ ...s, language })), []);

  const value = useMemo<SettingsApi>(
    () => ({
      ...settings,
      setTheme,
      setFontSize,
      setLanguage,
      resolvedTheme: resolveTheme(settings.theme, prefersDark),
    }),
    [settings, prefersDark, setTheme, setFontSize, setLanguage],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): SettingsApi {
  return useContext(SettingsContext);
}
