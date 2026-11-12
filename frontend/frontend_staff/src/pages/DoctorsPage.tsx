import { useMemo, useState } from "react";
import { createDoctor, listAvailability, listDoctors, listTimeOff, updateDoctor } from "@/api/doctorApi";
import { listSpecialties } from "@/api/specialtyApi";
import { errorMessage } from "@/api/client";
import { PermissionGate } from "@/auth/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/components/Toast";
import {
  AsyncBlock,
  ConfirmDialog,
  DetailList,
  Field,
  Metric,
  Modal,
  PageHead,
  Panel,
  Pill,
} from "@/components/ui";
import { formatDateTime } from "@/utils/datetime";
import { MODE_LABEL, UUID_RE, initials, shortId } from "@/utils/labels";
import type { Doctor, Specialty } from "@/types";

type Dialog =
  | { kind: "create" }
  | { kind: "view"; doctor: Doctor }
  | { kind: "edit"; doctor: Doctor }
  | { kind: "toggle"; doctor: Doctor };

export function DoctorsPage() {
  const doctors = useAsync(listDoctors, []);
  const specialties = useAsync(listSpecialties, []);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const specName = (id: string) =>
    specialties.data?.find((s) => s.id === id)?.name ?? "Chuyên khoa không còn hoạt động";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (doctors.data ?? []).filter(
      (d) =>
        (!q || d.displayName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)) &&
        (!spec || d.specialtyIds.includes(spec)) &&
        (!status || (status === "active" ? d.active : !d.active)),
    );
  }, [doctors.data, search, spec, status]);

  const total = doctors.data?.length ?? 0;
  const active = doctors.data?.filter((d) => d.active).length ?? 0;
  const close = () => setDialog(null);
  const refresh = () => {
    close();
    doctors.reload();
  };

  return (
    <>
      <PageHead
        eyebrow="QUẢN TRỊ / DANH MỤC"
        title="Danh mục bác sĩ"
        actions={
          <PermissionGate permission="doctors.manage">
            <button
              className="btn primary"
              disabled={!specialties.data?.length}
              title={!specialties.data?.length ? "Cần có ít nhất một chuyên khoa" : undefined}
              onClick={() => setDialog({ kind: "create" })}
            >
              ＋ Thêm bác sĩ
            </button>
          </PermissionGate>
        }
      />
      <div className="metrics">
        <Metric label="Tổng bác sĩ" icon="♙" value={doctors.loading ? "…" : total} hint="Theo danh mục hệ thống" />
        <Metric label="Đang nhận lịch" icon="✓" value={doctors.loading ? "…" : active} hint={total ? `${Math.round((active / total) * 100)}% tổng số bác sĩ` : undefined} />
        <Metric label="Tạm ngưng" icon="◷" tone="amber" value={doctors.loading ? "…" : total - active} hint="Không nhận lịch mới" />
        <Metric label="Chuyên khoa" icon="◈" value={specialties.loading ? "…" : (specialties.data?.length ?? "—")} hint="Đang hoạt động" />
      </div>

      <Panel>
        <div className="filters">
          <input
            className="field grow"
            placeholder="Tìm theo tên hoặc mã bác sĩ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm bác sĩ"
          />
          <select className="field" value={spec} onChange={(e) => setSpec(e.target.value)} aria-label="Lọc chuyên khoa">
            <option value="">Tất cả chuyên khoa</option>
            {(specialties.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="paused">Tạm ngưng</option>
          </select>
          <button className="btn" onClick={doctors.reload}>
            ↻ Làm mới
          </button>
        </div>
        <AsyncBlock
          loading={doctors.loading}
          error={doctors.error}
          onRetry={doctors.reload}
          empty={filtered.length === 0}
          emptyText={total === 0 ? "Chưa có bác sĩ nào trong danh mục." : "Không có bác sĩ khớp bộ lọc."}
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Bác sĩ</th>
                  <th>Chuyên khoa</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="person">
                        <div className="miniavatar">{initials(d.displayName)}</div>
                        <div>
                          <b>{d.displayName}</b>
                          <small>{shortId(d.id)}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 5 }}>
                        {d.specialtyIds.map((id) => (
                          <Pill key={id} tone="bluepill">
                            {specName(id)}
                          </Pill>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Pill tone={d.active ? "ok" : "wait"}>{d.active ? "Đang hoạt động" : "Tạm ngưng"}</Pill>
                    </td>
                    <td>
                      <div className="row">
                        <button className="btn" onClick={() => setDialog({ kind: "view", doctor: d })}>
                          Xem
                        </button>
                        <PermissionGate permission="doctors.manage">
                          <button className="btn soft" onClick={() => setDialog({ kind: "edit", doctor: d })}>
                            Sửa
                          </button>
                          <button
                            className={"btn " + (d.active ? "danger" : "")}
                            onClick={() => setDialog({ kind: "toggle", doctor: d })}
                          >
                            {d.active ? "Ngưng nhận lịch" : "Kích hoạt"}
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
        <div className="muted" style={{ marginTop: 10 }}>
          Backend chưa có API xóa bác sĩ; dùng “Ngưng nhận lịch” để vô hiệu hóa.
        </div>
      </Panel>

      {dialog?.kind === "create" && (
        <DoctorForm mode="create" specialties={specialties.data ?? []} onClose={close} onSaved={refresh} />
      )}
      {dialog?.kind === "edit" && (
        <DoctorForm
          mode="edit"
          doctor={dialog.doctor}
          specialties={specialties.data ?? []}
          onClose={close}
          onSaved={refresh}
        />
      )}
      {dialog?.kind === "toggle" && <ToggleDialog doctor={dialog.doctor} onClose={close} onSaved={refresh} />}
      {dialog?.kind === "view" && <DoctorDetail doctor={dialog.doctor} specName={specName} onClose={close} />}
    </>
  );
}

function SpecialtyChecks({
  specialties,
  value,
  onChange,
}: {
  specialties: Specialty[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="checkgrid">
      {specialties.map((s) => (
        <label key={s.id} className="chk">
          <input
            type="checkbox"
            checked={value.includes(s.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, s.id] : value.filter((x) => x !== s.id))}
          />{" "}
          {s.name}
        </label>
      ))}
    </div>
  );
}

function DoctorForm({
  mode,
  doctor,
  specialties,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  doctor?: Doctor;
  specialties: Specialty[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [userId, setUserId] = useState("");
  const [name, setName] = useState(doctor?.displayName ?? "");
  const [active, setActive] = useState(doctor?.active ?? true);
  const [ids, setIds] = useState<string[]>(doctor?.specialtyIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "create") {
      if (!UUID_RE.test(userId.trim())) e.userId = "Nhập đúng mã tài khoản (UUID).";
    } else {
      const n = name.trim();
      if (!n) e.name = "Tên hiển thị là bắt buộc.";
      else if (n.length > 255) e.name = "Tên tối đa 255 ký tự.";
    }
    if (ids.length === 0) e.specs = "Chọn ít nhất một chuyên khoa.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setApiError("");
    try {
      if (mode === "create") {
        await createDoctor(userId.trim(), ids);
        toast.success("Đã thêm bác sĩ.");
      } else if (doctor) {
        await updateDoctor(doctor.id, { active, displayName: name.trim(), specialtyIds: ids });
        toast.success("Đã cập nhật thông tin bác sĩ.");
      }
      onSaved();
    } catch (e) {
      setApiError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={mode === "create" ? "Thêm bác sĩ" : "Chỉnh sửa bác sĩ"}
      description={
        mode === "create"
          ? "Tạo hồ sơ bác sĩ từ một tài khoản đã đăng nhập hệ thống. Tên hiển thị lấy từ tài khoản đó."
          : undefined
      }
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </button>
        </>
      }
    >
      <div className="formgrid" style={{ gridTemplateColumns: "1fr" }}>
        {mode === "create" ? (
          <Field
            label="Mã tài khoản người dùng (UUID) *"
            error={errors.userId}
            hint="Người dùng cần đăng nhập ít nhất một lần; xem mã tại trang “Phân quyền → Tài khoản của bạn” hoặc từ quản trị CSDL (backend chưa có API danh sách người dùng)."
          >
            <input
              className="field"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
        ) : (
          <>
            <Field label="Tên hiển thị *" error={errors.name}>
              <input className="field" value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
            </Field>
            <label className="chk">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Đang nhận lịch
            </label>
          </>
        )}
        <Field label="Chuyên khoa *" error={errors.specs}>
          <SpecialtyChecks specialties={specialties} value={ids} onChange={setIds} />
        </Field>
      </div>
      {apiError && (
        <div className="notice errbox" role="alert">
          {apiError}
        </div>
      )}
    </Modal>
  );
}

function ToggleDialog({
  doctor,
  onClose,
  onSaved,
}: {
  doctor: Doctor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const next = !doctor.active;
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await updateDoctor(doctor.id, {
        active: next,
        displayName: doctor.displayName,
        specialtyIds: doctor.specialtyIds,
      });
      toast.success(next ? "Đã kích hoạt bác sĩ." : "Đã ngưng nhận lịch cho bác sĩ.");
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog
      title={next ? "Kích hoạt bác sĩ?" : "Ngưng nhận lịch?"}
      message={
        next
          ? `${doctor.displayName} sẽ xuất hiện lại khi bệnh nhân đặt lịch.`
          : `${doctor.displayName} sẽ không còn khung giờ mới cho bệnh nhân. Backend sẽ từ chối nếu bác sĩ còn lịch hẹn hiệu lực.`
      }
      danger={!next}
      confirmLabel={next ? "Kích hoạt" : "Ngưng nhận lịch"}
      busy={busy}
      error={error}
      onConfirm={run}
      onCancel={onClose}
    />
  );
}

function DoctorDetail({
  doctor,
  specName,
  onClose,
}: {
  doctor: Doctor;
  specName: (id: string) => string;
  onClose: () => void;
}) {
  const av = useAsync(() => listAvailability(doctor.id), [doctor.id]);
  const off = useAsync(() => listTimeOff(doctor.id), [doctor.id]);
  return (
    <Modal wide title="Chi tiết bác sĩ" onClose={onClose} footer={<button className="btn" onClick={onClose}>Đóng</button>}>
      <DetailList
        rows={[
          ["Tên hiển thị", doctor.displayName],
          ["Mã bác sĩ", <code key="i">{doctor.id}</code>],
          ["Chuyên khoa", doctor.specialtyIds.map(specName).join(", ")],
          ["Trạng thái", doctor.active ? "Đang hoạt động" : "Tạm ngưng"],
        ]}
      />
      <h3 className="sub-h">Khoảng làm việc</h3>
      <AsyncBlock loading={av.loading} error={av.error} onRetry={av.reload} empty={(av.data?.length ?? 0) === 0} emptyText="Chưa có khoảng làm việc.">
        <div className="tablewrap" style={{ maxHeight: 180 }}>
          <table>
            <tbody>
              {(av.data ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.startAt)}</td>
                  <td>→ {formatDateTime(a.endAt)}</td>
                  <td>{a.slotMinutes} phút/khung</td>
                  <td>{MODE_LABEL[a.mode] ?? a.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncBlock>
      <h3 className="sub-h">Lịch nghỉ</h3>
      <AsyncBlock loading={off.loading} error={off.error} onRetry={off.reload} empty={(off.data?.length ?? 0) === 0} emptyText="Không có lịch nghỉ.">
        <div className="tablewrap" style={{ maxHeight: 140 }}>
          <table>
            <tbody>
              {(off.data ?? []).map((t) => (
                <tr key={t.id}>
                  <td>{formatDateTime(t.startAt)}</td>
                  <td>→ {formatDateTime(t.endAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncBlock>
    </Modal>
  );
}
