-- Controla quem aparece na grade do Painel Daily (team view)
-- Maria Clara = ADM Master, não aparece no grid de colaboradores
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_daily BOOLEAN NOT NULL DEFAULT TRUE;

-- Maria Clara: apenas ADM, não aparece na grade do time
UPDATE users SET show_in_daily = FALSE WHERE name ILIKE 'maria%clara%';

-- Confirmar
SELECT id, name, role, show_in_daily FROM users ORDER BY id;
