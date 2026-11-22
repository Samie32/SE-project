import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileHeart } from "lucide-react";
import { listPatientPrescriptions, listPatientRecords } from "@/api/operations";
import { config } from "@/core/config";
import { useDirectory } from "@/core/directory";
import { formatDate, formatDateTime } from "@/core/datetime";
import { recordSummary } from "@/core/record-content";
import { useAsync } from "@/core/useAsync";
import { AsyncBlock, Empty, PageHead, Panel, PendingBackend, Pill } from "@/ui";
import { PrescriptionView, RecordView } from "@/features/shared/RecordView";
import { usePatient } from "./PatientContext";

export function PatientRecordsPage() {
  const { patientId, appointments } = usePatient();
  const dir = useDirectory();
  const enabled = config.backend.clinical;
  const data = useAsync(async () => {
    if (!enabled || !patientId) return { records: [], rx: [] };
    const [records, rx] = await Promise.all([listPatientRecords(patientId), listPatientPrescriptions(patientId)]);
    return { records: records.filter((r) => r.status === "FINAL"), rx };
  }, [patientId, enabled]);
  const records = [...(data.data?.records ?? [])].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  const [sel, setSel] = useState("");
  useEffect(() => { if (!records.some((r) => r.id === sel)) setSel(records[0]?.id ?? ""); }, [records.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const record = records.find((r) => r.id === sel);
  const appt = record ? appointments.find((a) => a.encounterId === record.encounterId || a.id === record.appointmentId) : undefined;
  const rx = record ? data.data?.rx.filter((x) => x.encounterId === record.encounterId && x.status === "ISSUED") : [];
  const completed = appointments.filter((a) => a.status === "COMPLETED");

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link to="/patient" className="btn sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Quay lại Tổng quan
        </Link>
      </div>
      <PageHead eyebrow="Hồ sơ sức khỏe" title="Hồ sơ & đơn thuốc" text="Chỉ hiển thị bệnh án đã hoàn tất và đơn thuốc đã phát hành." />
      <PendingBackend feature="clinical" />
      {!enabled ? (
        <Panel title="Lịch sử khám" subtitle={`${completed.length} lần khám đã hoàn tất`}>
          {completed.length ? completed.map((a) => (
            <div className="doctor-card" key={a.id}><span className="docavatar"><FileHeart size={20} aria-hidden /></span>
              <div className="docmeta"><b>{dir.doctorName(a.doctorId)}</b><small>{formatDateTime(a.startAt)}</small></div><Pill tone="ok">Hoàn tất</Pill></div>
          )) : <Empty title="Chưa có lần khám hoàn tất" />}
        </Panel>
      ) : (
        <div className="split">
          <Panel title="Lịch sử khám" subtitle={`${records.length} bệnh án`}>
            <AsyncBlock loading={data.loading} error={data.error} onRetry={data.reload} empty={records.length === 0} emptyTitle="Chưa có bệnh án hoàn tất" emptyText="Bệnh án xuất hiện sau khi bác sĩ hoàn tất.">
              {records.map((r) => {
                const a = appointments.find((x) => x.encounterId === r.encounterId);
                const d = (a?.startAt ?? r.updatedAt ?? "");
                return (
                  <button key={r.id} className={"listbtn" + (r.id === sel ? " on" : "")} aria-pressed={r.id === sel} onClick={() => setSel(r.id)}>
                    <span className="d"><b>{d.slice(8, 10) || "—"}</b><small>T{d.slice(5, 7)}</small></span>
                    <span><b>{a ? dir.doctorName(a.doctorId) : "Lần khám"}</b><small>{recordSummary(r)}</small></span>
                  </button>
                );
              })}
            </AsyncBlock>
          </Panel>
          <div>
            {record ? (
              <>
                <Panel title={appt ? dir.doctorName(appt.doctorId) : "Bệnh án"} subtitle={appt ? `Lần khám ngày ${formatDate(appt.startAt)}` : undefined} actions={<Pill tone="ok">Đã hoàn tất</Pill>}>
                  <RecordView record={record} />
                </Panel>
                <Panel title="Đơn thuốc điện tử" subtitle="Chỉ hiển thị đơn đã phát hành">
                  {rx && rx.length ? rx.map((x) => <PrescriptionView key={x.id} rx={x} />) : <Empty title="Không có đơn thuốc cho lần khám này" />}
                </Panel>
              </>
            ) : <Panel><Empty title="Chọn một lần khám để xem chi tiết" /></Panel>}
          </div>
        </div>
      )}
    </>
  );
}
