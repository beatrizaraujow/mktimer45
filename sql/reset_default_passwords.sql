UPDATE users
SET
  password_hash = crypt('123456', gen_salt('bf')),
  must_change_password = TRUE,
  updated_at = NOW()
WHERE active = TRUE;
