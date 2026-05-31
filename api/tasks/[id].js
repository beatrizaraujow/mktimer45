const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, ['PATCH']);
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const taskId = Number(rawId);

  if (!taskId || Number.isNaN(taskId)) {
    return json(res, 400, { error: 'Invalid task id.' });
  }

  const { isDone } = req.body || {};
  if (typeof isDone !== 'boolean') {
    return json(res, 400, { error: 'isDone must be a boolean.' });
  }

  const updated = await db.query(
    `
      UPDATE focus_tasks
      SET
        is_done = $3,
        completed_at = CASE WHEN $3 THEN NOW() ELSE NULL END
      WHERE id = $1
        AND user_id = $2
      RETURNING id, session_id, title, category, is_done, created_at, completed_at
    `,
    [taskId, auth.sub, isDone]
  );

  if (updated.rowCount === 0) {
    return json(res, 404, { error: 'Task not found.' });
  }

  return json(res, 200, {
    success: true,
    item: updated.rows[0],
  });
};
