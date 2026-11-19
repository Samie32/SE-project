import { useCallback, useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { createSpecialty, listSpecialties, updateSpecialty } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import type { Specialty } from "@/core/types";
import { useAsync } from "@/core/useAsync";
import { AsyncBlock, Field, Modal, Notice, PageHead, Panel, Pill, SearchBox, useToast } from "@/ui";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "NO_DOCTOR";

export function SpecialtiesPage() {
  const dir = useDirectory();
  const loadAll = useCallback(() => listSpecialties(true), []);
  const specs = useAsync(loadAll);
  const toast = useToast();

  const [text, setText] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [editing, setEditing] = useState<Specialty | "new" | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const list = specs.data ?? [];
  const rows = list.filter(s => {
    const matchesText = s.name.toLowerCase().includes(text.trim().toLowerCase());
    if (!matchesText) return false;
    if (filter === "ACTIVE") return s.active;
    if (filter === "INACTIVE") return !s.active;
    if (filter === "NO_DOCTOR") return dir.doctors.filter(d => d.specialtyIds.includes(s.id)).length === 0;
    return true;
  });

  function openModal(target: Specialty | "new") {
    setEditing(target);
    setErr("");
    if (target === "new") {
      setName("");
      setActive(true);
    } else {
      setName(target.name);
      setActive(target.active);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setErr("Vui lòng nhập tên chuyên khoa.");
    if (trimmed.length > 255) return setErr("Tên tối đa 255 ký tự.");
    const duplicate = list.some(
      s => s.name.toLowerCase() === trimmed.toLowerCase() && (editing === "new" || s.id !== editing?.id),
    );
    if (duplicate) return setErr("Chuyên khoa này đã tồn tại.");

    setBusy(true);
    setErr("");
    try {
      if (editing === "new") {
        await createSpecialty(trimmed);
        toast.success("Đã thêm chuyên khoa.");
      } else if (editing) {
        await updateSpecialty(editing.id, { name: trimmed, active });
        toast.success("Đã cập nhật chuyên khoa.");
      }
      setEditing(null);
      specs.reload();
      dir.reload();
    } catch (failure) {
      setErr(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const loading = specs.loading || dir.loading;
  const loadError = specs.error || dir.error;
  const emptyTitle = list.length === 0 ? "Chưa có chuyên khoa" : "Không tìm thấy chuyên khoa phù hợp";

  return (
    <>
      <PageHead title="Chuyên khoa" />

      <Panel>
        <div className="filters">
          <SearchBox label="Tìm chuyên khoa" placeholder="Tên chuyên khoa…" value={text} onChange={setText} />
          <select
            className="field"
            aria-label="Lọc trạng thái chuyên khoa"
            value={filter}
            onChange={event => setFilter(event.target.value as StatusFilter)}
          >
            <option value="ALL">Tất cả ({list.length})</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="NO_DOCTOR">Chưa có bác sĩ</option>
          </select>
          {(text || filter !== "ALL") && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setText("");
                setFilter("ALL");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            aria-label="Thêm chuyên khoa"
            title="Thêm chuyên khoa"
            onClick={() => openModal("new")}
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>

        <AsyncBlock
          loading={loading}
          error={loadError}
          onRetry={() => {
            specs.reload();
            dir.reload();
          }}
          empty={rows.length === 0}
          emptyTitle={emptyTitle}
        >
          <div className="tablewrap table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tên chuyên khoa</th>
                  <th>Bác sĩ phụ trách</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const docs = dir.doctors.filter(d => d.specialtyIds.includes(s.id));
                  const activeDocs = docs.filter(d => d.active).length;
                  return (
                    <tr key={s.id}>
                      <td>
                        <b>{s.name}</b>
                      </td>
                      <td>
                        {docs.length === 0 ? (
                          <Pill tone="wait">Chưa có bác sĩ</Pill>
                        ) : (
                          <div>
                            <span>{docs.map(d => d.displayName).join(", ")}</span>
                            <div className="muted">
                              {activeDocs}/{docs.length} bác sĩ đang nhận lịch
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <Pill tone={s.active ? "ok" : ""}>{s.active ? "Hoạt động" : "Ngừng"}</Pill>
                      </td>
                      <td>
                        <button type="button" className="btn sm" onClick={() => openModal(s)}>
                          <Pencil size={14} aria-hidden /> Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
      </Panel>

      {editing && (
        <Modal
          title={editing === "new" ? "Thêm chuyên khoa" : "Cập nhật chuyên khoa"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button type="submit" form="specialty-form" className="btn primary" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          }
        >
          <form id="specialty-form" onSubmit={event => void submit(event)} noValidate>
            {err && <Notice tone="error">{err}</Notice>}
            <Field label="Tên chuyên khoa" required>
              {id => (
                <input
                  id={id}
                  className="field"
                  maxLength={255}
                  value={name}
                  onChange={event => {
                    setName(event.target.value);
                    setErr("");
                  }}
                />
              )}
            </Field>
            {editing !== "new" && (
              <label className="clinic-switch" style={{ marginTop: 14 }}>
                <input
                  type="checkbox"
                  className="clinic-switch-input"
                  checked={active}
                  onChange={event => setActive(event.target.checked)}
                />
                <span className="clinic-switch-track" aria-hidden="true" />
                <span className="clinic-switch-text">{active ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
              </label>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
