-- F1.7 — Sistema de SB Coins: tabela, atribuição automática e acúmulo
-- Rodar uma vez no banco de produção.

CREATE TABLE IF NOT EXISTS sb_coins (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start   DATE      NOT NULL,
  coins_earned SMALLINT  NOT NULL DEFAULT 0 CHECK (coins_earned BETWEEN 0 AND 6),
  pts_earned   INT       NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_sb_coins_user_week ON sb_coins(user_id, week_start);

-- v2: atualiza constraint para escala 0–6 (caso a tabela já exista com CHECK 0–4)
ALTER TABLE sb_coins DROP CONSTRAINT IF EXISTS sb_coins_coins_earned_check;
ALTER TABLE sb_coins ADD CONSTRAINT sb_coins_coins_earned_check
  CHECK (coins_earned BETWEEN 0 AND 6);

-- v2: ledger de transações (crédito semanal, ajuste manual, gasto)
CREATE TABLE IF NOT EXISTS sb_coin_ledger (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start  DATE,
  amount      INT          NOT NULL,
  type        TEXT         NOT NULL
                           CHECK (type IN ('weekly_earn', 'spend', 'admin_adjust')),
  description TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Garante que cada semana seja creditada no máximo uma vez por usuário
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_weekly
  ON sb_coin_ledger(user_id, week_start) WHERE type = 'weekly_earn';

CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON sb_coin_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_week    ON sb_coin_ledger(week_start);
