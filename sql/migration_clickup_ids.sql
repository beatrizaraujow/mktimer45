-- ════════════════════════════════════════════════════════════════
-- Vínculo ClickUp ↔ Usuários do sistema MKT Hub
-- IDs obtidos via API em 03/06/2026 · Workspace: Quatro5 (9013450208)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS clickup_user_id BIGINT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clickup_email   TEXT   DEFAULT NULL;

-- ─── VINCULAR IDs + EMAILS + ATUALIZAR NOMES COMPLETOS ────────────────────────

UPDATE users SET
  clickup_user_id = 118022060,
  clickup_email   = 'samuel.melo@grupoquatro5.com',
  name            = 'Samuel Melo'
WHERE name ILIKE '%samuel%';

UPDATE users SET
  clickup_user_id = 112066337,
  clickup_email   = 'thiago.nascimento@grupoquatro5.com',
  name            = 'Thiago Nascimento'
WHERE name ILIKE '%thiago%';

UPDATE users SET
  clickup_user_id = 112066326,
  clickup_email   = 'klenio.braz@grupoquatro5.com',
  name            = 'Klenio Braz'
WHERE name ILIKE '%klenio%';

UPDATE users SET
  clickup_user_id = 112066340,
  clickup_email   = 'zion.bagatoli@grupoquatro5.com',
  name            = 'Zion Bagatoli'
WHERE name ILIKE '%zion%';

UPDATE users SET
  clickup_user_id = 118021921,
  clickup_email   = 'marialuiza.mariz@grupoquatro5.com',
  name            = 'Maria Luiza Mariz'
WHERE name ILIKE '%malu%' OR name ILIKE '%maria luiza%';

UPDATE users SET
  clickup_user_id = 112066305,
  clickup_email   = 'anny.beatriz@grupoquatro5.com',
  name            = 'Anny Beatriz'
WHERE name ILIKE '%bia%' OR name ILIKE '%anny%';

UPDATE users SET
  clickup_user_id = 87919167,
  clickup_email   = 'mariaclara@seubone.com',
  name            = 'Maria Clara Carvalho'
WHERE name ILIKE '%maria%clara%';

-- ─── GUSTAVO — novo membro (inserir se não existir) ──────────────────────────
-- Verifica se já existe antes de inserir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE name ILIKE '%gustavo%') THEN
    INSERT INTO users (name, password_hash, role, must_change_password, active, cargo, daily_points_goal, clickup_user_id, clickup_email, show_in_daily)
    VALUES (
      'Gustavo Leite',
      -- Senha temporária: gustavo@123 (deve ser trocada no 1º login)
      crypt('gustavo@123', gen_salt('bf')),
      'member',
      TRUE,
      TRUE,
      'Criativo',   -- ajustar conforme cargo real
      16,           -- meta diária — ajustar conforme necessário
      112066317,
      'gustavo.leite@grupoquatro5.com',
      TRUE
    );
    RAISE NOTICE 'Gustavo Leite criado com sucesso.';
  ELSE
    -- Se já existe, só atualiza o vínculo ClickUp
    UPDATE users SET
      clickup_user_id = 112066317,
      clickup_email   = 'gustavo.leite@grupoquatro5.com',
      name            = 'Gustavo Leite'
    WHERE name ILIKE '%gustavo%';
    RAISE NOTICE 'Gustavo já existia — vínculo ClickUp atualizado.';
  END IF;
END $$;

-- ─── CONFIRMAR RESULTADO ─────────────────────────────────────────────────────
SELECT id, name, role, cargo, daily_points_goal, clickup_user_id, clickup_email, show_in_daily
FROM users
WHERE active = TRUE
ORDER BY name;
