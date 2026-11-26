import { Languages } from "lucide-react";
import { useI18n } from "@/core/i18n";
import { useSettings } from "../hooks/useSettings";
import { OptionGroup, SettingsCard } from "./SettingsCard";

export function LanguageSettings() {
  const { t } = useI18n();
  const { language, setLanguage } = useSettings();
  return (
    <SettingsCard
      id="set-language"
      icon={<Languages size={22} />}
      title={t("settings.language.title")}
      description={t("settings.language.desc")}
    >
      <OptionGroup
        labelledBy="set-language-title"
        value={language}
        onChange={setLanguage}
        options={[
          { value: "vi", label: t("settings.language.vi"), hint: "Vietnamese" },
          { value: "en", label: t("settings.language.en"), hint: "Tiếng Anh" },
        ]}
      />
    </SettingsCard>
  );
}
