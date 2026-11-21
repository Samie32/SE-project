CREATE INDEX ix_appointment_active_window ON appointment(status, start_at, end_at, doctor_id);
CREATE INDEX ix_time_off_window ON time_off(start_at, end_at, doctor_id);
