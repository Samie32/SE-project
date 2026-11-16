import type { MedicalRecord } from "./types";

/**
 * Hợp đồng thiết kế coi `content` là một chuỗi. Để có biểu mẫu có cấu trúc,
 * frontend lưu JSON phiên bản 1 vào chuỗi đó và vẫn đọc được văn bản thuần.
 */
export interface RecordContent {
  v: 1;
  symptoms: string;
  diagnosis: string;
  plan: string;
  notes: string;
  vitals: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    weight: string;
    height: string;
  };
}

export const emptyContent = (): RecordContent => ({
  v: 1,
  symptoms: "",
  diagnosis: "",
  plan: "",
  notes: "",
  vitals: { bloodPressure: "", heartRate: "", temperature: "", weight: "", height: "" },
});

export function parseContent(raw: string | undefined | null): RecordContent {
  const base = emptyContent();
  if (!raw) return base;
  try {
    const x = JSON.parse(raw) as Partial<RecordContent>;
    if (x && typeof x === "object" && x.v === 1)
      return {
        ...base,
        ...x,
        vitals: { ...base.vitals, ...(x.vitals ?? {}) },
      } as RecordContent;
  } catch {
    /* văn bản thuần */
  }
  return { ...base, notes: raw };
}

export const serializeContent = (c: RecordContent) => JSON.stringify(c);

export const hasClinicalCore = (c: RecordContent) =>
  c.diagnosis.trim().length > 0 && c.plan.trim().length > 0;

export const recordSummary = (r: MedicalRecord) => {
  const c = parseContent(r.content);
  return c.diagnosis || c.notes || "—";
};
