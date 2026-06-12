CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_routines (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  company TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  applies_days INT[] DEFAULT NULL,
  points SMALLINT NOT NULL DEFAULT 1 CHECK (points IN (1,2,3,5,8)),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_routines ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE user_routines ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE user_routines ADD COLUMN IF NOT EXISTS applies_days INT[] DEFAULT NULL;

CREATE TABLE IF NOT EXISTS routine_completions (
  id SERIAL PRIMARY KEY,
  routine_id INT NOT NULL REFERENCES user_routines(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'skip')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(routine_id, completed_date)
);

ALTER TABLE routine_completions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done';

CREATE INDEX IF NOT EXISTS idx_user_routines_user ON user_routines(user_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date ON routine_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_routine_completions_date ON routine_completions(completed_date);
