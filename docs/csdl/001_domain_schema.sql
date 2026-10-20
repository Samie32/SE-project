-- Topic 2 Final domain schema PostgreSQL 17
-- Dữ liệu demo; transaction READ COMMITTED, khóa tài nguyên theo thứ tự UUID.
-- Chạy bằng migration role. Runtime role không có CREATE/ALTER/DROP.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Định danh và vai trò hiện hành
CREATE TABLE app_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email varchar(254) NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role varchar(16) NOT NULL CHECK(role IN ('PATIENT','DOCTOR','RECEPTION','ADMIN')),
 status varchar(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','INACTIVE')),
 verified_at timestamptz ,
 authz_version integer NOT NULL DEFAULT 1 CHECK(authz_version>0),
 reactivated_until timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Chi nhánh một tổ chức
CREATE TABLE branches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(20) NOT NULL UNIQUE,
 name varchar(150) NOT NULL,
 address varchar(300) NOT NULL,
 opening_hours jsonb NOT NULL,
 accepting_booking boolean NOT NULL DEFAULT true,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Phạm vi staff tại chi nhánh
CREATE TABLE user_branches (
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
 PRIMARY KEY(user_id,branch_id)
);

-- Danh mục chuyên khoa
CREATE TABLE specialties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(20) NOT NULL UNIQUE,
 name varchar(150) NOT NULL,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version>0)
);

-- Bác sĩ và chuyên khoa chính
CREATE TABLE doctors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE RESTRICT,
 specialty_id uuid NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
 public_bio varchar(1000) NOT NULL DEFAULT '',
 accepting_booking boolean NOT NULL DEFAULT true,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version>0)
);

-- Nơi bác sĩ làm việc
CREATE TABLE doctor_branches (
 doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
 PRIMARY KEY(doctor_id,branch_id)
);

-- Hồ sơ hành chính toàn tổ chức
CREATE TABLE patients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 display_code varchar(24) NOT NULL UNIQUE,
 owner_user_id uuid UNIQUE REFERENCES app_users(id) ON DELETE RESTRICT,
 full_name varchar(150) NOT NULL CHECK(length(trim(full_name))>0),
 dob date NOT NULL,
 phone varchar(20) NOT NULL,
 email varchar(254) ,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Bằng chứng xác minh liên kết
CREATE TABLE patient_link_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 proof_digest varchar(128) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Hai phần sức khỏe và nguồn riêng biệt
CREATE TABLE health_profiles (
 patient_id uuid PRIMARY KEY REFERENCES patients(id) ON DELETE RESTRICT,
 self_ciphertext text NOT NULL,
 verified_ciphertext text ,
 key_id varchar(32) NOT NULL,
 verified_by uuid REFERENCES doctors(id) ON DELETE RESTRICT,
 verified_at timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0)
);

-- Lịch sử sức khỏe bất biến
CREATE TABLE health_profile_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 aggregate_version integer NOT NULL CHECK(aggregate_version>0),
 source varchar(16) NOT NULL CHECK(source IN ('SELF','DOCTOR')),
 payload_ciphertext text NOT NULL,
 key_id varchar(32) NOT NULL,
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(patient_id,aggregate_version)
);

-- Ca làm đã khai báo
CREATE TABLE work_shifts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
 mode varchar(6) NOT NULL CHECK(mode IN ('DIRECT','VIDEO')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 breaks jsonb NOT NULL DEFAULT '[]'::jsonb,
 status varchar(16) NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','STOPPED')),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 CHECK(starts_at<ends_at),
 EXCLUDE USING gist(doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (status IN ('PUBLISHED','STOPPED'))
);

-- Slot thời gian bất biến khi được tham chiếu
CREATE TABLE slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 shift_id uuid NOT NULL REFERENCES work_shifts(id) ON DELETE RESTRICT,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 bookable boolean NOT NULL DEFAULT true,
 CHECK(starts_at<ends_at),
 UNIQUE(shift_id,starts_at)
);

-- Lịch hiện hành và snapshot lịch
CREATE TABLE appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
 patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
 mode varchar(6) NOT NULL CHECK(mode IN ('DIRECT','VIDEO')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 status varchar(16) NOT NULL CHECK(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','ABORTED')),
 coordination_status varchar(16) NOT NULL DEFAULT 'NONE' CHECK(coordination_status IN ('NONE','UNRESOLVED','RESOLVED')),
 reason_code varchar(40) ,
 created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(starts_at<ends_at),
 EXCLUDE USING gist(doctor_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS')),
 EXCLUDE USING gist(patient_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS'))
);

-- Lịch sử version bất biến
CREATE TABLE appointment_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
 aggregate_version integer NOT NULL CHECK(aggregate_version>0),
 before_slot_id uuid REFERENCES slots(id) ON DELETE RESTRICT,
 after_slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
 event varchar(32) NOT NULL,
 status_after varchar(16) NOT NULL,
 reason varchar(500) ,
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(appointment_id,aggregate_version)
);

-- Quyền theo quan hệ điều trị
CREATE TABLE care_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
 patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 read_from timestamptz NOT NULL,
 status varchar(16) NOT NULL CHECK(status IN ('SCHEDULED','IN_CARE','HISTORICAL','REVOKED')),
 revoked_at timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0)
);

-- Quyết định điều phối có phản hồi
CREATE TABLE coordination_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
 proposed_slot_id uuid REFERENCES slots(id) ON DELETE RESTRICT,
 response varchar(16) NOT NULL CHECK(response IN ('UNREACHED','ACCEPTED','DECLINED','CLINIC_CANCELLED')),
 contact_channel varchar(16) NOT NULL,
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 reason varchar(500) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Lượt khám riêng appointment
CREATE TABLE encounters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
 doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 status varchar(20) NOT NULL CHECK(status IN ('WAITING','CHECKIN_CANCELLED','IN_PROGRESS','COMPLETED','ABORTED')),
 checked_in_at timestamptz NOT NULL,
 started_at timestamptz ,
 ended_at timestamptz ,
 abort_reason_ciphertext text ,
 key_id varchar(32) ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0)
);

-- Bản khám gốc và trạng thái
CREATE TABLE clinical_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 encounter_id uuid NOT NULL UNIQUE REFERENCES encounters(id) ON DELETE RESTRICT,
 author_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 status varchar(8) NOT NULL CHECK(status IN ('DRAFT','FINAL')),
 payload_ciphertext text NOT NULL,
 key_id varchar(32) NOT NULL,
 validation_complete boolean NOT NULL DEFAULT false,
 finalized_at timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 CHECK(status<>'FINAL' OR (validation_complete AND finalized_at IS NOT NULL))
);

-- Bổ sung bất biến không ghi đè gốc
CREATE TABLE record_addenda (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 record_id uuid NOT NULL REFERENCES clinical_records(id) ON DELETE RESTRICT,
 author_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 sequence_no integer NOT NULL CHECK(sequence_no>0),
 payload_ciphertext text NOT NULL,
 key_id varchar(32) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(record_id,sequence_no)
);

-- Danh mục thuốc phục vụ demo
CREATE TABLE medications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(30) NOT NULL UNIQUE,
 name varchar(150) NOT NULL,
 strength varchar(60) NOT NULL,
 allergen_group varchar(60) ,
 active boolean NOT NULL DEFAULT true
);

-- Chuỗi phiên bản đơn
CREATE TABLE prescriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 encounter_id uuid NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
 previous_id uuid UNIQUE REFERENCES prescriptions(id) ON DELETE RESTRICT,
 author_doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
 rx_code varchar(24) NOT NULL UNIQUE,
 revision_no integer NOT NULL CHECK(revision_no>0),
 status varchar(16) NOT NULL CHECK(status IN ('DRAFT','ISSUED','SUPERSEDED','DISCARDED')),
 reason_ciphertext text ,
 key_id varchar(32) NOT NULL,
 validation_complete boolean NOT NULL DEFAULT false,
 issued_at timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 UNIQUE(encounter_id,revision_no),
 CHECK(status NOT IN ('ISSUED','SUPERSEDED') OR (validation_complete AND issued_at IS NOT NULL))
);

-- Dòng đơn chuẩn hóa, nội dung mã hóa
CREATE TABLE prescription_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 30),
 payload_ciphertext text NOT NULL,
 key_id varchar(32) NOT NULL,
 validation_complete boolean NOT NULL DEFAULT false,
 UNIQUE(prescription_id,position)
);

-- Phiên video theo generation
CREATE TABLE video_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
 appointment_version integer NOT NULL,
 generation integer NOT NULL CHECK(generation>0),
 provider_room_name varchar(100) NOT NULL UNIQUE,
 status varchar(16) NOT NULL CHECK(status IN ('CREATED','WAITING','ACTIVE','DISCONNECTED','ENDED','FAILED')),
 disconnected_since timestamptz ,
 access_closed boolean NOT NULL DEFAULT false,
 cleanup_pending boolean NOT NULL DEFAULT false,
 provider_closed_at timestamptz ,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(appointment_id,generation)
);

-- Hai participant theo vai trò ca
CREATE TABLE video_participants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 video_session_id uuid NOT NULL REFERENCES video_sessions(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 role varchar(8) NOT NULL CHECK(role IN ('PATIENT','DOCTOR')),
 consented_at timestamptz ,
 connected boolean NOT NULL DEFAULT false,
 last_event_at timestamptz ,
 UNIQUE(video_session_id,role),
 UNIQUE(video_session_id,user_id)
);

-- Sự kiện đáng tin cậy sau commit
CREATE TABLE outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 aggregate_id uuid NOT NULL,
 aggregate_version integer NOT NULL,
 event_type varchar(40) NOT NULL,
 payload jsonb NOT NULL,
 published_at timestamptz ,
 lease_until timestamptz ,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Mẫu có version
CREATE TABLE notification_configs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_no integer NOT NULL UNIQUE,
 effective_at timestamptz NOT NULL,
 templates jsonb NOT NULL,
 reminder_minutes integer[] NOT NULL DEFAULT ARRAY[1440,120],
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT
);

-- Logical notification theo version
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
 appointment_version integer NOT NULL,
 config_id uuid NOT NULL REFERENCES notification_configs(id) ON DELETE RESTRICT,
 event_type varchar(32) NOT NULL,
 channel varchar(5) NOT NULL CHECK(channel IN ('EMAIL','SMS')),
 milestone varchar(16) NOT NULL DEFAULT 'IMMEDIATE',
 status varchar(16) NOT NULL CHECK(status IN ('QUEUED','PROCESSING','ACCEPTED','DELIVERED','FAILED','UNKNOWN','SKIPPED','SIMULATED')),
 due_at timestamptz NOT NULL,
 authorized_at timestamptz ,
 lease_until timestamptz ,
 provider_message_id varchar(200) ,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(appointment_id,appointment_version,event_type,channel,milestone)
);

-- Mỗi lần gửi có bằng chứng
CREATE TABLE notification_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE RESTRICT,
 attempt_no integer NOT NULL CHECK(attempt_no BETWEEN 1 AND 3),
 result varchar(16) NOT NULL CHECK(result IN ('ACCEPTED','FAILED','UNKNOWN','SIMULATED')),
 error_code varchar(60) ,
 provider_message_id varchar(200) ,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(notification_id,attempt_no)
);

-- Dedup callback đã xác thực
CREATE TABLE webhook_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider varchar(12) NOT NULL CHECK(provider IN ('MAILGUN','DAILY')),
 event_id varchar(200) NOT NULL,
 payload_digest varchar(128) NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz ,
 UNIQUE(provider,event_id)
);

-- Kết quả command chống lặp
CREATE TABLE idempotency_records (
 actor_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 operation varchar(80) NOT NULL,
 key varchar(100) NOT NULL,
 request_hash varchar(128) NOT NULL,
 resource_id uuid ,
 response_code integer NOT NULL,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(actor_id,operation,key)
);

-- Điểm đầu chuỗi từng ngày
CREATE TABLE audit_chain_heads (
 partition_date date PRIMARY KEY,
 last_sequence bigint NOT NULL DEFAULT 0,
 last_hash varchar(128) NOT NULL DEFAULT 'GENESIS'
);

-- PHI audit append only
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 partition_date date NOT NULL,
 sequence_no bigint NOT NULL,
 actor_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
 role_snapshot varchar(16) NOT NULL,
 patient_id uuid REFERENCES patients(id) ON DELETE RESTRICT,
 resource_type varchar(32) NOT NULL,
 resource_id uuid ,
 action varchar(32) NOT NULL,
 outcome varchar(12) NOT NULL CHECK(outcome IN ('ALLOW','DENY','ERROR')),
 request_id uuid NOT NULL,
 source_digest varchar(128) NOT NULL,
 previous_hash varchar(128) NOT NULL,
 event_hash varchar(128) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(partition_date,sequence_no)
);

-- Audit cấu hình và log bảo mật sạch
CREATE TABLE security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
 action varchar(64) NOT NULL,
 outcome varchar(12) NOT NULL,
 request_id uuid NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Cảnh báo metadata
CREATE TABLE access_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
 rule_code varchar(32) NOT NULL,
 window_start timestamptz NOT NULL,
 acknowledged_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,rule_code,window_start)
);

-- Tệp kết quả riêng tư có mã hóa
CREATE TABLE private_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 record_id uuid REFERENCES clinical_records(id) ON DELETE RESTRICT,
 prescription_id uuid REFERENCES prescriptions(id) ON DELETE RESTRICT,
 storage_key varchar(300) NOT NULL UNIQUE,
 key_id varchar(32) NOT NULL,
 content_digest varchar(128) NOT NULL,
 source_version integer NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((record_id IS NOT NULL)::integer+(prescription_id IS NOT NULL)::integer=1)
);

-- Bằng chứng hạ tầng không chứa dữ liệu
CREATE TABLE backup_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 status varchar(16) NOT NULL CHECK(status IN ('STARTED','VERIFIED','FAILED','RESTORE_VALIDATED')),
 manifest_digest varchar(128) ,
 source_timestamp timestamptz ,
 completed_at timestamptz ,
 error_code varchar(64) ,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_slot_occupancy ON appointments(slot_id) WHERE status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS');
CREATE UNIQUE INDEX one_active_encounter ON encounters(doctor_id) WHERE status='IN_PROGRESS';
CREATE UNIQUE INDEX one_draft_prescription ON prescriptions(encounter_id) WHERE status='DRAFT';
CREATE UNIQUE INDEX one_current_prescription ON prescriptions(encounter_id) WHERE status='ISSUED';
CREATE UNIQUE INDEX one_open_video ON video_sessions(appointment_id) WHERE status NOT IN ('ENDED','FAILED');
CREATE INDEX appointment_branch_day ON appointments(branch_id,starts_at,status);
CREATE INDEX appointment_patient_history ON appointments(patient_id,starts_at DESC);
CREATE INDEX care_doctor_status ON care_assignments(doctor_id,status,read_from);
CREATE INDEX slot_shift_time ON slots(shift_id,starts_at);
CREATE INDEX queue_due ON notifications(due_at) WHERE status='QUEUED';
CREATE INDEX audit_patient_time ON audit_events(patient_id,created_at DESC);
CREATE INDEX audit_actor_time ON audit_events(actor_id,created_at DESC);
CREATE INDEX outbox_unpublished ON outbox_events(created_at) WHERE published_at IS NULL;
CREATE INDEX webhook_received ON webhook_receipts(received_at);
CREATE INDEX patient_phone ON patients(phone);

CREATE FUNCTION reject_historical_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'APPEND_ONLY' USING ERRCODE='55000'; END; $$;
CREATE TRIGGER history_append_only BEFORE UPDATE OR DELETE ON appointment_history FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER addendum_append_only BEFORE UPDATE OR DELETE ON record_addenda FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER health_version_append_only BEFORE UPDATE OR DELETE ON health_profile_versions FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER attempts_append_only BEFORE UPDATE OR DELETE ON notification_attempts FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();

CREATE FUNCTION protect_final_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'RECORD_DELETE_FORBIDDEN'; END IF;
 IF OLD.status='FINAL' AND (NEW.status<>OLD.status OR NEW.payload_ciphertext<>OLD.payload_ciphertext OR NEW.author_doctor_id<>OLD.author_doctor_id OR NEW.encounter_id<>OLD.encounter_id OR NEW.finalized_at IS DISTINCT FROM OLD.finalized_at OR NEW.key_id<>OLD.key_id OR NEW.validation_complete<>OLD.validation_complete) THEN
  RAISE EXCEPTION 'FINAL_IMMUTABLE' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER record_final_guard BEFORE UPDATE OR DELETE ON clinical_records FOR EACH ROW EXECUTE FUNCTION protect_final_record();

CREATE FUNCTION protect_rx() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'RX_DELETE_FORBIDDEN'; END IF;
 IF OLD.status IN ('ISSUED','SUPERSEDED','DISCARDED') THEN
  IF (NEW.encounter_id,NEW.author_doctor_id,NEW.rx_code,NEW.revision_no,NEW.reason_ciphertext,NEW.key_id,NEW.validation_complete,NEW.issued_at,NEW.previous_id)
    IS DISTINCT FROM (OLD.encounter_id,OLD.author_doctor_id,OLD.rx_code,OLD.revision_no,OLD.reason_ciphertext,OLD.key_id,OLD.validation_complete,OLD.issued_at,OLD.previous_id)
    OR (NEW.status<>OLD.status AND NOT(OLD.status='ISSUED' AND NEW.status='SUPERSEDED')) THEN
   RAISE EXCEPTION 'RX_IMMUTABLE' USING ERRCODE='55000';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER prescription_guard BEFORE UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION protect_rx();
CREATE FUNCTION protect_rx_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p uuid; s varchar;
BEGIN
 p:=CASE WHEN TG_OP='DELETE' THEN OLD.prescription_id ELSE NEW.prescription_id END;
 SELECT status INTO s FROM prescriptions WHERE id=p FOR UPDATE;
 IF s IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'RX_ITEMS_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND NEW.prescription_id<>OLD.prescription_id THEN RAISE EXCEPTION 'RX_ITEM_PARENT_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER rx_item_guard BEFORE INSERT OR UPDATE OR DELETE ON prescription_items FOR EACH ROW EXECUTE FUNCTION protect_rx_items();

CREATE FUNCTION check_shift_travel() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.doctor_id::text,1));
 IF NEW.status IN ('PUBLISHED','STOPPED') AND EXISTS(
   SELECT 1 FROM work_shifts s WHERE s.doctor_id=NEW.doctor_id AND s.id<>NEW.id
   AND s.status IN ('PUBLISHED','STOPPED') AND s.branch_id<>NEW.branch_id
   AND NEW.starts_at < s.ends_at+interval '60 minutes'
   AND s.starts_at < NEW.ends_at+interval '60 minutes') THEN
  RAISE EXCEPTION 'DOCTOR_TRAVEL_BUFFER' USING ERRCODE='23P01';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.starts_at,NEW.ends_at,NEW.branch_id,NEW.doctor_id,NEW.mode) IS DISTINCT FROM (OLD.starts_at,OLD.ends_at,OLD.branch_id,OLD.doctor_id,OLD.mode)
  AND EXISTS(SELECT 1 FROM slots sl JOIN appointments a ON a.slot_id=sl.id WHERE sl.shift_id=OLD.id) THEN
  RAISE EXCEPTION 'SHIFT_REFERENCED_IMMUTABLE';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER shift_travel BEFORE INSERT OR UPDATE ON work_shifts FOR EACH ROW EXECUTE FUNCTION check_shift_travel();

CREATE FUNCTION check_slot_bounds() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s work_shifts%ROWTYPE;
BEGIN
 SELECT * INTO STRICT s FROM work_shifts WHERE id=NEW.shift_id FOR SHARE;
 IF NEW.starts_at<s.starts_at OR NEW.ends_at>s.ends_at THEN RAISE EXCEPTION 'SLOT_OUTSIDE_SHIFT'; END IF;
 IF TG_OP='UPDATE' AND (NEW.shift_id,NEW.starts_at,NEW.ends_at) IS DISTINCT FROM (OLD.shift_id,OLD.starts_at,OLD.ends_at)
  AND (EXISTS(SELECT 1 FROM appointments WHERE slot_id=OLD.id) OR EXISTS(SELECT 1 FROM appointment_history WHERE before_slot_id=OLD.id OR after_slot_id=OLD.id)) THEN
  RAISE EXCEPTION 'SLOT_REFERENCED_IMMUTABLE';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER slot_bounds BEFORE INSERT OR UPDATE ON slots FOR EACH ROW EXECUTE FUNCTION check_slot_bounds();

CREATE FUNCTION sync_appointment_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sl slots%ROWTYPE; sh work_shifts%ROWTYPE;
BEGIN
 SELECT * INTO STRICT sl FROM slots WHERE id=NEW.slot_id FOR SHARE;
 SELECT * INTO STRICT sh FROM work_shifts WHERE id=sl.shift_id FOR SHARE;
 IF TG_OP='INSERT' OR NEW.slot_id<>OLD.slot_id THEN
  IF NOT sl.bookable OR sh.status<>'PUBLISHED' THEN RAISE EXCEPTION 'SLOT_UNAVAILABLE'; END IF;
  IF TG_OP='UPDATE' AND OLD.status<>'CONFIRMED' THEN RAISE EXCEPTION 'RESCHEDULE_INVALID_STATE'; END IF;
 END IF;
 NEW.doctor_id:=sh.doctor_id; NEW.branch_id:=sh.branch_id; NEW.mode:=sh.mode;
 NEW.starts_at:=sl.starts_at; NEW.ends_at:=sl.ends_at;
 IF TG_OP='UPDATE' AND NEW.patient_id<>OLD.patient_id THEN RAISE EXCEPTION 'APPOINTMENT_OWNER_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER appointment_snapshot BEFORE INSERT OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION sync_appointment_snapshot();

CREATE FUNCTION check_encounter_parent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d uuid;
BEGIN
 SELECT doctor_id INTO STRICT d FROM appointments WHERE id=NEW.appointment_id FOR UPDATE;
 IF NEW.doctor_id<>d THEN RAISE EXCEPTION 'ENCOUNTER_DOCTOR_MISMATCH'; END IF;
 IF TG_OP='UPDATE' AND NEW.appointment_id<>OLD.appointment_id THEN RAISE EXCEPTION 'ENCOUNTER_PARENT_IMMUTABLE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER encounter_parent BEFORE INSERT OR UPDATE ON encounters FOR EACH ROW EXECUTE FUNCTION check_encounter_parent();

CREATE FUNCTION check_addendum_author() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r clinical_records%ROWTYPE;
BEGIN
 SELECT * INTO STRICT r FROM clinical_records WHERE id=NEW.record_id FOR UPDATE;
 IF r.status<>'FINAL' OR r.author_doctor_id<>NEW.author_doctor_id THEN RAISE EXCEPTION 'ADDENDUM_AUTHOR_OR_STATE'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER addendum_author BEFORE INSERT ON record_addenda FOR EACH ROW EXECUTE FUNCTION check_addendum_author();
COMMIT;
