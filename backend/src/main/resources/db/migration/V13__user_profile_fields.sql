ALTER TABLE user_account
  ADD COLUMN birth_date DATE NULL AFTER phone_hash,
  ADD COLUMN hometown_encrypted BLOB NULL AFTER birth_date,
  ADD COLUMN permanent_address_encrypted BLOB NULL AFTER hometown_encrypted,
  ADD COLUMN personal_info_updated_at DATETIME(6) NULL AFTER permanent_address_encrypted;
