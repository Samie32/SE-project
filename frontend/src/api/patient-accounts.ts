import { api } from "@/core/client";

export const ACCOUNT_UUID = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
export const ACCOUNT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VN_MOBILE_PHONE = /^0(3|5|7|8|9)[0-9]{8}$/;
export const ACCOUNT_PHONE = /^[+]?[0-9\s.\-()]{9,20}$/;

export function normalizePhone(value: string): string | null {
  const cleaned = value.trim().replace(/[\s.\-()]/g, "");
  const normalized = cleaned.startsWith("+84")
    ? "0" + cleaned.slice(3)
    : cleaned.startsWith("84") && cleaned.length === 11
      ? "0" + cleaned.slice(2)
      : cleaned;
  return VN_MOBILE_PHONE.test(normalized) ? normalized : null;
}

export function isValidPatientLookupQuery(value: string): boolean {
  const q = value.trim();
  if (!q || q.length > 254) return false;
  return (
    ACCOUNT_UUID.test(q) ||
    ACCOUNT_EMAIL.test(q) ||
    (ACCOUNT_PHONE.test(q) && normalizePhone(q) !== null)
  );
}

export const PATIENT_ACCOUNT_REASONS = [
  "SECURITY_REVIEW",
  "POLICY_REVIEW",
  "PATIENT_REQUEST",
] as const;

export type PatientAccountReason = (typeof PATIENT_ACCOUNT_REASONS)[number];

export interface PatientAccount {
  id: string;
  displayName: string;
  active: boolean;
}

export const getPatientAccount = (id: string) =>
  api.get<PatientAccount>(`/patient-accounts/${encodeURIComponent(id)}`);

export const lookupPatientAccount = (query: string) => {
  const q = query.trim();
  return ACCOUNT_UUID.test(q)
    ? getPatientAccount(q)
    : api.get<PatientAccount>(
        `/patient-accounts/lookup?q=${encodeURIComponent(q)}`,
      );
};

export const updatePatientAccountAccess = (
  id: string,
  active: boolean,
  reason: PatientAccountReason,
) =>
  api.put<PatientAccount>(
    `/patient-accounts/${encodeURIComponent(id)}/access`,
    { active, reason },
  );
