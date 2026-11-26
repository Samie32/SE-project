import { useCallback } from "react";
import { useSettingsContext } from "@/core/preferences/SettingsContext";
import { translate, translateOr, tt, getLanguage, type TranslateParams, type UiTranslationKey } from "./translate";

export { translate, translateOr, tt, getLanguage };
export type { UiTranslationKey, TranslateParams };

export function useI18n() {
  const { language } = useSettingsContext();
  const t = useCallback(
    (key: UiTranslationKey, params?: TranslateParams) => translate(language, key, params),
    [language],
  );
  const tr = useCallback((key: string, fallback: string) => translateOr(language, key, fallback), [language]);
  return { t, tr, language };
}
