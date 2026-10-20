# Từ điển dữ liệu Topic 2
PostgreSQL 17. UUID định danh; timestamptz lưu UTC; UI hiển thị Asia/Ho_Chi_Minh. Không xóa lịch sử được tham chiếu.

## app_users
Định danh và vai trò hiện hành

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| email | varchar(254) | NOT NULL UNIQUE | Email đã chuẩn hóa lowercase |
| password_hash | text | NOT NULL | Argon2id |
| role | varchar(16) | NOT NULL CHECK(role IN ('PATIENT','DOCTOR','RECEPTION','ADMIN')) | Một vai trò |
| status | varchar(16) | NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','INACTIVE')) | Trạng thái tài khoản |
| verified_at | timestamptz |  | Email xác minh |
| authz_version | integer | NOT NULL DEFAULT 1 CHECK(authz_version>0) | Thu hồi quyền cache/phiên |
| reactivated_until | timestamptz |  | Kích hoạt tác giả có hạn |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## branches
Chi nhánh một tổ chức

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| code | varchar(20) | NOT NULL UNIQUE | Mã chi nhánh |
| name | varchar(150) | NOT NULL | Tên |
| address | varchar(300) | NOT NULL | Địa chỉ |
| opening_hours | jsonb | NOT NULL | Các khoảng giờ trong tuần theo timezone |
| accepting_booking | boolean | NOT NULL DEFAULT true | Ngừng đặt mới trước inactive |
| active | boolean | NOT NULL DEFAULT true | Trạng thái |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## user_branches
Phạm vi staff tại chi nhánh

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| user_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Staff |
| branch_id | uuid | NOT NULL REFERENCES branches(id) ON DELETE RESTRICT | Chi nhánh |
Ràng buộc bảng: PRIMARY KEY(user_id,branch_id)

## specialties
Danh mục chuyên khoa

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| code | varchar(20) | NOT NULL UNIQUE | Mã |
| name | varchar(150) | NOT NULL | Tên |
| active | boolean | NOT NULL DEFAULT true | Trạng thái |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## doctors
Bác sĩ và chuyên khoa chính

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| user_id | uuid | NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE RESTRICT | Tài khoản DOCTOR |
| specialty_id | uuid | NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT | Chuyên khoa |
| public_bio | varchar(1000) | NOT NULL DEFAULT '' | Giới thiệu công khai |
| accepting_booking | boolean | NOT NULL DEFAULT true | Tách khỏi active khi kích hoạt tác giả |
| active | boolean | NOT NULL DEFAULT true | Trạng thái |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## doctor_branches
Nơi bác sĩ làm việc

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Bác sĩ |
| branch_id | uuid | NOT NULL REFERENCES branches(id) ON DELETE RESTRICT | Chi nhánh |
Ràng buộc bảng: PRIMARY KEY(doctor_id,branch_id)

## patients
Hồ sơ hành chính toàn tổ chức

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| display_code | varchar(24) | NOT NULL UNIQUE | Mã BN duy nhất |
| owner_user_id | uuid | UNIQUE REFERENCES app_users(id) ON DELETE RESTRICT | Một tài khoản một hồ sơ; có thể chưa liên kết |
| full_name | varchar(150) | NOT NULL CHECK(length(trim(full_name))>0) | Tên |
| dob | date | NOT NULL | Ngày sinh kiểm tra≤ngày hiện tại ở service |
| phone | varchar(20) | NOT NULL | Không unique |
| email | varchar(254) |  | Kênh liên hệ |
| active | boolean | NOT NULL DEFAULT true | Trạng thái |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## patient_link_verifications
Bằng chứng xác minh liên kết

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| patient_id | uuid | NOT NULL REFERENCES patients(id) ON DELETE RESTRICT | Hồ sơ |
| account_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Tài khoản đích |
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Người đối chiếu |
| proof_digest | varchar(128) | NOT NULL | Digest bằng chứng, không token plaintext |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## health_profiles
Hai phần sức khỏe và nguồn riêng biệt

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| patient_id | uuid | PRIMARY KEY REFERENCES patients(id) ON DELETE RESTRICT | Hồ sơ |
| self_ciphertext | text | NOT NULL | JSON tự khai mã hóa |
| verified_ciphertext | text |  | JSON chuyên môn mã hóa |
| key_id | varchar(32) | NOT NULL | Khóa trong key ring |
| verified_by | uuid | REFERENCES doctors(id) ON DELETE RESTRICT | Người xác minh gần nhất |
| verified_at | timestamptz |  | Thời điểm |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## health_profile_versions
Lịch sử sức khỏe bất biến

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| patient_id | uuid | NOT NULL REFERENCES patients(id) ON DELETE RESTRICT | Hồ sơ |
| aggregate_version | integer | NOT NULL CHECK(aggregate_version>0) | Version lúc lưu |
| source | varchar(16) | NOT NULL CHECK(source IN ('SELF','DOCTOR')) | Phần dữ liệu |
| payload_ciphertext | text | NOT NULL | Snapshot phần sửa mã hóa |
| key_id | varchar(32) | NOT NULL | Khóa |
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Actor |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(patient_id,aggregate_version)

## work_shifts
Ca làm đã khai báo

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Bác sĩ |
| branch_id | uuid | NOT NULL REFERENCES branches(id) ON DELETE RESTRICT | Vị trí làm cả DIRECT/VIDEO |
| mode | varchar(6) | NOT NULL CHECK(mode IN ('DIRECT','VIDEO')) | Hình thức |
| starts_at | timestamptz | NOT NULL | Bắt đầu UTC |
| ends_at | timestamptz | NOT NULL | Kết thúc UTC |
| breaks | jsonb | NOT NULL DEFAULT '[]'::jsonb | Khoảng nghỉ, kiểm tra service |
| status | varchar(16) | NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','STOPPED')) | STOPPED vẫn bảo tồn ca và lịch |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: CHECK(starts_at<ends_at); EXCLUDE USING gist(doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status IN ('PUBLISHED','STOPPED'))

## slots
Slot thời gian bất biến khi được tham chiếu

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| shift_id | uuid | NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT | Ca |
| starts_at | timestamptz | NOT NULL | Bắt đầu |
| ends_at | timestamptz | NOT NULL | Kết thúc |
| bookable | boolean | NOT NULL DEFAULT true | Dừng đặt không xóa slot |
Ràng buộc bảng: CHECK(starts_at<ends_at); UNIQUE(shift_id,starts_at)

## appointments
Lịch hiện hành và snapshot lịch

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| slot_id | uuid | NOT NULL REFERENCES slots(id) ON DELETE RESTRICT | Slot hiện hành |
| patient_id | uuid | NOT NULL REFERENCES patients(id) ON DELETE RESTRICT | Bệnh nhân |
| doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Snapshot từ shift |
| branch_id | uuid | NOT NULL REFERENCES branches(id) ON DELETE RESTRICT | Snapshot từ shift |
| mode | varchar(6) | NOT NULL CHECK(mode IN ('DIRECT','VIDEO')) | Snapshot |
| starts_at | timestamptz | NOT NULL | Snapshot |
| ends_at | timestamptz | NOT NULL | Snapshot |
| status | varchar(16) | NOT NULL CHECK(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','ABORTED')) | Vòng đời |
| coordination_status | varchar(16) | NOT NULL DEFAULT 'NONE' CHECK(coordination_status IN ('NONE','UNRESOLVED','RESOLVED')) | Điều phối riêng trạng thái lịch |
| reason_code | varchar(40) |  | Lý do metadata, không ghi chẩn đoán |
| created_by | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Actor đặt |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: CHECK(starts_at<ends_at); EXCLUDE USING gist(doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')); EXCLUDE USING gist(patient_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS'))

## appointment_history
Lịch sử version bất biến

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT | Lịch |
| aggregate_version | integer | NOT NULL CHECK(aggregate_version>0) | Version |
| before_slot_id | uuid | REFERENCES slots(id) ON DELETE RESTRICT | Slot trước |
| after_slot_id | uuid | NOT NULL REFERENCES slots(id) ON DELETE RESTRICT | Slot sau |
| event | varchar(32) | NOT NULL | book/reschedule/cancel/checkin/start... |
| status_after | varchar(16) | NOT NULL | Trạng thái sau |
| reason | varchar(500) |  | Lý do hành chính |
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Actor |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(appointment_id,aggregate_version)

## care_assignments
Quyền theo quan hệ điều trị

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT | Lịch |
| patient_id | uuid | NOT NULL REFERENCES patients(id) ON DELETE RESTRICT | Patient snapshot |
| doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Doctor hiện hành |
| read_from | timestamptz | NOT NULL | max(confirmed_at,start-24h) |
| status | varchar(16) | NOT NULL CHECK(status IN ('SCHEDULED','IN_CARE','HISTORICAL','REVOKED')) | HISTORICAL chỉ ca đã phụ trách |
| revoked_at | timestamptz |  | Thu hồi |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## coordination_requests
Quyết định điều phối có phản hồi

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT | Lịch bị ảnh hưởng |
| proposed_slot_id | uuid | REFERENCES slots(id) ON DELETE RESTRICT | Đề nghị không giữ chỗ |
| response | varchar(16) | NOT NULL CHECK(response IN ('UNREACHED','ACCEPTED','DECLINED','CLINIC_CANCELLED')) | Không suy consent |
| contact_channel | varchar(16) | NOT NULL | PHONE/EMAIL/IN_PERSON |
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Staff |
| reason | varchar(500) | NOT NULL | Lý do hành chính |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## encounters
Lượt khám riêng appointment

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT | Tối đa một lượt/lịch |
| doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Bác sĩ phụ trách |
| status | varchar(20) | NOT NULL CHECK(status IN ('WAITING','CHECKIN_CANCELLED','IN_PROGRESS','COMPLETED','ABORTED')) | Vòng đời |
| checked_in_at | timestamptz | NOT NULL | Giờ thực tế |
| started_at | timestamptz |  | Giờ thực tế |
| ended_at | timestamptz |  | Giờ thực tế |
| abort_reason_ciphertext | text |  | Lý do chuyên môn mã hóa nếu gián đoạn |
| key_id | varchar(32) |  | Khóa reason |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## clinical_records
Bản khám gốc và trạng thái

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| encounter_id | uuid | NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT | Một bản gốc/lượt |
| author_doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Tác giả bất biến |
| status | varchar(8) | NOT NULL CHECK(status IN ('DRAFT','FINAL')) | Trạng thái |
| payload_ciphertext | text | NOT NULL | JSON clinical payload mã hóa có xác thực |
| key_id | varchar(32) | NOT NULL | Key ring |
| validation_complete | boolean | NOT NULL DEFAULT false | Server validation cho finalize |
| finalized_at | timestamptz |  | Thời điểm hoàn tất |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: CHECK(status<>'FINAL' OR (validation_complete AND finalized_at IS NOT NULL))

## record_addenda
Bổ sung bất biến không ghi đè gốc

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| record_id | uuid | NOT NULL REFERENCES clinical_records(id) ON DELETE RESTRICT | Bản gốc |
| author_doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Tác giả gốc |
| sequence_no | integer | NOT NULL CHECK(sequence_no>0) | Thứ tự |
| payload_ciphertext | text | NOT NULL | Nội dung và lý do mã hóa |
| key_id | varchar(32) | NOT NULL | Khóa |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(record_id,sequence_no)

## medications
Danh mục thuốc phục vụ demo

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| code | varchar(30) | NOT NULL UNIQUE | Mã công khai |
| name | varchar(150) | NOT NULL | Tên |
| strength | varchar(60) | NOT NULL | Hàm lượng |
| allergen_group | varchar(60) |  | Nhóm dùng cảnh báo đơn giản |
| active | boolean | NOT NULL DEFAULT true | Không xóa khi đã dùng |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## prescriptions
Chuỗi phiên bản đơn

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| encounter_id | uuid | NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT | Lượt |
| previous_id | uuid | UNIQUE REFERENCES prescriptions(id) ON DELETE RESTRICT | Bản thay thế trực tiếp |
| author_doctor_id | uuid | NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT | Tác giả |
| rx_code | varchar(24) | NOT NULL UNIQUE | Mã RX |
| revision_no | integer | NOT NULL CHECK(revision_no>0) | Version phát hành |
| status | varchar(16) | NOT NULL CHECK(status IN ('DRAFT','ISSUED','SUPERSEDED','DISCARDED')) | Trạng thái |
| reason_ciphertext | text |  | Lý do hiệu chỉnh/loại bỏ mã hóa |
| key_id | varchar(32) | NOT NULL | Khóa |
| validation_complete | boolean | NOT NULL DEFAULT false | Server validated toàn bộ item và allergy |
| issued_at | timestamptz |  | Thời điểm |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
Ràng buộc bảng: UNIQUE(encounter_id,revision_no); CHECK(status NOT IN ('ISSUED','SUPERSEDED') OR (validation_complete AND issued_at IS NOT NULL))

## prescription_items
Dòng đơn chuẩn hóa, nội dung mã hóa

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| prescription_id | uuid | NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT | Đơn |
| position | integer | NOT NULL CHECK(position BETWEEN 1 AND 30) | Thứ tự dòng |
| payload_ciphertext | text | NOT NULL | Thuốc, liều, số ngày/số lượng, hướng dẫn và override trong JSON mã hóa |
| key_id | varchar(32) | NOT NULL | Khóa |
| validation_complete | boolean | NOT NULL DEFAULT false | Server kiểm tra trường cần thiết |
Ràng buộc bảng: UNIQUE(prescription_id,position)

## video_sessions
Phiên video theo generation

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT | Lịch |
| appointment_version | integer | NOT NULL | Version lúc tạo |
| generation | integer | NOT NULL CHECK(generation>0) | Room generation |
| provider_room_name | varchar(100) | NOT NULL UNIQUE | Ngẫu nhiên không PHI |
| status | varchar(16) | NOT NULL CHECK(status IN ('CREATED','WAITING','ACTIVE','DISCONNECTED','ENDED','FAILED')) | Trạng thái |
| disconnected_since | timestamptz |  | Mốc đầu chưa phục hồi |
| access_closed | boolean | NOT NULL DEFAULT false | Chặn cấp token nội bộ |
| cleanup_pending | boolean | NOT NULL DEFAULT false | Provider chưa đóng xác nhận |
| provider_closed_at | timestamptz |  | Chỉ set khi có bằng chứng |
| version | integer | NOT NULL DEFAULT 1 CHECK (version>0) | Phiên bản optimistic concurrency |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(appointment_id,generation)

## video_participants
Hai participant theo vai trò ca

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| video_session_id | uuid | NOT NULL REFERENCES video_sessions(id) ON DELETE RESTRICT | Room |
| user_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Chỉ patient/doctor |
| role | varchar(8) | NOT NULL CHECK(role IN ('PATIENT','DOCTOR')) | Vai trò ca |
| consented_at | timestamptz |  | Consent |
| connected | boolean | NOT NULL DEFAULT false | Hiện diện |
| last_event_at | timestamptz |  | Đối soát metadata |
Ràng buộc bảng: UNIQUE(video_session_id,role); UNIQUE(video_session_id,user_id)

## outbox_events
Sự kiện đáng tin cậy sau commit

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| aggregate_id | uuid | NOT NULL | ID aggregate |
| aggregate_version | integer | NOT NULL | Version |
| event_type | varchar(40) | NOT NULL | Loại sự kiện |
| payload | jsonb | NOT NULL | Metadata tối thiểu, không PHI |
| published_at | timestamptz |  | Đã tạo job/notification |
| lease_until | timestamptz |  | Lease worker |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(aggregate_id,aggregate_version,event_type)

## notification_configs
Mẫu có version

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| version_no | integer | NOT NULL UNIQUE | Version config |
| effective_at | timestamptz | NOT NULL | Hiệu lực |
| templates | jsonb | NOT NULL | Biến allowlist, không PHI |
| reminder_minutes | integer[] | NOT NULL DEFAULT ARRAY[1440,120] | Mốc đã xác nhận |
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Admin |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## notifications
Logical notification theo version

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| appointment_id | uuid | NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT | Lịch |
| appointment_version | integer | NOT NULL | Version nguồn |
| config_id | uuid | NOT NULL REFERENCES notification_configs(id) ON DELETE RESTRICT | Mẫu |
| event_type | varchar(32) | NOT NULL | CONFIRM/CHANGE/CANCEL/REMINDER |
| channel | varchar(5) | NOT NULL CHECK(channel IN ('EMAIL','SMS')) | Kênh |
| milestone | varchar(16) | NOT NULL DEFAULT 'IMMEDIATE' | 24H/2H/IMMEDIATE |
| status | varchar(16) | NOT NULL CHECK(status IN ('QUEUED','PROCESSING','ACCEPTED','DELIVERED','FAILED','UNKNOWN','SKIPPED','SIMULATED')) | Bằng chứng |
| due_at | timestamptz | NOT NULL | Mốc |
| authorized_at | timestamptz |  | Điểm tuyến tính hóa gửi |
| lease_until | timestamptz |  | Lease |
| provider_message_id | varchar(200) |  | Provider ID |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(appointment_id,appointment_version,event_type,channel,milestone)

## notification_attempts
Mỗi lần gửi có bằng chứng

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| notification_id | uuid | NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT | Logical notification |
| attempt_no | integer | NOT NULL CHECK(attempt_no BETWEEN 1 AND 3) | Tổng tối đa ba |
| result | varchar(16) | NOT NULL CHECK(result IN ('ACCEPTED','FAILED','UNKNOWN','SIMULATED')) | Kết quả handoff |
| error_code | varchar(60) |  | Lỗi đã làm sạch |
| provider_message_id | varchar(200) |  | ID phản hồi |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(notification_id,attempt_no)

## webhook_receipts
Dedup callback đã xác thực

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| provider | varchar(12) | NOT NULL CHECK(provider IN ('MAILGUN','DAILY')) | Provider |
| event_id | varchar(200) | NOT NULL | Unique của provider hoặc digest token |
| payload_digest | varchar(128) | NOT NULL | Không lưu raw PHI |
| received_at | timestamptz | NOT NULL DEFAULT now() | UTC |
| processed_at | timestamptz |  | Sau áp dụng |
Ràng buộc bảng: UNIQUE(provider,event_id)

## idempotency_records
Kết quả command chống lặp

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| actor_id | uuid | NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT | Actor |
| operation | varchar(80) | NOT NULL | operationId |
| key | varchar(100) | NOT NULL | Idempotency-Key |
| request_hash | varchar(128) | NOT NULL | Hash canonical payload |
| resource_id | uuid |  | ID kết quả; không cache PHI |
| response_code | integer | NOT NULL | Status replay |
| expires_at | timestamptz | NOT NULL | 24 giờ |
Ràng buộc bảng: PRIMARY KEY(actor_id,operation,key)

## audit_chain_heads
Điểm đầu chuỗi từng ngày

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| partition_date | date | PRIMARY KEY | Ngày UTC |
| last_sequence | bigint | NOT NULL DEFAULT 0 | Sequence trong partition |
| last_hash | varchar(128) | NOT NULL DEFAULT 'GENESIS' | Hash cuối |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## audit_events
PHI audit append only

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| partition_date | date | NOT NULL | Ngày UTC |
| sequence_no | bigint | NOT NULL | Sequence |
| actor_id | uuid | REFERENCES app_users(id) ON DELETE RESTRICT | Actor hoặc null khi unauthenticated |
| role_snapshot | varchar(16) | NOT NULL | Vai trò tại thời điểm |
| patient_id | uuid | REFERENCES patients(id) ON DELETE RESTRICT | ID metadata |
| resource_type | varchar(32) | NOT NULL | Loại |
| resource_id | uuid |  | ID |
| action | varchar(32) | NOT NULL | READ/WRITE/FINALIZE/ADDENDUM/EXPORT/DENIED |
| outcome | varchar(12) | NOT NULL CHECK(outcome IN ('ALLOW','DENY','ERROR')) | Kết quả |
| request_id | uuid | NOT NULL | Request correlation |
| source_digest | varchar(128) | NOT NULL | IP/useragent digest hạn chế |
| previous_hash | varchar(128) | NOT NULL | HMAC trước |
| event_hash | varchar(128) | NOT NULL | HMAC metadata bằng secret ngoài DB |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(partition_date,sequence_no)

## security_events
Audit cấu hình và log bảo mật sạch

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| actor_id | uuid | REFERENCES app_users(id) ON DELETE RESTRICT | Actor |
| action | varchar(64) | NOT NULL | Login/change role/config/audit lookup/export |
| outcome | varchar(12) | NOT NULL | Kết quả |
| request_id | uuid | NOT NULL | Correlation |
| metadata | jsonb | NOT NULL DEFAULT '{}'::jsonb | Allowlist, không PHI/password/token |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## access_alerts
Cảnh báo metadata

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| actor_id | uuid | REFERENCES app_users(id) ON DELETE RESTRICT | Người có mẫu truy cập |
| rule_code | varchar(32) | NOT NULL | 30 hồ sơ/5phút hoặc10denied/5phút |
| window_start | timestamptz | NOT NULL | Cửa sổ năm phút |
| acknowledged_by | uuid | REFERENCES app_users(id) ON DELETE RESTRICT | Admin đã xem |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: UNIQUE(actor_id,rule_code,window_start)

## private_artifacts
Tệp kết quả riêng tư có mã hóa

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| record_id | uuid | REFERENCES clinical_records(id) ON DELETE RESTRICT | Bệnh án |
| prescription_id | uuid | REFERENCES prescriptions(id) ON DELETE RESTRICT | Đơn |
| storage_key | varchar(300) | NOT NULL UNIQUE | Private path ngẫu nhiên |
| key_id | varchar(32) | NOT NULL | Khóa tệp |
| content_digest | varchar(128) | NOT NULL | Checksum ciphertext |
| source_version | integer | NOT NULL | Version tạo |
| expires_at | timestamptz | NOT NULL | Xóa cache sau24h |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: CHECK((record_id IS NOT NULL)::integer+(prescription_id IS NOT NULL)::integer=1)

## backup_runs
Bằng chứng hạ tầng không chứa dữ liệu

| Cột | Kiểu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | Định danh nội bộ |
| status | varchar(16) | NOT NULL CHECK(status IN ('STARTED','VERIFIED','FAILED','RESTORE_VALIDATED')) | Trạng thái |
| manifest_digest | varchar(128) |  | Checksum |
| source_timestamp | timestamptz |  | Để đo RPO |
| completed_at | timestamptz |  | Đo RTO |
| error_code | varchar(64) |  | Lỗi sạch |
| created_at | timestamptz | NOT NULL DEFAULT now() | Thời điểm tạo UTC |
Ràng buộc bảng: Theo các khóa và cột bên trên.

## Nội dung logic trong ciphertext
clinical_records.payload: chief_complaint1..1000, assessment1..4000, diagnosis1..2000, plan1..4000, follow_up0..1000; đủ bốn trường đầu khi FINAL.
prescription_items.payload: medication_code1..30 và tên/hàm lượng snapshot; route1..60; dose1..100; frequency_per_day integer1..24; duration_days integer1..365; quantity integer1..9999; instructions1..1000; allergy_override_reason0..1000; unknown_allergy_assessment0..1000. Tối đa30 dòng. Các constraint ngữ nghĩa được server validator thực thi trước set validation_complete; CSDL không giải mã payload.
health_profiles: phần tự khai và phần chuyên môn có nguồn; allergy entries giữ nhóm/tên, source, recorded_at; NONE cần nguồn xác minh. Trường nhạy cảm mã hóa bằng mã hóa AES-256-GCM từ thư viện chuẩn .NET, key_id được chọn từ key ring ngoài DB.
JSON mã hóa là giá trị nguyên tử ở mức vật lý; các thực thể, quan hệ và dòng đơn được chuẩn hóa, không lưu tên branch/doctor lặp vào mọi bảng. Snapshot tên thuốc trong payload bảo toàn ý nghĩa đơn khi danh mục thay đổi.