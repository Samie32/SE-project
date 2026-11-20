ALTER TABLE user_account
  ADD COLUMN email_hash CHAR(64) NULL AFTER email_encrypted,
  ADD COLUMN phone_encrypted BLOB NULL AFTER email_hash,
  ADD COLUMN phone_hash CHAR(64) NULL AFTER phone_encrypted;

CREATE INDEX ix_user_account_email_hash ON user_account(email_hash);
CREATE INDEX ix_user_account_phone_hash ON user_account(phone_hash);
