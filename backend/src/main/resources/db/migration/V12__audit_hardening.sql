CREATE INDEX ix_audit_time_desc ON audit_event(created_at DESC, id DESC);
CREATE INDEX ix_audit_result_time ON audit_event(result, created_at DESC, id DESC);
CREATE INDEX ix_audit_action_time ON audit_event(action, created_at DESC, id DESC);
CREATE INDEX ix_audit_actor_type_time ON audit_event(actor_type, created_at DESC, id DESC);
CREATE INDEX ix_audit_correlation ON audit_event(correlation_id, created_at DESC);

ALTER TABLE audit_event
 ADD COLUMN chain_seq BIGINT NULL,
 ADD COLUMN prev_hash CHAR(64) NULL,
 ADD COLUMN event_hash CHAR(64) NULL,
 ADD UNIQUE KEY uq_audit_chain_seq(chain_seq);

CREATE TABLE audit_chain_head (
 id TINYINT PRIMARY KEY,
 last_seq BIGINT NOT NULL DEFAULT 0,
 last_hash CHAR(64) NOT NULL,
 updated_at DATETIME(6) NOT NULL,
 CHECK (id = 1),
 CHECK (last_seq >= 0)
) ENGINE=InnoDB;

INSERT INTO audit_chain_head(id, last_seq, last_hash, updated_at)
VALUES (1, 0, REPEAT('0', 64), UTC_TIMESTAMP(6));

CREATE TABLE audit_archive_batch (
 id CHAR(36) PRIMARY KEY,
 from_created_at DATETIME(6) NOT NULL,
 to_created_at DATETIME(6) NOT NULL,
 event_count INT NOT NULL,
 first_chain_seq BIGINT NULL,
 last_chain_seq BIGINT NULL,
 batch_hash CHAR(64) NOT NULL,
 retention_days INT NOT NULL,
 created_by CHAR(36) NULL,
 created_at DATETIME(6) NOT NULL,
 notes VARCHAR(500) NULL,
 FOREIGN KEY(created_by) REFERENCES user_account(id),
 INDEX ix_audit_archive_created(created_at DESC, id)
) ENGINE=InnoDB;

CREATE TRIGGER audit_archive_no_update BEFORE UPDATE ON audit_archive_batch FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit archive batches are immutable';
CREATE TRIGGER audit_archive_no_delete BEFORE DELETE ON audit_archive_batch FOR EACH ROW
 SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit archive batches are immutable';
