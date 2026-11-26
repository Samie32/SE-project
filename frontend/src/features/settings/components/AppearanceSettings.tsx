import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useI18n } from "@/core/i18n";
import { useSettings } from "../hooks/useSettings";
import { OptionGroup, SettingsCard } from "./SettingsCard";

export function AppearanceSettings() {
  const { t } = useI18n();
  const { theme, setTheme } = useSettings();
  return (
    <SettingsCard
      id="set-appearance"
      icon={<Palette size={22} />}
      title={t("settings.appearance.title")}
      description={t("settings.appearance.desc")}
    >
      <OptionGroup
        labelledBy="set-appearance-title"
        value={theme}
        onChange={setTheme}
        options={[
          { value: "light", icon: <Sun size={22} />, label: t("settings.theme.light"), hint: t("settings.theme.lightDesc") },
          { value: "dark", icon: <Moon size={22} />, label: t("settings.theme.dark"), hint: t("settings.theme.darkDesc") },
          { value: "system", icon: <Monitor size={22} />, label: t("settings.theme.system"), hint: t("settings.theme.systemDesc") },
        ]}
      />
    </SettingsCard>
  );
}
