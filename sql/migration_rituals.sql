-- Rituais do Time
-- Run once on the database to enable the Rituais panel.

CREATE TABLE IF NOT EXISTS team_rituals (
  id           SERIAL PRIMARY KEY,
  title        TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'daily', -- daily | weekly | monthly
  description  TEXT,
  day_of_week  INT,          -- 1=Mon..7=Sun (used by weekly type)
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ritual_occurrences (
  id              SERIAL PRIMARY KEY,
  ritual_id       INT         NOT NULL REFERENCES team_rituals(id) ON DELETE CASCADE,
  occurrence_date DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending | done | cancelled
  notes           TEXT,
  UNIQUE(ritual_id, occurrence_date)
);

CREATE TABLE IF NOT EXISTS ritual_attendance (
  id            SERIAL PRIMARY KEY,
  occurrence_id INT     NOT NULL REFERENCES ritual_occurrences(id) ON DELETE CASCADE,
  user_id       INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(occurrence_id, user_id)
);

-- Default rituals (skip if already exist)
INSERT INTO team_rituals (title, type, description, day_of_week, sort_order)
VALUES
  ('Daily Standup',       'daily',   'Alinhamento rápido do time',        NULL, 1),
  ('Alinhamento Semanal', 'weekly',  'Reunião semanal de alinhamento',    2,    2),
  ('Review Mensal',       'monthly', 'Review mensal de performance',      NULL, 3)
ON CONFLICT DO NOTHING;
