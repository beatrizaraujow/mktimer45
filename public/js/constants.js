// Categorias internas de task (campo statusCat retornado pela API)
const STATUS_CAT = {
  DONE:     'done',
  REVISION: 'revision',
  APPROVAL: 'approval',
  PUBLISH:  'publish',
  DOING:    'doing',
  TODO:     'todo',
};

// Status de conclusão de rotinas (coluna routine_completions.status)
const ROUTINE_STATUS = {
  DONE:        'done',
  SKIP:        'skip',
  IN_PROGRESS: 'in-progress',
};

// Status de snapshots semanais (coluna week_snapshots.status)
const SNAPSHOT_STATUS = {
  FECHADO:  'FECHADO',
  PENDENTE: 'PENDENTE_VALIDACAO',
};

/** Normaliza status bruto: lowercase + trim. */
function normalizeStatus(status) {
  return (status || '').toLowerCase().trim();
}
