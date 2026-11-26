import { useI18n } from "@/core/i18n";
import { PageHead } from "@/ui";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { FontSizeSettings } from "./components/FontSizeSettings";
import { LanguageSettings } from "./components/LanguageSettings";
import "./settings.css";

/** Khối 3 tùy chọn giao diện (dùng nhúng trực tiếp trong tab của Tài khoản của tôi). */
export function DisplaySettingsSection() {
  return (
    <div className="settings-grid">
      <AppearanceSettings />
      <LanguageSettings />
      <FontSizeSettings />
    </div>
  );
}

/** Trang Cài đặt độc lập (nếu truy cập trực tiếp). */
export function SettingsPage() {
  const { t } = useI18n();
  return (
    <div className="settings-page">
      <PageHead eyebrow={t("settings.eyebrow")} title={t("settings.title")} text={t("settings.description")} />
      <DisplaySettingsSection />
    </div>
  );
}
