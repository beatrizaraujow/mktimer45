-- Daily Gate: respostas do standup matinal
-- Rodar uma vez no banco antes de ativar a feature.
CREATE TABLE IF NOT EXISTS daily_responses (
  id            SERIAL PRIMARY KEY,
  user_id       INT  NOT NULL REFERENCES users(id),
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answers       JSONB NOT NULL DEFAULT '{}',
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, response_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_responses_date ON daily_responses (response_date);
