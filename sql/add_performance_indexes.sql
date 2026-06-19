-- Índices de performance — queries de período, rotinas e tasks concluídas
-- Executar uma vez no banco de produção (Supabase SQL editor)

-- focus_tasks: buscas por período com completed_at (histórico, ADM, team-daily)
CREATE INDEX IF NOT EXISTS idx_focus_tasks_user_completed_at
  ON focus_tasks(user_id, completed_at)
  WHERE completed_at IS NOT NULL;

-- focus_tasks: filtros de tasks concluídas (COUNT/SUM em histórico e ADM)
CREATE INDEX IF NOT EXISTS idx_focus_tasks_done_completed
  ON focus_tasks(is_done, completed_at)
  WHERE is_done = TRUE;

-- focus_tasks: filtros por status_cat usados no team-daily e ranking
CREATE INDEX IF NOT EXISTS idx_focus_tasks_user_status_cat
  ON focus_tasks(user_id, status_cat)
  WHERE status_cat IN ('approval', 'publish', 'revision', 'todo', 'doing');

-- routine_completions: já existe via migration_routines.sql, mas garante caso não exista
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date
  ON routine_completions(user_id, completed_date);

CREATE INDEX IF NOT EXISTS idx_routine_completions_routine_date
  ON routine_completions(routine_id, completed_date);
