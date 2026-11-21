CREATE TABLE contact_otp (
  actor_id CHAR(36) PRIMARY KEY,
  email_hash CHAR(64) NOT NULL,
  otp_hash CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  sent_at DATETIME(6) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_contact_otp_actor FOREIGN KEY (actor_id) REFERENCES user_account(id)
);

CREATE INDEX ix_contact_otp_expires ON contact_otp(expires_at);
CREATE INDEX ix_contact_otp_email_sent ON contact_otp(email_hash, sent_at);

CREATE TABLE contact_otp_send_log (
  id CHAR(36) PRIMARY KEY,
  email_hash CHAR(64) NOT NULL,
  sent_at DATETIME(6) NOT NULL
);

CREATE INDEX ix_contact_otp_send_log_email_sent ON contact_otp_send_log(email_hash, sent_at);
