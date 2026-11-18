import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createDoctor, createStaff, listAccounts, setUserRoles, updateDoctor, updateStaff, type AccountSummary } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { ROLE_LABEL } from "@/core/labels";
import { useSession } from "@/core/session";
import { ALL_ROLES, type Doctor, type Role } from "@/core/types";
import { AsyncBlock, Field, Modal, Notice, PageHead, Panel, Pill, SearchBox, useToast } from "@/ui";

const STAFF_ROLES = ALL_ROLES.filter(role => role !== "PATIENT");
const PAGE_SIZE = 20;

type Edit = { kind: "add" } | { kind: "edit"; account: AccountSummary };

function initialRoleFilter() {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get("role") ?? "";
  return value === "UNASSIGNED" || STAFF_ROLES.some(item => item === value) ? value : "";
}

export function PermissionsPage() {
  const { identity } = useSession();
  const directory = useDirectory();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(initialRoleFilter);
  const [active, setActive] = useState("");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; rows: AccountSummary[]; error: string }>();
  const [edit, setEdit] = useState<Edit | null>(null);
  const requestKey = JSON.stringify([query, role, active, offset, revision]);
  const current = result?.key === requestKey ? result : undefined;
  const doctors = directory.doctors ?? [];

  useEffect(() => {
    let disposed = false;
    const timer = window.setTimeout(async () => {
      try {
        const rows = await listAccounts(query.trim(), offset, PAGE_SIZE + 1, role, active);
        if (!disposed) {
          if (rows.length === 0 && offset > 0) setOffset(Math.max(0, offset - PAGE_SIZE));
          else setResult({ key: requestKey, rows, error: "" });
        }
      } catch (cause) {
        if (!disposed) setResult({ key: requestKey, rows: [], error: errorMessage(cause) });
      }
    }, query ? 250 : 0);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [active, offset, query, requestKey, role]);

  const reload = () => setRevision(value => value + 1);
  const rows = current?.rows.slice(0, PAGE_SIZE) ?? [];

  return <>
    <PageHead title="Nhân sự & bác sĩ" />
    <Panel>
      <div className="filters">
        <SearchBox label="Tìm nhân sự" placeholder="Username hoặc họ tên…" value={query}
          onChange={value => { setQuery(value.slice(0, 255)); setOffset(0); }} />
        <select className="field" aria-label="Lọc theo vai trò" value={role}
          onChange={event => { setRole(event.target.value); setOffset(0); }}>
          <option value="">Mọi vai trò</option>
          <option value="UNASSIGNED">Chờ cấp quyền</option>
          {STAFF_ROLES.map(value => <option key={value} value={value}>{ROLE_LABEL[value]}</option>)}
        </select>
        <select className="field" aria-label="Lọc theo trạng thái" value={active}
          onChange={event => { setActive(event.target.value); setOffset(0); }}>
          <option value="">Mọi trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Vô hiệu hóa</option>
        </select>
        {(query || role || active) && <button className="btn sm" onClick={() => {
          setQuery(""); setRole(""); setActive(""); setOffset(0);
        }}>Xóa bộ lọc</button>}
        <button type="button" className="btn primary" aria-label="Thêm nhân sự" title="Thêm nhân sự"
          onClick={() => setEdit({ kind: "add" })}>
          <Plus size={16} aria-hidden />
        </button>
      </div>
      <AsyncBlock loading={!current} error={current?.error ?? ""} onRetry={reload}
        empty={rows.length === 0} emptyTitle="Không tìm thấy nhân sự">
        <div className="tablewrap table-scroll"><table>
          <thead><tr><th scope="col">Họ tên</th><th scope="col">Username</th><th scope="col">Vai trò</th>
            <th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
          <tbody>{rows.map(account => {
            const roles = account.roles.filter(value => value !== "PATIENT");
            const own = account.id === identity?.id;
            const doctorProfile = account.doctorId ? doctors.find(item => item.id === account.doctorId) : undefined;
            return <tr key={account.id}>
              <td>
                <strong>{account.displayName}</strong>
                {own && <div className="muted">Tài khoản của bạn</div>}
                {doctorProfile && <div className="muted">{directory.doctorSpecialties(doctorProfile.id)}</div>}
              </td>
              <td>{account.username ?? <span className="muted">Chưa đồng bộ</span>}</td>
              <td><div className="chips">{roles.length ? roles.map(value => <Pill key={value}>{ROLE_LABEL[value]}</Pill>) : "Chờ cấp quyền"}</div></td>
              <td>
                <div className="chips">
                  <Pill tone={account.active ? "ok" : ""}>{account.active ? "Đang hoạt động" : "Vô hiệu hóa"}</Pill>
                  {doctorProfile && (
                    <Pill tone={doctorProfile.active ? "info" : "wait"}>
                      {doctorProfile.active ? "Nhận lịch" : "Tạm ngưng"}
                    </Pill>
                  )}
                </div>
              </td>
              <td>
                <button className="btn sm" onClick={() => setEdit({ kind: "edit", account })}>
                  <Pencil size={14} aria-hidden /> Sửa
                </button>
              </td>
            </tr>;
          })}</tbody>
        </table></div>
        {(offset > 0 || (current?.rows.length ?? 0) > PAGE_SIZE) && <div className="staff-pagination row">
          <button className="btn sm" disabled={!offset} onClick={() => setOffset(offset - PAGE_SIZE)}>Trang trước</button>
          <span>Trang {offset / PAGE_SIZE + 1}</span>
          <button className="btn sm" disabled={(current?.rows.length ?? 0) <= PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}>Trang sau</button>
        </div>}
      </AsyncBlock>
    </Panel>
    {edit && <StaffDialog
      edit={edit}
      doctorProfile={edit.kind === "edit" && edit.account.doctorId
        ? doctors.find(item => item.id === edit.account.doctorId)
        : undefined}
      ownId={identity?.id}
      close={() => setEdit(null)}
      saved={() => {
        toast.success(edit.kind === "add" ? "Đã thêm nhân sự." : "Đã cập nhật nhân sự & phân quyền.");
        setEdit(null);
        if (edit.kind === "add") { setQuery(""); setRole(""); setActive(""); setOffset(0); }
        directory.reload();
        reload();
      }}
    />}
  </>;
}

function StaffDialog({ edit, doctorProfile, ownId, close, saved }: {
  edit: Edit; doctorProfile?: Doctor; ownId?: string; close: () => void; saved: () => void;
}) {
  const account = edit.kind === "add" ? null : edit.account;
  const directory = useDirectory();
  const [displayName, setDisplayName] = useState(account?.displayName ?? "");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [specialtyIds, setSpecialtyIds] = useState<string[]>(doctorProfile?.specialtyIds ?? []);
  const [active, setActive] = useState(account?.active ?? true);
  const [doctorActive, setDoctorActive] = useState(doctorProfile?.active ?? false);
  const [roles, setRoles] = useState<Role[]>(account?.roles ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const doctor = roles.includes("DOCTOR");
    const creatingDoctorProfile = edit.kind === "edit" && !doctorProfile && doctor;
    if (edit.kind === "add" && (!roles.length || (doctor && !specialtyIds.length))) {
      setError(roles.length ? "Chọn ít nhất một chuyên khoa." : "Chọn ít nhất một vai trò.");
      return;
    }
    if (edit.kind === "edit" && (doctorProfile || doctor) && !specialtyIds.length) {
      setError("Chọn ít nhất một chuyên khoa cho bác sĩ.");
      return;
    }
    if (creatingDoctorProfile && !active) {
      setError("Cần bật trạng thái Đang hoạt động trước khi cấp vai trò Bác sĩ.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (edit.kind === "add") {
        await createStaff({
          username: username.trim(),
          displayName: displayName.trim(),
          email: email.trim(),
          temporaryPassword,
          roles,
          specialtyIds: doctor ? specialtyIds : [],
        });
      } else {
        const trimmedName = displayName.trim();
        const isOwn = ownId === edit.account.id;
        const prevRoles = [...edit.account.roles].sort().join(",");
        const nextRoles = [...roles].sort().join(",");
        const rolesChanged = !isOwn && prevRoles !== nextRoles;

        // Tắt nhận lịch trước khi vô hiệu hóa tài khoản để không vi phạm ràng buộc backend.
        if (doctorProfile && !doctorActive && !active) {
          await updateDoctor(doctorProfile.id, { active: false, displayName: trimmedName, specialtyIds });
          await updateStaff(edit.account.id, { displayName: trimmedName, active: false });
          if (rolesChanged) await setUserRoles(edit.account.id, roles);
        } else {
          if (trimmedName !== edit.account.displayName || active !== edit.account.active) {
            await updateStaff(edit.account.id, { displayName: trimmedName, active });
          }
          if (creatingDoctorProfile) {
            const created = await createDoctor(edit.account.id, specialtyIds);
            if (rolesChanged) await setUserRoles(edit.account.id, roles);
            if (doctorActive) {
              await updateDoctor(created.id, { active: true, displayName: trimmedName, specialtyIds });
            }
          } else {
            if (rolesChanged) {
              await setUserRoles(edit.account.id, roles);
            }
            if (doctorProfile) {
              const prevSpecs = [...doctorProfile.specialtyIds].sort().join(",");
              const nextSpecs = [...specialtyIds].sort().join(",");
              if (doctorActive !== doctorProfile.active || trimmedName !== doctorProfile.displayName || prevSpecs !== nextSpecs) {
                await updateDoctor(doctorProfile.id, { active: doctorActive, displayName: trimmedName, specialtyIds });
              }
            }
          }
        }
      }
      saved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const isOwn = edit.kind === "edit" && ownId === edit.account.id;
  const showSpecialties = roles.includes("DOCTOR") || (edit.kind === "edit" && !!doctorProfile);

  return <Modal title={edit.kind === "add" ? "Thêm nhân sự" : "Cập nhật nhân sự"} onClose={() => { if (!busy) close(); }} footer={<>
    <button className="btn" onClick={close} disabled={busy}>Hủy</button>
    <button className="btn primary" form="staff-editor" type="submit" disabled={busy}>Lưu</button>
  </>}>
    <form id="staff-editor" onSubmit={event => void submit(event)} className="staff-editor">
      {error && <Notice tone="error">{error}</Notice>}
      {edit.kind === "add" && <>
        <Field label="Username" required>{id => <input id={id} className="field" required minLength={3} maxLength={64}
          pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,63}" autoComplete="off"
          value={username} onChange={event => setUsername(event.target.value)} />}</Field>
        <Field label="Email" required>{id => <input id={id} className="field" type="email"
          required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />}</Field>
      </>}
      <Field label="Họ tên" required>{id => <input id={id} className="field"
        required maxLength={edit.kind === "add" ? 120 : 255} value={displayName} onChange={event => setDisplayName(event.target.value)} />}</Field>
      {edit.kind === "add" && <Field label="Mật khẩu tạm thời" required
        hint="Ít nhất 12 ký tự. Nhân sự phải đổi mật khẩu khi đăng nhập lần đầu.">{id => (
          <input id={id} className="field" type="password" autoComplete="new-password" required
            minLength={12} maxLength={128} value={temporaryPassword} onChange={event => setTemporaryPassword(event.target.value)} />
        )}</Field>}
      {edit.kind === "edit" && <>
        <Field label="Trạng thái tài khoản">{id => <select id={id} className="field" disabled={isOwn}
          value={String(active)} onChange={event => setActive(event.target.value === "true")}>
          <option value="true">Đang hoạt động</option><option value="false">Vô hiệu hóa</option>
        </select>}</Field>
        {!active && <Notice>Nhân sự sẽ mất quyền truy cập ClinicCare sau khi lưu.</Notice>}
      </>}
      {(edit.kind === "add" || !isOwn) && <>
        <fieldset className="account-picker">
          <legend className="lbl">Vai trò nhân sự</legend>
          <div className="chips">{STAFF_ROLES.map(role => <label key={role} className="check">
            <input type="checkbox" checked={roles.includes(role)}
              disabled={busy || (edit.kind === "edit" && role === "DOCTOR" && !account?.doctorId && !active)}
              onChange={() => setRoles(previous => previous.includes(role) ? previous.filter(value => value !== role) : [...previous, role])} />
            {ROLE_LABEL[role]}
          </label>)}</div>
        </fieldset>
        {edit.kind === "edit" && !account?.doctorId && !active && (
          <Notice>Cần bật trạng thái Đang hoạt động trước khi tạo hồ sơ và cấp vai trò Bác sĩ.</Notice>
        )}
      </>}
      {edit.kind === "edit" && (doctorProfile || roles.includes("DOCTOR")) && (
        <label className="clinic-switch">
          <input type="checkbox" className="clinic-switch-input" checked={doctorActive}
            onChange={event => setDoctorActive(event.target.checked)} />
          <span className="clinic-switch-track" aria-hidden="true" />
          <span className="clinic-switch-text">{doctorActive ? "Đang nhận lịch mới" : "Tạm ngưng nhận lịch"}</span>
        </label>
      )}
      {showSpecialties && <fieldset className="account-picker">
        <legend className="lbl">Chuyên khoa</legend>
        <AsyncBlock loading={directory.loading} error={directory.error} onRetry={directory.reload}
          empty={!directory.specialties.some(item => item.active || specialtyIds.includes(item.id))}
          emptyTitle="Chưa có chuyên khoa đang hoạt động">
          <div className="chips">{directory.specialties
            .filter(item => item.active || specialtyIds.includes(item.id))
            .map(item => (
              <label className="check" key={item.id}><input type="checkbox" checked={specialtyIds.includes(item.id)}
                onChange={() => setSpecialtyIds(previous => previous.includes(item.id)
                  ? previous.filter(id => id !== item.id) : [...previous, item.id])} /> {item.name}</label>
            ))}</div>
        </AsyncBlock>
      </fieldset>}
    </form>
  </Modal>;
}
