import { Type } from "lucide-react";
import { useI18n } from "@/core/i18n";
import { FONT_SIZE_PX, type FontSize } from "@/core/preferences/settingsStorage";
import { useSettings } from "../hooks/useSettings";
import { OptionGroup, SettingsCard } from "./SettingsCard";

const ORDER: FontSize[] = ["small", "medium", "large", "xlarge"];

export function FontSizeSettings() {
  const { t } = useI18n();
  const { fontSize, setFontSize } = useSettings();
  return (
    <SettingsCard
      id="set-fontsize"
      className="settings-card-wide"
      icon={<Type size={22} />}
      title={t("settings.fontSize.title")}
      description={t("settings.fontSize.desc")}
    >
      <OptionGroup
        labelledBy="set-fontsize-title"
        value={fontSize}
        onChange={setFontSize}
        columns={4}
        options={ORDER.map((v) => ({
          value: v,
          label: t(`settings.fontSize.${v}` as const),
          hint: `${FONT_SIZE_PX[v]}px`,
          // "Aa" thể hiện đúng cỡ của mức đó, độc lập với mức đang áp dụng.
          sample: (
            <span className="pref-sample" style={{ fontSize: FONT_SIZE_PX[v] }} aria-hidden>
              Aa
            </span>
          ),
        }))}
      />
      <p className="pref-preview" aria-live="polite">
        {t("settings.fontSize.preview")}
      </p>
    </SettingsCard>
  );
}
