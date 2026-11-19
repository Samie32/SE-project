import { api } from "@/core/client";

export const ACCOUNT_UUID = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
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

export const updatePatientAccountAccess = (
  id: string,
  active: boolean,
  reason: PatientAccountReason,
) =>
  api.put<PatientAccount>(
    `/patient-accounts/${encodeURIComponent(id)}/access`,
    { active, reason },
  );
