CREATE TABLE queue_ticket (
 id CHAR(36) PRIMARY KEY, appointment_id CHAR(36) NOT NULL UNIQUE,
 doctor_id CHAR(36) NOT NULL, queue_date DATE NOT NULL, position BIGINT NOT NULL,
 status VARCHAR(16) NOT NULL, version INT NOT NULL DEFAULT 0, skip_reason VARCHAR(1000),
 created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(appointment_id) REFERENCES appointment(id), FOREIGN KEY(doctor_id) REFERENCES doctor(id),
 UNIQUE KEY uq_queue_position(doctor_id,queue_date,position),
 CHECK(status IN ('WAITING','CALLED','IN_SERVICE','DONE'))
) ENGINE=InnoDB;
CREATE TABLE encounter (
 id CHAR(36) PRIMARY KEY, appointment_id CHAR(36) NOT NULL UNIQUE,
 status VARCHAR(16) NOT NULL DEFAULT 'IN_PROGRESS', started_at DATETIME(6) NOT NULL,
 completed_at DATETIME(6), FOREIGN KEY(appointment_id) REFERENCES appointment(id),
 CHECK(status IN ('IN_PROGRESS','COMPLETED'))
) ENGINE=InnoDB;
CREATE TABLE medical_record (
 id CHAR(36) PRIMARY KEY, encounter_id CHAR(36) NOT NULL, version INT NOT NULL,
 status VARCHAR(16) NOT NULL, content_encrypted MEDIUMBLOB NOT NULL,
 supersedes_id CHAR(36) UNIQUE, amendment_reason VARCHAR(1000), created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(encounter_id) REFERENCES encounter(id), FOREIGN KEY(supersedes_id) REFERENCES medical_record(id),
 UNIQUE KEY uq_record_version(encounter_id,version), CHECK(status IN ('DRAFT','FINAL'))
) ENGINE=InnoDB;
CREATE TRIGGER final_record_no_update BEFORE UPDATE ON medical_record FOR EACH ROW
BEGIN
 IF OLD.status = 'FINAL' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Final records are immutable'; END IF;
END;
CREATE TRIGGER record_no_delete BEFORE DELETE ON medical_record FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Medical records cannot be deleted';
CREATE TABLE prescription (
 id CHAR(36) PRIMARY KEY, encounter_id CHAR(36) NOT NULL, version INT NOT NULL DEFAULT 0,
 status VARCHAR(16) NOT NULL DEFAULT 'DRAFT', items_encrypted MEDIUMBLOB NOT NULL,
 created_at DATETIME(6) NOT NULL, issued_at DATETIME(6), FOREIGN KEY(encounter_id) REFERENCES encounter(id),
 CHECK(status IN ('DRAFT','ISSUED'))
) ENGINE=InnoDB;
CREATE TRIGGER issued_prescription_no_update BEFORE UPDATE ON prescription FOR EACH ROW
BEGIN
 IF OLD.status = 'ISSUED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Issued prescriptions are immutable'; END IF;
END;
CREATE TRIGGER prescription_no_delete BEFORE DELETE ON prescription FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Prescriptions cannot be deleted';
CREATE TABLE telehealth_session (
 id CHAR(36) PRIMARY KEY, appointment_id CHAR(36) NOT NULL UNIQUE,
 status VARCHAR(16) NOT NULL DEFAULT 'CREATED', version INT NOT NULL DEFAULT 0,
 patient_consented_at DATETIME(6), ended_at DATETIME(6),
 FOREIGN KEY(appointment_id) REFERENCES appointment(id),
 CHECK(status IN ('CREATED','WAITING','ACTIVE','RECONNECTING','ENDED','CANCELLED'))
) ENGINE=InnoDB;
CREATE TABLE telehealth_token (
 token_hash CHAR(64) PRIMARY KEY, session_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
 expires_at DATETIME(6) NOT NULL,
 FOREIGN KEY(session_id) REFERENCES telehealth_session(id), FOREIGN KEY(user_id) REFERENCES user_account(id),
 INDEX ix_token_expiry(expires_at)
) ENGINE=InnoDB;
CREATE TABLE telehealth_signal (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, session_id CHAR(36) NOT NULL,
 sender_id CHAR(36) NOT NULL, kind VARCHAR(16) NOT NULL, payload_encrypted MEDIUMBLOB NOT NULL,
 created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(session_id) REFERENCES telehealth_session(id), FOREIGN KEY(sender_id) REFERENCES user_account(id),
 CHECK(kind IN ('OFFER','ANSWER','ICE')), INDEX ix_session_signal(session_id,id)
) ENGINE=InnoDB;
ALTER TABLE audit_event ADD COLUMN actor_label VARCHAR(64);
CREATE INDEX ix_audit_time ON audit_event(created_at,id);
CREATE INDEX ix_audit_actor ON audit_event(actor_id,created_at);
