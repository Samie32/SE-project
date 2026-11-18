// Cấu hình build-time CÔNG KHAI (không chứa bí mật). Xem .env.example.
const flag = (value?: string) => value === undefined || value === "true";

export const config = {
  oidcAuthority:
    import.meta.env.VITE_OIDC_AUTHORITY || "http://localhost:8180/realms/clinic",
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID || "clinic-web",
  /** Chế độ giả lập (npm run dev:mock). Bị loại khỏi bản build production. */
  mock: import.meta.env.DEV && import.meta.env.MODE === "mock",
  /**
   * Một năng lực chỉ được bật SAU KHI backend triển khai endpoint tương ứng.
   * Khi tắt: giao diện vẫn đầy đủ nhưng không gọi mạng và không bịa kết quả.
   */
  backend: {
    checkin: flag(import.meta.env.VITE_BACKEND_CHECKIN),
    queue: flag(import.meta.env.VITE_BACKEND_QUEUE),
    progress: flag(import.meta.env.VITE_BACKEND_PROGRESS),
    clinical: flag(import.meta.env.VITE_BACKEND_CLINICAL),
    telehealth: flag(import.meta.env.VITE_BACKEND_TELEHEALTH),
    audit: flag(import.meta.env.VITE_BACKEND_AUDIT),
  },
} as const;

export type BackendFeature = keyof typeof config.backend;

export const FEATURE_LABEL: Record<BackendFeature, string> = {
  checkin: "Check-in tiếp đón",
  queue: "Hàng đợi khám",
  progress: "Tiến trình lần khám",
  clinical: "Hồ sơ bệnh án & đơn thuốc",
  telehealth: "Phòng khám từ xa",
  audit: "Nhật ký kiểm toán",
};
