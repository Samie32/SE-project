/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_AUTHORITY?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_DOCTOR_URL?: string;
  readonly VITE_PATIENT_URL?: string;
  readonly VITE_BACKEND_CHECKIN?: string;
  readonly VITE_BACKEND_QUEUE?: string;
  readonly VITE_BACKEND_AUDIT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
