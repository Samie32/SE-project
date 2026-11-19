import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { getAppointment, progressAppointment } from "@/api/appointments";
import { amendRecord, createPrescription, updatePrescription, issuePrescription, getEncounterRecord, listEncounterPrescriptions, listPatientRecords, saveRecord } from "@/api/operations";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useAsync } from "@/core/useAsync";
import { dayKey, formatDate, formatTime, todayKey } from "@/core/datetime";
import { MODE_SHORT, apptCode, patientCode } from "@/core/labels";
import { emptyContent, hasClinicalCore, parseContent, serializeContent, type RecordContent } from "@/core/record-content";
import type { Appointment, MedicalRecord, Prescription, PrescriptionItem } from "@/core/types";
import { AsyncBlock, ConfirmDialog, DetailList, Empty, Field, Notice, PageHead, Panel, PendingBackend, Pill, StatusPill, Tabs, useToast } from "@/ui";
import { PrescriptionView, RecordView } from "../shared/RecordView";
import { useDoctor } from "./DoctorContext";

const blankItem = (): PrescriptionItem => ({ medicineName: "", doseText: "", route: "", frequency: "", durationText: "" });
const itemDone = (i: PrescriptionItem) => Object.values(i).every((v) => v.trim().length > 0);

export function DoctorConsultationPage() {
  const { appointmentId } = useParams();
  const nav = useNavigate();
  const { appointments, loading, reload } = useDoctor();
  const today = todayKey();
  const picks = appointments.filter((a) => a.status === "IN_PROGRESS" || a.status === "CHECKED_IN" || (a.status === "COMPLETED" && dayKey(a.startAt) === today)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const detail = useAsync(() => appointmentId ? getAppointment(appointmentId) : Promise.resolve(null), [appointmentId, appointments]);
  const appt = detail.data;
  const changed = async () => { await reload(); detail.reload(); };

  return (
    <>
      <PageHead title="Khám bệnh & kê đơn" />
      <PendingBackend feature="clinical" />
      {detail.error && <Notice tone="error">{detail.error} <button className="btn" onClick={detail.reload}>Tải lại</button></Notice>}
      {loading || (appointmentId && detail.loading) ? <div className="empty">Đang tải…</div> : !appt ? (
        <Panel title="Chọn ca khám">
          {appointmentId && <Notice tone="error">Không tìm thấy lịch hẹn này trong danh sách của bạn.</Notice>}
          {picks.length === 0 ? <Empty title="Chưa có ca nào cần khám" text="Gọi bệnh nhân từ hàng đợi, hoặc bắt đầu phiên khám từ xa." /> : (
            <div className="tablewrap"><table><thead><tr><th>Giờ</th><th>Mã lịch</th><th>Bệnh nhân</th><th>Hình thức</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>{picks.map((a) => <tr key={a.id}><td><b>{formatTime(a.startAt)}</b></td><td className="mono">{apptCode(a.id)}</td><td className="mono">{patientCode(a.patientId)}</td><td>{MODE_SHORT[a.mode]}</td><td><StatusPill status={a.status} /></td>
                <td><button className="btn sm primary" onClick={() => nav(`/doctor/consultation/${a.id}`)}>Mở</button></td></tr>)}</tbody></table></div>
          )}
        </Panel>
      ) : <Encounter key={appt.id} appt={appt} onChanged={changed} />}
    </>
  );
}

type Tab = "record" | "rx" | "history";
function Encounter({ appt, onChanged }: { appt: Appointment; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const command = useCommand();
  const [tab, setTab] = useState<Tab>("record");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [finish, setFinish] = useState(false);
  const clinical = config.backend.clinical;
  const enc = appt.encounterId ?? undefined;
  const recs = useAsync(() => clinical && enc ? getEncounterRecord(enc) : Promise.resolve(null), [enc, clinical]);
  const rxs = useAsync(() => clinical && enc ? listEncounterPrescriptions(enc) : Promise.resolve([] as Prescription[]), [enc, clinical]);
  const past = useAsync(() => clinical ? listPatientRecords(appt.patientId) : Promise.resolve([] as MedicalRecord[]), [appt.patientId, clinical]);
  const current = recs.data ?? undefined;
  const hasFinal = current?.status === "FINAL";
  const history = (past.data ?? []).filter(r => r.encounterId !== enc && !(past.data ?? []).some(o => o.supersedesId === r.id));
  const inProgress = appt.status === "IN_PROGRESS";

  const start = async () => {
    setBusy(true); setErr("");
    try { await command(`progress:${appt.id}`, {targetStatus:"IN_PROGRESS",version:appt.version}, key => progressAppointment(appt.id, "IN_PROGRESS", appt.version, key)); toast.success("Đã bắt đầu khám."); await onChanged(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const complete = async () => {
    setBusy(true); setErr("");
    try { await command(`progress:${appt.id}`, {targetStatus:"COMPLETED",version:appt.version}, key => progressAppointment(appt.id, "COMPLETED", appt.version, key)); toast.success("Đã hoàn tất ca khám."); setFinish(false); await onChanged(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <Panel>
        <DetailList rows={[["Lịch hẹn", <span className="mono">{apptCode(appt.id)}</span>], ["Bệnh nhân", <span className="mono">{patientCode(appt.patientId)}</span>], ["Giờ hẹn", `${formatDate(appt.startAt)} ${formatTime(appt.startAt)}`], ["Hình thức", MODE_SHORT[appt.mode]], ["Trạng thái", <StatusPill status={appt.status} />]]} />
        {err && <div style={{ marginTop: 12 }}><Notice tone="error">{err}</Notice></div>}
        <div className="row" style={{ marginTop: 14 }}>
          {appt.mode === "IN_PERSON" && appt.status === "CHECKED_IN" && <button className="btn primary" disabled={busy || !config.backend.progress} onClick={() => void start()}>Bắt đầu khám</button>}
          {appt.mode === "REMOTE" && appt.status === "CONFIRMED" && <Link className="btn primary" to={`/doctor/telehealth/${appt.id}`}>Vào phòng khám từ xa</Link>}
          {appt.mode === "REMOTE" && inProgress && <Link className="btn" to={`/doctor/telehealth/${appt.id}`}>Phòng khám từ xa</Link>}
          {inProgress && <button className="btn primary" disabled={!hasFinal || busy || !config.backend.progress} title={hasFinal ? "" : "Cần hoàn tất hồ sơ (FINAL) trước"} onClick={() => setFinish(true)}><CheckCircle2 size={15} aria-hidden /> Hoàn tất ca khám</button>}
          {inProgress && !hasFinal && <span className="muted">Cần hồ sơ ở trạng thái FINAL{appt.mode === "REMOTE" ? " và phiên khám từ xa đã kết thúc" : ""} để hoàn tất ca khám.</span>}
        </div>
      </Panel>

      {!enc ? <Panel><Empty title="Chưa có phiên khám" text="Hồ sơ chỉ mở sau khi bắt đầu khám." /></Panel> : (
        <>
          <Tabs<Tab> label="Mục hồ sơ" value={tab} onChange={setTab} items={[{ id: "record", label: "Bệnh án" }, { id: "rx", label: "Đơn thuốc" }, { id: "history", label: `Lịch sử (${history.length})` }]} />
          <AsyncBlock loading={clinical && (recs.loading || rxs.loading)} error={recs.error || rxs.error || (tab === "history" ? past.error : "")} onRetry={() => { recs.reload(); rxs.reload(); past.reload(); }}>
            <div hidden={tab !== "record"}><RecordPanel encId={enc} current={current} editable={inProgress || appt.status === "COMPLETED"} onSaved={() => { recs.reload(); past.reload(); }} /></div>
            <div hidden={tab !== "rx"}><RxPanel encId={enc} list={rxs.data ?? []} editable={inProgress} onSaved={rxs.reload} /></div>
            {tab === "history" && (history.length === 0 ? <Panel><Empty title="Chưa có bệnh án trước đó" /></Panel> : history.map((r) => (
              <Panel key={r.id} title={`Bệnh án v${r.version}`} subtitle={r.createdAt ? formatDate(r.createdAt) : undefined}><RecordView record={r} /></Panel>
            )))}
          </AsyncBlock>
        </>
      )}
      {finish && <ConfirmDialog title="Hoàn tất ca khám?" confirmLabel="Hoàn tất" busy={busy} error={err} message="Ca khám chuyển sang “Hoàn tất” và không thể mở lại." onCancel={() => setFinish(false)} onConfirm={() => void complete()} />}
    </>
  );
}

function RecordPanel({ encId, current, editable, onSaved }: { encId: string; current?: MedicalRecord; editable: boolean; onSaved: () => void }) {
  const toast = useToast();
  const command = useCommand();
  const [c, setC] = useState<RecordContent>(() => (current ? parseContent(current.content) : emptyContent()));
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [amend, setAmend] = useState(false); const [reason, setReason] = useState("");
  useEffect(() => { setC(current ? parseContent(current.content) : emptyContent()); }, [current?.id, current?.version]);
  const final = current?.status === "FINAL";
  const ro = !editable || (final && !amend);
  const set = (k: keyof Omit<RecordContent, "v" | "vitals">, v: string) => setC((p) => ({ ...p, [k]: v }));
  const vit = (k: keyof RecordContent["vitals"], v: string) => setC((p) => ({ ...p, vitals: { ...p.vitals, [k]: v } }));

  const save = async (status: "DRAFT" | "FINAL") => {
    setErr("");
    if (status === "FINAL" && !hasClinicalCore(c)) return setErr("Cần có chẩn đoán và hướng điều trị trước khi hoàn tất hồ sơ.");
    if (status === "DRAFT" && !(c.symptoms || c.diagnosis || c.plan || c.notes).trim()) return setErr("Hồ sơ đang trống.");
    setBusy(true);
    try { await command(`record:${encId}`, {version:current?.version ?? 0,content:serializeContent(c),status}, key => saveRecord(encId, { version: current?.version ?? 0, content: serializeContent(c), status }, key)); toast.success(status === "FINAL" ? "Đã hoàn tất hồ sơ." : "Đã lưu nháp."); onSaved(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const doAmend = async () => {
    setErr("");
    if (!current) return;
    if (!reason.trim()) return setErr("Cần nêu lý do chỉnh sửa.");
    if (!hasClinicalCore(c)) return setErr("Cần có chẩn đoán và hướng điều trị.");
    setBusy(true);
    try { await command(`amend:${current.id}`, {content:serializeContent(c),reason:reason.trim(),version:current.version}, key => amendRecord(current.id, { content: serializeContent(c), reason: reason.trim(), version: current.version }, key)); toast.success("Đã lưu bản chỉnh sửa; bản gốc được giữ nguyên."); setAmend(false); setReason(""); onSaved(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Panel title="Bệnh án" actions={current && <Pill tone={final ? "ok" : "wait"}>{final ? "Đã hoàn tất" : "Bản nháp"} · v{current.version}</Pill>}>
      {err && <Notice tone="error">{err}</Notice>}
      {final && !amend && editable && <Notice tone="info">Hồ sơ đã hoàn tất, không sửa trực tiếp. Dùng “Chỉnh sửa bổ sung” để tạo bản mới kèm lý do; bản gốc được giữ lại.</Notice>}
      <div className="formgrid">
        <Field label="Triệu chứng" className="span2">{(id) => <textarea id={id} className="field" rows={3} disabled={ro} value={c.symptoms} onChange={(e) => set("symptoms", e.target.value)} />}</Field>
        <Field label="Huyết áp (mmHg)">{(id) => <input id={id} className="field" disabled={ro} value={c.vitals.bloodPressure} onChange={(e) => vit("bloodPressure", e.target.value)} />}</Field>
        <Field label="Nhịp tim (lần/phút)">{(id) => <input id={id} className="field" disabled={ro} inputMode="numeric" value={c.vitals.heartRate} onChange={(e) => vit("heartRate", e.target.value)} />}</Field>
        <Field label="Nhiệt độ (°C)">{(id) => <input id={id} className="field" disabled={ro} inputMode="decimal" value={c.vitals.temperature} onChange={(e) => vit("temperature", e.target.value)} />}</Field>
        <Field label="Cân nặng (kg)">{(id) => <input id={id} className="field" disabled={ro} inputMode="decimal" value={c.vitals.weight} onChange={(e) => vit("weight", e.target.value)} />}</Field>
        <Field label="Chiều cao (cm)">{(id) => <input id={id} className="field" disabled={ro} inputMode="decimal" value={c.vitals.height} onChange={(e) => vit("height", e.target.value)} />}</Field>
        <Field label="Chẩn đoán" required className="span2">{(id) => <textarea id={id} className="field" rows={2} disabled={ro} value={c.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />}</Field>
        <Field label="Hướng điều trị / lời dặn" required className="span2">{(id) => <textarea id={id} className="field" rows={3} disabled={ro} value={c.plan} onChange={(e) => set("plan", e.target.value)} />}</Field>
        <Field label="Ghi chú" className="span2">{(id) => <textarea id={id} className="field" rows={2} disabled={ro} value={c.notes} onChange={(e) => set("notes", e.target.value)} />}</Field>
      </div>
      {amend && <div style={{ marginTop: 12 }}><Field label="Lý do chỉnh sửa" required>{(id) => <textarea id={id} className="field" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field></div>}
      {editable && (
        <div className="row" style={{ marginTop: 14 }}>
          {!final && <><button className="btn" disabled={busy || !config.backend.clinical} onClick={() => void save("DRAFT")}><Save size={15} aria-hidden /> Lưu nháp</button>
            <button className="btn primary" disabled={busy || !config.backend.clinical} onClick={() => void save("FINAL")}><CheckCircle2 size={15} aria-hidden /> Hoàn tất hồ sơ</button></>}
          {final && !amend && <button className="btn" disabled={!config.backend.clinical} onClick={() => setAmend(true)}>Chỉnh sửa bổ sung</button>}
          {amend && <><button className="btn" onClick={() => { setAmend(false); setC(parseContent(current?.content)); }}>Hủy</button><button className="btn primary" disabled={busy} onClick={() => void doAmend()}>Lưu bản bổ sung</button></>}
        </div>
      )}
    </Panel>
  );
}

function RxPanel({ encId, list, editable, onSaved }: { encId: string; list: Prescription[]; editable: boolean; onSaved: () => void }) {
  const toast = useToast();
  const command = useCommand();
  const issueRetry = useRef<{rx:Prescription; fingerprint:string} | null>(null);
  const issued = list.filter((r) => r.status === "ISSUED");
  const [savedDraft, setSavedDraft] = useState<Prescription>();
  const draft = savedDraft ?? list.find((r) => r.status === "DRAFT");
  useEffect(() => {
    const incoming = list.find(r => r.status === "DRAFT");
    setSavedDraft(current => {
      if (issueRetry.current) return current;
      if (current && list.some(r => r.id === current.id && r.status === "ISSUED")) return undefined;
      if (incoming && (!current || incoming.version >= current.version)) return incoming;
      return current;
    });
  }, [list]);
  const [items, setItems] = useState<PrescriptionItem[]>(() => draft?.items?.length ? draft.items : [blankItem()]);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(draft?.items?.length ? draft.items : [blankItem()]); }, [draft?.id, draft?.version]);
  const upd = (i: number, k: keyof PrescriptionItem, v: string) => setItems((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const run = async (issue: boolean) => {
    setErr("");
    const done = items.filter(itemDone);
    if (items.some((i) => Object.values(i).some((v) => v.trim()) && !itemDone(i))) return setErr("Mỗi thuốc phải điền đủ 5 trường hoặc xóa dòng đó.");
    if (done.length === 0) return setErr("Cần ít nhất một thuốc đầy đủ thông tin.");
    setBusy(true);
    try {
      const clean = done.map(i => ({medicineName:i.medicineName.trim(),doseText:i.doseText.trim(),route:i.route.trim(),frequency:i.frequency.trim(),durationText:i.durationText.trim()}));
      const fingerprint = JSON.stringify(clean);
      if (issueRetry.current && (!issue || fingerprint !== issueRetry.current.fingerprint)) throw new Error("Đơn đang chờ xác nhận phát hành. Hãy thử phát hành lại cùng nội dung hoặc tải lại dữ liệu.");
      const rx = issueRetry.current?.rx ?? (draft
        ? await command(`rx:${draft.id}`, {version:draft.version,items:clean}, key => updatePrescription(draft.id, draft.version, clean, key))
        : await command(`rx-create:${encId}`, {items:clean}, key => createPrescription(encId, clean, key)));
      setSavedDraft(rx);
      if (issue) {
        issueRetry.current = {rx,fingerprint};
        await command(`rx-issue:${rx.id}`, {version:rx.version}, key => issuePrescription(rx.id, rx.version, key));
        issueRetry.current = null;
        setSavedDraft(undefined);
        toast.success("Đã phát hành đơn thuốc.");
      } else toast.success("Đã lưu nháp đơn thuốc.");
      onSaved();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  const issuedViews = issued.map(rx => <Panel key={rx.id} title="Đơn đã phát hành"><PrescriptionView rx={rx}/></Panel>);
  if (!editable) return <>{issuedViews}{issued.length === 0 && <Panel title="Đơn thuốc"><Empty title="Chưa có đơn thuốc" /></Panel>}</>;
  return (
    <>{issuedViews}<Panel title="Kê đơn thuốc" actions={draft && <Pill tone="wait">Bản nháp</Pill>}>
      {err && <Notice tone="error">{err} <button className="btn" onClick={() => { issueRetry.current = null; onSaved(); }}>Tải lại dữ liệu</button></Notice>}
      {items.map((it, i) => (
        <fieldset key={i} className="rx-edit" style={{ border: "1px solid var(--line, #e5e7eb)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <legend>Thuốc {i + 1}</legend>
          <div className="formgrid">
            <Field label="Tên thuốc" required>{(id) => <input id={id} className="field" maxLength={120} value={it.medicineName} onChange={(e) => upd(i, "medicineName", e.target.value)} />}</Field>
            <Field label="Liều dùng" required>{(id) => <input id={id} className="field" maxLength={120} value={it.doseText} onChange={(e) => upd(i, "doseText", e.target.value)} />}</Field>
            <Field label="Đường dùng" required>{(id) => <input id={id} className="field" maxLength={60} value={it.route} onChange={(e) => upd(i, "route", e.target.value)} />}</Field>
            <Field label="Tần suất" required>{(id) => <input id={id} className="field" maxLength={120} value={it.frequency} onChange={(e) => upd(i, "frequency", e.target.value)} />}</Field>
            <Field label="Thời gian dùng" required>{(id) => <input id={id} className="field" maxLength={120} value={it.durationText} onChange={(e) => upd(i, "durationText", e.target.value)} />}</Field>
          </div>
          {items.length > 1 && <button type="button" className="btn sm danger" style={{ marginTop: 8 }} onClick={() => setItems((p) => p.filter((_, j) => j !== i))}><Trash2 size={14} aria-hidden /> Xóa dòng</button>}
        </fieldset>
      ))}
      <div className="row">
        <button className="btn" onClick={() => setItems((p) => [...p, blankItem()])}><Plus size={15} aria-hidden /> Thêm thuốc</button>
        <button className="btn" disabled={busy || !config.backend.clinical} onClick={() => void run(false)}><Save size={15} aria-hidden /> Lưu nháp</button>
        <button className="btn primary" disabled={busy || !config.backend.clinical} onClick={() => void run(true)}>Phát hành đơn</button>
      </div>
    </Panel></>
  );
}
