-- Sau khi tạo role topic2_app bằng quản trị hạ tầng (secret không trong file).
-- Schema mặc định public; migrations dùng role khác topic2_app.
GRANT USAGE ON SCHEMA public TO topic2_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO topic2_app;
REVOKE UPDATE, DELETE ON audit_events, appointment_history, record_addenda, health_profile_versions, notification_attempts, security_events FROM topic2_app;
REVOKE DELETE ON app_users, patients, doctors, branches, specialties, work_shifts, slots, appointments, encounters, clinical_records, prescriptions FROM topic2_app;
-- Backup/restore và DDL chỉ bằng role hạ tầng; không grant schema CREATE cho runtime.
