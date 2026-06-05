-- Migração: suporte a status_cat (approval/revision) para scoring de ranking
-- Executar uma vez no Neon antes do próximo deploy

ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS clickup_task_id TEXT;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS status_cat TEXT;
ALTER TABLE focus_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Preenche updated_at dos registros antigos com created_at
UPDATE focus_tasks SET updated_at = created_at WHERE updated_at IS NULL;

-- Índice único para UPSERT por clickup_task_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_tasks_cu_task_user
  ON focus_tasks(user_id, clickup_task_id)
  WHERE clickup_task_id IS NOT NULL;
