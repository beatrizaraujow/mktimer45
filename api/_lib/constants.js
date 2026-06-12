'use strict';

// ── Status brutos do ClickUp (normalizado para lowercase) ──────────────────
const CONCLUDED_STATUSES = new Set([
  'aprovar', 'publicar', 'banco de criativos',
  'concluído', 'concluido', 'done', 'closed', 'finalizado',
]);

const IN_PROGRESS_STATUSES = new Set([
  'em andamento', 'em progresso', 'pendente', 'aberto',
]);

const ALTERATION_STATUSES = new Set([
  'alteração', 'alteracao', 'revisão', 'revisao',
]);

// ── Categorias internas (retornadas por cuTaskStatusCat / campo statusCat) ──
const STATUS_CAT = {
  DONE:     'done',
  REVISION: 'revision',
  APPROVAL: 'approval',
  PUBLISH:  'publish',
  DOING:    'doing',
  TODO:     'todo',
};

// ── Status de conclusão de rotinas (coluna routine_completions.status) ──────
const ROUTINE_STATUS = {
  DONE:        'done',
  SKIP:        'skip',
  IN_PROGRESS: 'in-progress',
};

// ── Status de snapshots semanais (coluna week_snapshots.status) ─────────────
const SNAPSHOT_STATUS = {
  FECHADO:  'FECHADO',
  PENDENTE: 'PENDENTE_VALIDACAO',
};

/** Normaliza um status bruto: lowercase + trim. Nunca comparar string crua. */
function normalizeStatus(status) {
  return (status || '').toLowerCase().trim();
}

module.exports = {
  CONCLUDED_STATUSES,
  IN_PROGRESS_STATUSES,
  ALTERATION_STATUSES,
  STATUS_CAT,
  ROUTINE_STATUS,
  SNAPSHOT_STATUS,
  normalizeStatus,
};
