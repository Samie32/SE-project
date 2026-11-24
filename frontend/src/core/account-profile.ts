import type { Identity } from "./types";

export interface ProfileFieldInfo {
  key: string;
  label: string;
  shortLabel: string;
  displayValue: string | null;
  filled: boolean;
  important: boolean;
  isExtra: boolean;
}

export interface AccountProfileAnalysis {
  fields: ProfileFieldInfo[];
  extraFields: ProfileFieldInfo[];
  missing: ProfileFieldInfo[];
  missingImportant: ProfileFieldInfo[];
  complete: boolean;
  filledCount: number;
  totalCount: number;
}

const SYSTEM_IDENTITY_KEYS = new Set([
  "id",
  "username",
  "roles",
  "doctorId",
  "patientId",
  "displayName",
  "active",
  "staff",
  "subject",
  "createdAt",
  "updatedAt",
  "personalInfoUpdatedAt",
  "personalInfoNextEditAt",
  "attributes",
]);

const FIELD_META: Record<string, { label: string; shortLabel: string; important?: boolean }> = {
  email: { label: "Email nhận thông báo", shortLabel: "email", important: true },
  phone: { label: "Số điện thoại", shortLabel: "số điện thoại" },
  birthDate: { label: "Ngày sinh", shortLabel: "ngày sinh" },
  dateOfBirth: { label: "Ngày sinh", shortLabel: "ngày sinh" },
  dob: { label: "Ngày sinh", shortLabel: "ngày sinh" },
  hometown: { label: "Quê quán", shortLabel: "quê quán" },
  permanentAddress: { label: "Địa chỉ thường trú", shortLabel: "địa chỉ thường trú" },
  gender: { label: "Giới tính", shortLabel: "giới tính" },
  address: { label: "Địa chỉ", shortLabel: "địa chỉ" },
  nationalId: { label: "CCCD / CMND", shortLabel: "CCCD/CMND" },
  citizenId: { label: "CCCD / CMND", shortLabel: "CCCD/CMND" },
  cccd: { label: "CCCD / CMND", shortLabel: "CCCD/CMND" },
  insuranceNumber: { label: "Số thẻ BHYT", shortLabel: "số BHYT" },
  bhyt: { label: "Số thẻ BHYT", shortLabel: "số BHYT" },
  emergencyContact: { label: "Liên hệ khẩn cấp", shortLabel: "liên hệ khẩn cấp" },
  bloodType: { label: "Nhóm máu", shortLabel: "nhóm máu" },
  allergies: { label: "Tiền sử dị ứng", shortLabel: "dị ứng" },
};

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function describeField(key: string) {
  const known = FIELD_META[key];
  if (known) return known;
  const label = humanizeKey(key);
  return { label, shortLabel: label.toLowerCase(), important: false };
}

function formatDateDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatFieldValue(value: unknown, key?: string): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatFieldValue(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? items.join(", ") : null;
  }
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0 ? JSON.stringify(value) : null;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (key === "birthDate" || key === "dateOfBirth" || key === "dob") {
    return formatDateDisplay(text);
  }
  return text;
}

function buildField(key: string, value: unknown, isExtra: boolean): ProfileFieldInfo {
  const meta = describeField(key);
  const displayValue = formatFieldValue(value, key);
  return {
    key,
    label: meta.label,
    shortLabel: meta.shortLabel,
    displayValue,
    filled: displayValue !== null,
    important: Boolean(meta.important),
    isExtra,
  };
}

/**
 * Tự động phân tích các trường thông tin trên `/api/me/profile`:
 * - Luôn theo dõi `email` và `phone`.
 * - Tự động nhận diện mọi trường mới do admin/backend bổ sung ở top-level hoặc trong `attributes`.
 */
export function analyzeAccountProfile(identity: Identity | null | undefined): AccountProfileAnalysis {
  if (!identity) {
    return {
      fields: [],
      extraFields: [],
      missing: [],
      missingImportant: [],
      complete: true,
      filledCount: 0,
      totalCount: 0,
    };
  }

  const seen = new Set<string>(["email", "phone"]);
  const fields: ProfileFieldInfo[] = [
    buildField("email", identity.email, false),
    buildField("phone", identity.phone, false),
  ];

  const extraFields: ProfileFieldInfo[] = [];
  const pushExtra = (key: string, value: unknown) => {
    if (seen.has(key) || SYSTEM_IDENTITY_KEYS.has(key)) return;
    seen.add(key);
    const info = buildField(key, value, true);
    fields.push(info);
    extraFields.push(info);
  };

  for (const [key, value] of Object.entries(identity)) {
    pushExtra(key, value);
  }
  if (identity.attributes && typeof identity.attributes === "object" && !Array.isArray(identity.attributes)) {
    for (const [key, value] of Object.entries(identity.attributes)) {
      pushExtra(key, value);
    }
  }

  const missing = fields.filter((f) => !f.filled);
  const missingImportant = missing.filter((f) => f.important);
  const filledCount = fields.length - missing.length;

  return {
    fields,
    extraFields,
    missing,
    missingImportant,
    complete: missing.length === 0,
    filledCount,
    totalCount: fields.length,
  };
}
