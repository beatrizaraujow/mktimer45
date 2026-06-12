ALTER TABLE user_routines        ADD COLUMN IF NOT EXISTS observation TEXT;
ALTER TABLE routine_completions  ADD COLUMN IF NOT EXISTS reason TEXT;
