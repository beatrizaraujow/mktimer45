-- Migration: week_snapshots — fechamento semanal com validação de coins
-- §7 SBHub Regras Técnicas. Rodar uma vez no banco de produção.

-- ADMIN_MASTER: coluna que distingue Maria Clara das demais admins (§8)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET is_master = TRUE WHERE LOWER(name) = 'maria clara';

-- Snapshots de semana — um registro por semana ISO
CREATE TABLE IF NOT EXISTS week_snapshots (
  id                  BIGSERIAL    PRIMARY KEY,
  semana_id           TEXT         NOT NULL,          -- ex: "2026-W23"
  week_start          DATE         NOT NULL,
  week_end            DATE         NOT NULL,
  status              TEXT         NOT NULL DEFAULT 'PENDENTE_VALIDACAO'
                                   CHECK (status IN ('PENDENTE_VALIDACAO', 'FECHADO')),
  calculado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  validado_em         TIMESTAMPTZ,
  validado_por        TEXT,
  editado_por_admin   BOOLEAN      NOT NULL DEFAULT FALSE,
  historico_edicoes   JSONB        NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (semana_id)
);

-- Entradas por colaborador dentro de um snapshot
CREATE TABLE IF NOT EXISTS snapshot_entries (
  id                      BIGSERIAL    PRIMARY KEY,
  snapshot_id             BIGINT       NOT NULL REFERENCES week_snapshots(id) ON DELETE CASCADE,
  user_id                 INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semana_id               TEXT         NOT NULL,
  nome                    TEXT         NOT NULL DEFAULT '',
  cargo                   TEXT         NOT NULL DEFAULT '',
  pontos                  INT          NOT NULL DEFAULT 0,
  meta_100                INT          NOT NULL DEFAULT 0,
  meta_120                INT          NOT NULL DEFAULT 0,
  percentual_meta         NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_validadas_total   NUMERIC(6,2) NOT NULL DEFAULT 0,
  horas_por_empresa       JSONB        NOT NULL DEFAULT '{}',
  tasks_concluidas        INT          NOT NULL DEFAULT 0,
  coeficiente             NUMERIC(5,2) NOT NULL DEFAULT 0,
  posicao_ranking         INT          NOT NULL DEFAULT 0,
  coins_sugeridas_meta    SMALLINT     NOT NULL DEFAULT 0,
  coins_sugeridas_ranking SMALLINT     NOT NULL DEFAULT 0,
  coins_sugeridas_total   SMALLINT     NOT NULL DEFAULT 0,
  coins_validadas         SMALLINT,    -- NULL = ainda não validado por Maria Clara
  coins_acumuladas        INT          NOT NULL DEFAULT 0,
  observacao_admin        TEXT         NOT NULL DEFAULT '',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_week_snapshots_semana  ON week_snapshots(semana_id);
CREATE INDEX IF NOT EXISTS idx_week_snapshots_status  ON week_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_snapshot_entries_snap  ON snapshot_entries(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_entries_user  ON snapshot_entries(user_id, semana_id);
