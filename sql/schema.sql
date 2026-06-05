CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS focus_goal_minutes INT NOT NULL DEFAULT 360;

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS time_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE IF NOT EXISTS focus_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id BIGINT REFERENCES focus_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

INSERT INTO companies (name)
VALUES
  ('SeuBoné'),
  ('Onevo'),
  ('Carbone Educação')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (name, password_hash, role, must_change_password)
VALUES
  ('samuel',      crypt('123456', gen_salt('bf')), 'member', TRUE),
  ('malu',        crypt('123456', gen_salt('bf')), 'member', TRUE),
  ('zion',        crypt('123456', gen_salt('bf')), 'member', TRUE),
  ('klenio',      crypt('123456', gen_salt('bf')), 'member', TRUE),
  ('thiago',      crypt('123456', gen_salt('bf')), 'member', TRUE),
  ('maria clara', crypt('123456', gen_salt('bf')), 'admin',  TRUE),
  ('bia',         crypt('123456', gen_salt('bf')), 'admin',  TRUE)
ON CONFLICT (name) DO UPDATE
  SET password_hash        = EXCLUDED.password_hash,
      must_change_password = TRUE,
      updated_at           = NOW()
  WHERE users.name != 'bia';

CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON focus_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_active ON focus_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_focus_tasks_user_created ON focus_tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_focus_tasks_session_id ON focus_tasks(session_id);

ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS points SMALLINT CHECK (points IN (1,2,3,5,8));
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS end_date DATE;

-- Status do ClickUp + ID para UPSERT + updated_at para rastrear mudanças de status
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS clickup_task_id TEXT;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS status_cat TEXT;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE focus_tasks SET updated_at = created_at WHERE updated_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_tasks_cu_task_user
  ON focus_tasks(user_id, clickup_task_id)
  WHERE clickup_task_id IS NOT NULL;
