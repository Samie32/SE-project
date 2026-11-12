import { useMemo, useState } from "react";
import { createSpecialty, listSpecialties } from "@/api/specialtyApi";
import { listDoctors } from "@/api/doctorApi";
import { errorMessage } from "@/api/client";
import { PermissionGate } from "@/auth/PermissionGate";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/components/Toast";
import { AsyncBlock, Field, Metric, Modal, PageHead, Panel, Pill } from "@/components/ui";
import { shortId } from "@/utils/labels";

export function SpecialtiesPage() {
  const specialties = useAsync(listSpecialties, []);
  const doctors = useAsync(listDoctors, []);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    (doctors.data ?? []).forEach((d) => d.specialtyIds.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return m;
  }, [doctors.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (specialties.data ?? []).filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [specialties.data, search]);

  const total = specialties.data?.length ?? 0;
  const empty = (specialties.data ?? []).filter((s) => !counts.get(s.id)).length;
  const assigned = [...counts.values()].reduce((a, b) => a + b, 0);

  const open = () => {
    setName("");
    setFieldError("");
    setApiError("");
    setBusy(false);
    setCreating(true);
  };

  const submit = async () => {
    const n = name.trim();
    if (!n) return setFieldError("Tên chuyên khoa là bắt buộc.");
    if (n.length > 255) return setFieldError("Tên tối đa 255 ký tự.");
    if ((specialties.data ?? []).some((s) => s.name.toLowerCase() === n.toLowerCase()))
      return setFieldError("Chuyên khoa này đã tồn tại.");
    setFieldError("");
    setBusy(true);
    setApiError("");
    try {
      await createSpecialty(n);
      toast.success("Đã thêm chuyên khoa.");
      setCreating(false);
      specialties.reload();
    } catch (e) {
      setApiError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="QUẢN TRỊ / DANH MỤC"
        title="Danh mục chuyên khoa"
        actions={
          <PermissionGate permission="specialties.manage">
            <button className="btn primary" onClick={open}>
              ＋ Thêm chuyên khoa
            </button>
          </PermissionGate>
        }
      />
      <div className="metrics">
        <Metric label="Tổng chuyên khoa" icon="◈" value={specialties.loading ? "…" : total} hint="Đang hoạt động" />
        <Metric label="Bác sĩ đã gán" icon="♙" value={doctors.loading ? "…" : assigned} hint="Tổng lượt gán theo chuyên khoa" />
        <Metric label="Chưa có bác sĩ" icon="!" tone="amber" value={specialties.loading || doctors.loading ? "…" : empty} hint="Cần bổ sung" />
      </div>
      <Panel>
        <div className="filters">
          <input
            className="field grow"
            placeholder="Tìm chuyên khoa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm chuyên khoa"
          />
          <button className="btn" onClick={() => { specialties.reload(); doctors.reload(); }}>
            ↻ Làm mới
          </button>
        </div>
        <AsyncBlock
          loading={specialties.loading}
          error={specialties.error}
          onRetry={specialties.reload}
          empty={rows.length === 0}
          emptyText={total === 0 ? "Chưa có chuyên khoa nào." : "Không có chuyên khoa khớp từ khóa."}
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Chuyên khoa</th>
                  <th>Số bác sĩ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="audit-code">{shortId(s.id)}</td>
                    <td>
                      <b>{s.name}</b>
                    </td>
                    <td>{doctors.loading ? "…" : (counts.get(s.id) ?? 0)}</td>
                    <td>
                      <Pill tone="ok">Đang hoạt động</Pill>
                    </td>
                    <td>
                      <div className="row">
                        <button className="btn" disabled title="Backend chưa có PUT /api/specialties/{id}">
                          Sửa
                        </button>
                        <button className="btn danger" disabled title="Backend chưa có DELETE /api/specialties/{id}">
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
        <div className="notice warn">
          Chỉnh sửa/xóa chuyên khoa chờ Backend bổ sung <code>PUT /api/specialties/&#123;id&#125;</code> và{" "}
          <code>DELETE /api/specialties/&#123;id&#125;</code>. Hiện backend chỉ có đọc và thêm mới.
        </div>
      </Panel>

      {creating && (
        <Modal
          title="Thêm chuyên khoa"
          onClose={busy ? () => undefined : () => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)} disabled={busy}>
                Hủy
              </button>
              <button className="btn primary" onClick={submit} disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </>
          }
        >
          <Field label="Tên chuyên khoa *" error={fieldError}>
            <input
              className="field"
              autoFocus
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </Field>
          {apiError && (
            <div className="notice errbox" role="alert">
              {apiError}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
