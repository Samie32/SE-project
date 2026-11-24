# Mô hình dữ liệu logic & Từ điển dữ liệu (MySQL 8.4 — V1..V13)

Mô hình dữ liệu thực tế gồm **26 bảng InnoDB** được quản lý tuần tự qua Flyway `V1` đến `V13`. Sơ đồ xem tại [erd.png](erd.png) và 3 góc nhìn [đặt lịch](erd-scheduling.png), [lâm sàng](erd-clinical.png), [hạ tầng](erd-infrastructure.png).

## Danh mục 26 thực thể và ràng buộc

| Bảng (`V1..V13`) | Khóa và thuộc tính chính | Ràng buộc và phân hệ quản lý |
|---|---|---|
| `user_account` (`V1,V4,V5,V8,V13`) | `id` CHAR(36) PK, `issuer`, `subject`, `username`, `display_name`, `active`, `staff`, `email_encrypted`, `email_hash`, `phone_encrypted`, `phone_hash`, `birth_date`, `hometown_encrypted`, `permanent_address_encrypted`, `personal_info_updated_at` | `UNIQUE(issuer, subject)`; `INDEX(email_hash)`, `INDEX(phone_hash)` (HMAC-SHA256 dẫn xuất riêng cho tra cứu chính xác); `hometown_encrypted` & `permanent_address_encrypted` mã hóa AES-256-GCM; `personal_info_updated_at` kiểm soát giới hạn đổi thông tin cá nhân 90 ngày/lần; không lưu mật khẩu; `M01` |
| `user_role` (`V1`) | `user_id` CHAR(36) PK/FK, `role` PK | `CHECK(role IN ('PATIENT','DOCTOR','RECEPTIONIST','ADMINISTRATOR','AUDITOR'))`; `M01` |
| `contact_otp` (`V9`) | `actor_id` CHAR(36) PK/FK, `email_hash`, `otp_hash`, `expires_at`, `sent_at`, `attempts` | Mã OTP 6 số đổi email (TTL 300s, tối đa 5 lần sai), xóa ngay khi xác thực thành công hoặc hết hạn; `INDEX(expires_at)`, `INDEX(email_hash, sent_at)`; `M01` |
| `contact_otp_send_log` (`V9`) | `id` CHAR(36) PK, `email_hash`, `sent_at` | Theo dõi cooldown 30s và ngưỡng tối đa 5 lượt/3600s theo email đích; `INDEX(email_hash, sent_at)`; `M01` |
| `patient` (`V1`) | `id` CHAR(36) PK, `user_id` CHAR(36) FK/UK | Liên kết 1:1 tới `user_account`; giữ dữ liệu tối thiểu phục vụ đặt lịch/khám; `M01`/`M04` |
| `specialty` (`V1`) | `id` CHAR(36) PK, `name` UK, `active` | Tên chuyên khoa duy nhất (kiểm tra trùng không phân biệt hoa thường ở service); `M02` |
| `doctor` (`V1`) | `id` CHAR(36) PK, `user_id` CHAR(36) FK/UK, `active` | Liên kết 1:1 tới `user_account`; tắt `active=false` không xóa lịch sử khám; `M02` |
| `doctor_specialty` (`V1`) | `doctor_id` PK/FK, `specialty_id` PK/FK | Liên kết N:N giữa bác sĩ và chuyên khoa; `M02` |
| `clinic_hours` (`V3`) | `day_of_week` TINYINT PK (1..7), `opens_at`, `closes_at` | `opens_at < closes_at` hoặc cùng NULL khi phòng khám nghỉ ngày đó; mặc định T2–T7 `08:00–17:00`, CN nghỉ; `M03` |
| `clinic_holiday` (`V6`) | `id` PK, `start_date`, `end_date`, `name`, `closed`, `opens_at`, `closes_at` | `start_date <= end_date`; ưu tiên cao hơn `clinic_hours`; `INDEX(start_date, end_date)`; `M03` |
| `availability` (`V1`) | `id` PK, `doctor_id` FK, `start_at`, `end_at`, `slot_minutes`, `mode` | `start_at < end_at`, `slot_minutes > 0`, `mode IN ('IN_PERSON','REMOTE')`; `INDEX(doctor_id, start_at, end_at)`; `M03` |
| `time_off` (`V1,V11`) | `id` PK, `doctor_id` FK, `start_at`, `end_at` | `start_at < end_at`; không chồng lịch hẹn hiệu lực; `V11 ix_time_off_window(start_at, end_at, doctor_id)`; `M03` |
| `slot` (`V1,V10`) | `id` PK, `availability_id` FK, `doctor_id` FK, `start_at`, `end_at`, `mode` | `UNIQUE(doctor_id, start_at, end_at)`; `V10 ix_slot_start_at(start_at, id, doctor_id, mode, end_at)`; `M03` |
| `appointment` (`V1,V7,V11`) | `id` PK, `patient_id`, `doctor_id`, `slot_id`, `start_at`, `end_at`, `mode`, `status`, `version`, `cancellation_reason`, `no_show_reason` | `status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')`; `no_show_reason` chỉ hợp lệ khi `NO_SHOW` (`PATIENT_ABSENT`, `COULD_NOT_CONTACT`, `TECHNICAL_ISSUE`, `OTHER`); `V11 ix_appointment_active_window`; `M04` |
| `queue_ticket` (`V2`) | `id` PK, `appointment_id` UK/FK, `doctor_id` FK, `queue_date` DATE, `position` BIGINT, `status`, `version`, `skip_reason`, `created_at` | `UNIQUE(doctor_id, queue_date, position)`; `status IN ('WAITING','CALLED','IN_SERVICE','DONE')`; `position` cấp nguyên tử dưới khóa `Doctor`; `M08` |
| `encounter` (`V2`) | `id` PK, `appointment_id` UK/FK, `status`, `started_at`, `completed_at` | `status IN ('IN_PROGRESS','COMPLETED')`; một lần khám duy nhất cho mỗi lịch hẹn đã bắt đầu; `M05` |
| `medical_record` (`V2`) | `id` PK, `encounter_id` FK, `version`, `status`, `content_encrypted` MEDIUMBLOB, `supersedes_id` UK/FK, `amendment_reason`, `created_at` | `UNIQUE(encounter_id, version)`; trigger cấm `UPDATE` bản `FINAL` và cấm `DELETE` mọi bản ghi; bản bổ sung tạo bản `FINAL` mới có `supersedes_id` và lý do; `M05` |
| `prescription` (`V2`) | `id` PK, `encounter_id` FK, `version`, `status`, `items_encrypted` MEDIUMBLOB, `created_at`, `issued_at` | `status IN ('DRAFT','ISSUED')`; danh sách thuốc mã hóa AES-256-GCM trong `items_encrypted`; trigger cấm `UPDATE` bản `ISSUED` và cấm `DELETE`; `M05` |
| `telehealth_session` (`V2`) | `id` PK, `appointment_id` UK/FK, `status`, `version`, `patient_consented_at`, `ended_at` | `status IN ('CREATED','WAITING','ACTIVE','RECONNECTING','ENDED','CANCELLED')`; `M09` |
| `telehealth_token` (`V2`) | `token_hash` CHAR(64) PK, `session_id` FK, `user_id` FK, `expires_at` | Lưu SHA-256 của `X-Room-Token` (TTL 300s); xóa tức thì khi `ENDED`/`CANCELLED`; `INDEX(expires_at)`; `M09` |
| `telehealth_signal` (`V2`) | `id` BIGINT AUTO_INCREMENT PK, `session_id` FK, `sender_id` FK, `kind`, `payload_encrypted` MEDIUMBLOB, `created_at` | `kind IN ('OFFER','ANSWER','ICE')`; mã hóa AES-256-GCM nội dung SDP/ICE; xóa khi kết thúc phiên; `M09` |
| `notification_job` (`V1,V7`) | `id` PK, `appointment_id` FK, `appointment_version`, `event_type`, `status`, `attempts`, `due_at`, `lease_until`, `lease_token`, `last_error`, `estimated_start_at` | Đóng vai trò transactional outbox; `UNIQUE(appointment_id, appointment_version, event_type)`; nhận job bằng `FOR UPDATE SKIP LOCKED`; `M06` |
| `audit_event` (`V1,V2,V12`) | `id` PK, `actor_id` FK nullable, `actor_type`, `actor_label`, `action`, `resource_id`, `result`, `correlation_id`, `created_at`, `chain_seq` BIGINT UK nullable, `prev_hash` CHAR(64) nullable, `event_hash` CHAR(64) nullable | Trigger cấm `UPDATE` và `DELETE` (append-only); hệ thống dùng `actor_type='SYSTEM'` + `actor_label`; chuỗi băm `HMAC-SHA256-CHAIN-V1` từ `V12`; các chỉ mục `V12`: `ix_audit_time_desc(created_at DESC, id DESC)`, `ix_audit_result_time`, `ix_audit_action_time`, `ix_audit_actor_type_time`, `ix_audit_correlation`; `M07` |
| `audit_chain_head` (`V12`) | `id` TINYINT PK (`CHECK id=1`), `last_seq` BIGINT (`CHECK last_seq>=0`), `last_hash` CHAR(64), `updated_at` DATETIME(6) | Bản ghi đỉnh chuỗi đơn khóa bằng `SELECT ... FOR UPDATE` trong giao dịch ghi audit & niêm phong lưu trữ để cấp `chain_seq` liên tục không đứt đoạn khi rollback; `M07` |
| `audit_archive_batch` (`V12`) | `id` CHAR(36) PK, `from_created_at`, `to_created_at`, `event_count` INT, `first_chain_seq` BIGINT, `last_chain_seq` BIGINT, `batch_hash` CHAR(64), `retention_days` INT, `created_by` FK, `created_at`, `notes` VARCHAR(500) | Trigger `audit_archive_no_update`/`audit_archive_no_delete` cấm sửa/xóa; lưu manifest niêm phong các lô kiểm toán theo chính sách `365/1.825` ngày (`APPEND_ONLY_NO_APP_DELETE`); `INDEX(created_at DESC, id)`; `M07` |
| `idempotency_record` (`V1`) | Composite PK(`actor_id`, `operation`, `request_key`), `request_hash` CHAR(64), `response_json` JSON, `expires_at` | Trùng key + cùng hash trả response đã lưu trong 24h; khác hash trả `409`; `M04` |

## Toàn vẹn, quy ước thời gian và khóa đồng thời

- **Chuẩn hóa & Snapshot có chủ đích:** Danh mục chuyên khoa tách 3NF qua `doctor_specialty`; vai trò tách qua `user_role`; các mục thuốc của đơn được mã hóa chung trong `prescription.items_encrypted` dưới dạng JSON BLOB để tránh lộ PHI dạng văn bản thuần trong bảng con. `appointment.start_at/end_at` chụp từ `slot` tại thời điểm đặt/đổi trong cùng giao dịch.
- **Quy ước thời gian:** Mọi cột `DATETIME(6)` lưu UTC; JDBC bật `connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true`; tầng ứng dụng quy đổi theo `Asia/Ho_Chi_Minh` khi hiển thị và xác định ngày phục vụ `queue_date` (`DATE`).
- **Thứ tự khóa chống deadlock & tranh chấp:** Giao dịch đặt/đổi/tiến trình khóa `Doctor` theo ID tăng dần -> `Patient` -> `Appointment` -> tài nguyên con (`Encounter`, `QueueTicket`, `TelehealthSession`) ở mức cô lập `READ COMMITTED`.
- **Chỉ mục tối ưu hiệu năng (`V10`–`V12`):** `ix_slot_start_at`, `ix_appointment_active_window` và `ix_time_off_window` giúp `GET /api/slots` dùng covering/index scan phẳng (3 truy vấn gọn), đưa `p95` tải 50 VU từ `4,52 s` xuống `7,02 ms` (và `POST /api/appointments` đạt `11,95 ms` kể cả khi có khóa `audit_chain_head FOR UPDATE` + HMAC-SHA256); `V12` bổ sung 5 chỉ mục cho `audit_event` phục vụ lọc server-side và phân trang con trỏ, đồng thời kiểm chứng chuỗi băm `POST /api/audit-events/verify` dùng snapshot `REPEATABLE READ` không khóa ghi đồng thời.

## Ánh xạ kiểu dữ liệu MySQL

| Dữ liệu | Kiểu lưu trữ |
|---|---|
| UUID & Khóa ngoại | `CHAR(36)` chữ thường |
| Mã băm & Blind index | `CHAR(64)` hex SHA-256 / HMAC-SHA256 |
| Thời điểm UTC / Ngày phòng khám | `DATETIME(6)` / `DATE` |
| Phiên bản, thứ tự, số lần thử | `INT` / `BIGINT` |
| Trạng thái, lý do, tên ngắn | `VARCHAR(...)` kèm `CHECK` |
| Dữ liệu mã hóa AES-256-GCM | `BLOB` / `MEDIUMBLOB` |
| Phản hồi idempotency | `JSON` |
| Cờ trạng thái | `BOOLEAN` |
