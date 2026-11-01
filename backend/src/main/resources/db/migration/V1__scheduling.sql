CREATE TABLE user_account (
 id CHAR(36) PRIMARY KEY, issuer VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL,
 display_name VARCHAR(255) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 email_encrypted BLOB, UNIQUE KEY uq_identity(issuer,subject)
) ENGINE=InnoDB;
CREATE TABLE user_role (
 user_id CHAR(36) NOT NULL, role VARCHAR(32) NOT NULL,
 PRIMARY KEY(user_id,role), FOREIGN KEY(user_id) REFERENCES user_account(id),
 CHECK(role IN ('PATIENT','DOCTOR','RECEPTIONIST','ADMINISTRATOR','AUDITOR'))
) ENGINE=InnoDB;
CREATE TABLE patient (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL UNIQUE,
 FOREIGN KEY(user_id) REFERENCES user_account(id)
) ENGINE=InnoDB;
CREATE TABLE specialty (
 id CHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;
CREATE TABLE doctor (
 id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(user_id) REFERENCES user_account(id)
) ENGINE=InnoDB;
CREATE TABLE doctor_specialty (
 doctor_id CHAR(36) NOT NULL, specialty_id CHAR(36) NOT NULL,
 PRIMARY KEY(doctor_id,specialty_id),
 FOREIGN KEY(doctor_id) REFERENCES doctor(id), FOREIGN KEY(specialty_id) REFERENCES specialty(id)
) ENGINE=InnoDB;
CREATE TABLE availability (
 id CHAR(36) PRIMARY KEY, doctor_id CHAR(36) NOT NULL,
 start_at DATETIME(6) NOT NULL, end_at DATETIME(6) NOT NULL,
 slot_minutes INT NOT NULL, mode VARCHAR(16) NOT NULL,
 FOREIGN KEY(doctor_id) REFERENCES doctor(id),
 CHECK(start_at < end_at), CHECK(slot_minutes > 0), CHECK(mode IN ('IN_PERSON','REMOTE')),
 INDEX ix_availability(doctor_id,start_at,end_at)
) ENGINE=InnoDB;
CREATE TABLE time_off (
 id CHAR(36) PRIMARY KEY, doctor_id CHAR(36) NOT NULL,
 start_at DATETIME(6) NOT NULL, end_at DATETIME(6) NOT NULL,
 FOREIGN KEY(doctor_id) REFERENCES doctor(id), CHECK(start_at < end_at),
 INDEX ix_time_off(doctor_id,start_at,end_at)
) ENGINE=InnoDB;
CREATE TABLE slot (
 id CHAR(36) PRIMARY KEY, availability_id CHAR(36) NOT NULL, doctor_id CHAR(36) NOT NULL,
 start_at DATETIME(6) NOT NULL, end_at DATETIME(6) NOT NULL, mode VARCHAR(16) NOT NULL,
 FOREIGN KEY(availability_id) REFERENCES availability(id), FOREIGN KEY(doctor_id) REFERENCES doctor(id),
 UNIQUE KEY uq_slot(doctor_id,start_at,end_at),
 CHECK(start_at < end_at), CHECK(mode IN ('IN_PERSON','REMOTE'))
) ENGINE=InnoDB;
CREATE TABLE appointment (
 id CHAR(36) PRIMARY KEY, patient_id CHAR(36) NOT NULL, doctor_id CHAR(36) NOT NULL,
 slot_id CHAR(36) NOT NULL, start_at DATETIME(6) NOT NULL, end_at DATETIME(6) NOT NULL,
 mode VARCHAR(16) NOT NULL, status VARCHAR(24) NOT NULL, version INT NOT NULL DEFAULT 0,
 cancellation_reason VARCHAR(1000),
 FOREIGN KEY(patient_id) REFERENCES patient(id), FOREIGN KEY(doctor_id) REFERENCES doctor(id),
 FOREIGN KEY(slot_id) REFERENCES slot(id), CHECK(start_at < end_at),
 CHECK(status IN ('CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
 INDEX ix_doctor_overlap(doctor_id,status,start_at,end_at),
 INDEX ix_patient_overlap(patient_id,status,start_at,end_at)
) ENGINE=InnoDB;
CREATE TABLE audit_event (
 id CHAR(36) PRIMARY KEY, actor_id CHAR(36), actor_type VARCHAR(16) NOT NULL,
 action VARCHAR(64) NOT NULL, resource_id VARCHAR(128) NOT NULL,
 result VARCHAR(16) NOT NULL, correlation_id CHAR(36) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(actor_id) REFERENCES user_account(id),
 INDEX ix_audit(resource_id,created_at)
) ENGINE=InnoDB;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_event FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit is append-only';
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_event FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit is append-only';
CREATE TABLE idempotency_record (
 actor_id CHAR(36) NOT NULL, operation VARCHAR(64) NOT NULL, request_key VARCHAR(128) NOT NULL,
 request_hash CHAR(64) NOT NULL, response_json JSON, expires_at DATETIME(6) NOT NULL,
 PRIMARY KEY(actor_id,operation,request_key), FOREIGN KEY(actor_id) REFERENCES user_account(id)
) ENGINE=InnoDB;
CREATE TABLE notification_job (
 id CHAR(36) PRIMARY KEY, appointment_id CHAR(36) NOT NULL, appointment_version INT NOT NULL,
 event_type VARCHAR(32) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
 attempts INT NOT NULL DEFAULT 0, due_at DATETIME(6) NOT NULL, lease_until DATETIME(6),
 lease_token CHAR(36), last_error VARCHAR(64),
 UNIQUE KEY uq_delivery(appointment_id,appointment_version,event_type),
 FOREIGN KEY(appointment_id) REFERENCES appointment(id),
 INDEX ix_delivery(status,due_at,lease_until)
) ENGINE=InnoDB;
