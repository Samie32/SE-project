import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileHeart, Printer } from "lucide-react";
import { listPatientPrescriptions, listPatientRecords } from "@/api/operations";
import { config } from "@/core/config";
import { useDirectory } from "@/core/directory";
import { dayKey, formatDate, formatDateTime } from "@/core/datetime";
import { parseContent, recordSummary } from "@/core/record-content";
import { useAsync } from "@/core/useAsync";
import type { Appointment, MedicalRecord, Prescription } from "@/core/types";
import { AsyncBlock, Empty, PageHead, Panel, PendingBackend, Pill, SearchBox } from "@/ui";
import { PrescriptionView, RecordView } from "@/features/shared/RecordView";
import { usePatient } from "./PatientContext";

export function PatientRecordsPage() {
  const { patientId, appointments } = usePatient();
  const dir = useDirectory();
  const [params] = useSearchParams();
  const enabled = config.backend.clinical;
  const data = useAsync(async () => {
    if (!enabled || !patientId) return { records: [], rx: [] };
    const [records, rx] = await Promise.all([listPatientRecords(patientId), listPatientPrescriptions(patientId)]);
    return {
      records: records.filter((r) => r.status === "FINAL"),
      rx: rx.filter((x) => x.status === "ISSUED"),
    };
  }, [patientId, enabled]);

  const apptOf = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const a of appointments) {
      map.set(`id:${a.id}`, a);
      if (a.encounterId) map.set(`enc:${a.encounterId}`, a);
    }
    return (r: MedicalRecord) => map.get(`enc:${r.encounterId}`) ?? (r.appointmentId ? map.get(`id:${r.appointmentId}`) : undefined);
  }, [appointments]);

  const recordWhen = (r: MedicalRecord) => {
    const a = apptOf(r);
    return a?.startAt ?? r.startAt ?? r.createdAt ?? r.updatedAt ?? "";
  };

  const records = useMemo(
    () =>
      [...(data.data?.records ?? [])].sort((a, b) => {
        const cmp = recordWhen(b).localeCompare(recordWhen(a));
        if (cmp !== 0) return cmp;
        if (b.version !== a.version) return b.version - a.version;
        return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.data?.records, apptOf],
  );

  const rxByEncounter = useMemo(() => {
    const m = new Map<string, Prescription[]>();
    for (const item of data.data?.rx ?? []) {
      const list = m.get(item.encounterId) ?? [];
      list.push(item);
      m.set(item.encounterId, list);
    }
    return m;
  }, [data.data?.rx]);

  const supersededIds = useMemo(
    () => new Set(records.map((r) => r.supersedesId).filter((id): id is string => Boolean(id))),
    [records],
  );

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("vi");
    if (!q) return records;
    return records.filter((r) => {
      const a = apptOf(r);
      const c = parseContent(r.content);
      const medicines = (rxByEncounter.get(r.encounterId) ?? []).flatMap((p) => p.items.map((i) => i.medicineName));
      return [
        dir.doctorName(a?.doctorId ?? r.doctorId),
        c.diagnosis,
        c.symptoms,
        c.plan,
        c.notes,
        ...medicines,
      ]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(q);
    });
  }, [records, search, apptOf, rxByEncounter, dir]);

  const [sel, setSel] = useState("");
  const targetEnc = params.get("encounterId");
  const targetAppt = params.get("appointmentId");
  const recordKeys = records.map((r) => r.id).join(",");

  useEffect(() => {
    if (!filtered.length) {
      if (sel) setSel("");
      return;
    }
    if (filtered.some((r) => r.id === sel)) return;
    const matchTarget =
      !search.trim() && (targetEnc || targetAppt)
        ? filtered.find(
            (r) =>
              (targetEnc && r.encounterId === targetEnc) ||
              (targetAppt && (r.appointmentId === targetAppt || apptOf(r)?.id === targetAppt)),
          )
        : undefined;
    setSel((matchTarget ?? filtered[0]).id);
  }, [recordKeys, filtered, sel, search, targetEnc, targetAppt, apptOf]);

  const record = records.find((r) => r.id === sel);
  const appt = record ? apptOf(record) : undefined;
  const rx = record ? (rxByEncounter.get(record.encounterId) ?? []) : [];
  const completed = appointments.filter((a) => a.status === "COMPLETED");

  return (
    <>
      <div className="no-print" style={{ marginBottom: 14 }}>
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
          <Panel className="no-print" title="Lịch sử khám" subtitle={`${records.length} bệnh án`}>
            <div style={{ marginBottom: 12 }}>
              <SearchBox label="Tìm hồ sơ bệnh án" placeholder="Tìm bác sĩ, chẩn đoán, tên thuốc…" value={search} onChange={setSearch} />
            </div>
            <AsyncBlock
              loading={data.loading}
              error={data.error}
              onRetry={data.reload}
              empty={filtered.length === 0}
              emptyTitle={records.length === 0 ? "Chưa có bệnh án hoàn tất" : "Không tìm thấy bệnh án phù hợp"}
              emptyText={records.length === 0 ? "Bệnh án xuất hiện sau khi bác sĩ hoàn tất." : "Thử từ khóa khác."}
            >
              {filtered.map((r) => {
                const a = apptOf(r);
                const when = recordWhen(r);
                const key = when ? dayKey(when) : "";
                const hasRx = (rxByEncounter.get(r.encounterId)?.length ?? 0) > 0;
                const isAmended = Boolean(r.supersedesId);
                const isSuperseded = supersededIds.has(r.id);
                return (
                  <button key={r.id} type="button" className={"listbtn" + (r.id === sel ? " on" : "")} aria-pressed={r.id === sel} onClick={() => setSel(r.id)}>
                    <span className="d">
                      <b>{key ? key.slice(8, 10) : "—"}</b>
                      <small>{key ? `T${key.slice(5, 7)}` : "—"}</small>
                    </span>
                    <span className="grow">
                      <b>{dir.doctorName(a?.doctorId ?? r.doctorId)}</b>
                      <small>{recordSummary(r)}</small>
                      {(isAmended || isSuperseded || hasRx) && (
                        <span className="record-tags">
                          {isAmended && <span className="mini-tag warn">Bản bổ sung</span>}
                          {isSuperseded && <span className="mini-tag">Bản gốc cũ</span>}
                          {hasRx && <span className="mini-tag ok">Có đơn thuốc</span>}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </AsyncBlock>
          </Panel>
          <div>
            {record ? (
              <>
                <Panel
                  title={dir.doctorName(appt?.doctorId ?? record.doctorId)}
                  subtitle={recordWhen(record) ? `Lần khám ngày ${formatDate(recordWhen(record))}` : undefined}
                  actions={
                    <div className="row">
                      <Pill tone="ok">Đã hoàn tất</Pill>
                      <button type="button" className="btn sm no-print" onClick={() => window.print()}>
                        <Printer size={14} aria-hidden /> In hồ sơ
                      </button>
                    </div>
                  }
                >
                  <RecordView record={record} />
                </Panel>
                <Panel
                  title="Đơn thuốc điện tử"
                  subtitle={rx[0]?.issuedAt ? `Phát hành lúc ${formatDateTime(rx[0].issuedAt)}` : "Chỉ hiển thị đơn đã phát hành"}
                >
                  {rx.length ? rx.map((x) => <PrescriptionView key={x.id} rx={x} />) : <Empty title="Không có đơn thuốc cho lần khám này" />}
                </Panel>
              </>
            ) : <Panel><Empty title="Chọn một lần khám để xem chi tiết" /></Panel>}
          </div>
        </div>
      )}
    </>
  );
}
