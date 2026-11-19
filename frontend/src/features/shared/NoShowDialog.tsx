import { useState } from "react";
import type { NoShowFollowUp } from "@/api/appointments";
import { apptCode, NO_SHOW_REASON } from "@/core/labels";
import type { Appointment, NoShowReason } from "@/core/types";
import { ConfirmDialog, Field } from "@/ui";

export function NoShowDialog({
  appointment, busy, error, onCancel, onConfirm,
}: {
  appointment: Appointment;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (followUp: NoShowFollowUp) => void;
}) {
  const [reason, setReason] = useState<NoShowReason | "">("");
  const [sendEmail, setSendEmail] = useState(false);

  return (
    <ConfirmDialog
      title="Ghi nhận vắng mặt?"
      message={<>Lịch <b>{apptCode(appointment.id)}</b> sẽ chuyển sang “Vắng mặt”.</>}
      confirmLabel="Ghi nhận vắng mặt"
      danger
      busy={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={() => onConfirm({ noShowReason: reason || undefined, sendRebookingEmail: sendEmail || undefined })}
    >
      <Field label="Lý do vắng mặt">
        {(id) => (
          <select id={id} className="field" disabled={busy} value={reason}
            onChange={(event) => setReason(event.target.value as NoShowReason | "")}>
            <option value="">Chưa rõ lý do</option>
            {Object.entries(NO_SHOW_REASON).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        )}
      </Field>
      <label className="row" style={{ marginTop: 12, gap: 8 }}>
        <input type="checkbox" checked={sendEmail} disabled={busy} onChange={(event) => setSendEmail(event.target.checked)} />
        Gửi email mời bệnh nhân đặt lịch lại
      </label>
    </ConfirmDialog>
  );
}
