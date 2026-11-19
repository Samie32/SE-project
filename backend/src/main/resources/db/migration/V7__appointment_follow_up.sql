ALTER TABLE appointment
  ADD COLUMN no_show_reason VARCHAR(24),
  ADD CONSTRAINT ck_appointment_no_show_reason CHECK (
    no_show_reason IS NULL OR (
      status = 'NO_SHOW'
      AND no_show_reason IN ('PATIENT_ABSENT', 'COULD_NOT_CONTACT', 'TECHNICAL_ISSUE', 'OTHER')
    )
  );

ALTER TABLE notification_job ADD COLUMN estimated_start_at DATETIME(6);
