ALTER TABLE user_account ADD COLUMN staff BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE user_account u
SET staff = TRUE
WHERE EXISTS (SELECT 1 FROM user_role r WHERE r.user_id = u.id AND r.role <> 'PATIENT')
   OR EXISTS (SELECT 1 FROM doctor d WHERE d.user_id = u.id);
