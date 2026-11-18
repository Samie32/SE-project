import { parseContent } from "@/core/record-content";
import type { MedicalRecord, Prescription } from "@/core/types";

const VITAL_LABELS: [keyof ReturnType<typeof parseContent>["vitals"], string, string][] = [
  ["bloodPressure", "Huyết áp", "mmHg"], ["heartRate", "Nhịp tim", "lần/phút"], ["temperature", "Nhiệt độ", "°C"], ["weight", "Cân nặng", "kg"], ["height", "Chiều cao", "cm"],
];

/** Hiển thị chỉ-đọc nội dung bệnh án (dùng cho bệnh nhân và lịch sử của bác sĩ). */
export function RecordView({ record }: { record: MedicalRecord }) {
  const c = parseContent(record.content);
  const vitals = VITAL_LABELS.filter(([k]) => c.vitals[k]);
  return (
    <div>
      {record.supersedesId && <p className="notice warn" style={{ display: "block" }}><b>Bản chỉnh sửa bổ sung.</b> Lý do: {record.amendmentReason || "—"}. Bản gốc được giữ nguyên.</p>}
      {c.symptoms && <div className="record-sec"><h3>Triệu chứng</h3><p>{c.symptoms}</p></div>}
      {vitals.length > 0 && (
        <div className="record-sec"><h3>Chỉ số sinh tồn</h3>
          <div className="vitals">{vitals.map(([k, l, u]) => <div key={k}><small>{l}</small><b>{c.vitals[k]}</b> <small>{u}</small></div>)}</div>
        </div>
      )}
      <div className="record-sec"><h3>Chẩn đoán</h3><p>{c.diagnosis || "—"}</p></div>
      <div className="record-sec"><h3>Hướng điều trị / lời dặn</h3><p>{c.plan || "—"}</p></div>
      {c.notes && <div className="record-sec"><h3>Ghi chú</h3><p>{c.notes}</p></div>}
    </div>
  );
}

export function PrescriptionView({ rx }: { rx: Prescription }) {
  return (
    <div>
      {rx.items.map((i, idx) => (
        <div className="rx-item" key={idx}>
          <b>{idx + 1}. {i.medicineName}</b>
          <dl>
            <div><dt>Liều dùng</dt><dd>{i.doseText}</dd></div>
            <div><dt>Đường dùng</dt><dd>{i.route}</dd></div>
            <div><dt>Tần suất</dt><dd>{i.frequency}</dd></div>
            <div><dt>Thời gian</dt><dd>{i.durationText}</dd></div>
          </dl>
        </div>
      ))}
    </div>
  );
}
