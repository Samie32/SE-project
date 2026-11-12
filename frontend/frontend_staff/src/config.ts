// Public, build-time settings only (never secrets). See .env.example.
const flag = (value?: string) => value === "true";

export const config = {
  oidcAuthority:
    import.meta.env.VITE_OIDC_AUTHORITY || "http://localhost:8180/realms/clinic",
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID || "clinic-web",
  doctorUrl: import.meta.env.VITE_DOCTOR_URL || "",
  patientUrl: import.meta.env.VITE_PATIENT_URL || "",
  // A capability is enabled ONLY after the backend implements the endpoint.
  backend: {
    checkin: flag(import.meta.env.VITE_BACKEND_CHECKIN),
    queue: flag(import.meta.env.VITE_BACKEND_QUEUE),
    audit: flag(import.meta.env.VITE_BACKEND_AUDIT),
  },
} as const;

export type BackendFeature = keyof typeof config.backend;
