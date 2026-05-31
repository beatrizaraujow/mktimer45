const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (req.method === 'GET') {
      const { from, to } = req.query;
      const hasRange =
        from && to &&
        /^\d{4}-\d{2}-\d{2}$/.test(from) &&
        /^\d{4}-\d{2}-\d{2}$/.test(to);

      let queryText = `SELECT id, session_id, title, category, description, points,
              start_date, end_date, is_done, created_at, completed_at
       FROM focus_tasks
       WHERE user_id = $1`;
      const params = [auth.sub];

      if (hasRange) {
        params.push(from, to);
        queryText += ` AND DATE(created_at) >= $${params.length - 1}
                       AND DATE(created_at) <= $${params.length}
                       ORDER BY created_at DESC LIMIT 200`;
      } else {
        queryText += ' ORDER BY created_at DESC LIMIT 40';
      }

      const tasks = await db.query(queryText, params);
      return json(res, 200, { items: tasks.rows });
    }

    if (req.method === 'POST') {
      const { title, category, description, points, startDate, endDate } = req.body || {};

      if (!title || !String(title).trim()) {
        return json(res, 400, { error: 'Task title is required.' });
      }

      const activeSession = await db.query(
        `SELECT id FROM focus_sessions WHERE user_id = $1 AND ended_at IS NULL
         ORDER BY started_at DESC LIMIT 1`,
        [auth.sub]
      );

      const pointsVal    = [1, 2, 3, 5, 8].includes(Number(points)) ? Number(points) : null;
      const startDateVal = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : null;
      const endDateVal   = endDate   && /^\d{4}-\d{2}-\d{2}$/.test(endDate)   ? endDate   : null;
      const descVal      = description ? String(description).trim().slice(0, 1000) || null : null;

      const created = await db.query(
        `INSERT INTO focus_tasks
           (user_id, session_id, title, category, description, points, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, session_id, title, category, description, points,
                   start_date, end_date, is_done, created_at, completed_at`,
        [
          auth.sub,
          activeSession.rowCount > 0 ? activeSession.rows[0].id : null,
          String(title).trim(),
          category ? String(category).trim() : null,
          descVal,
          pointsVal,
          startDateVal,
          endDateVal,
        ]
      );

      return json(res, 201, { success: true, item: created.rows[0] });
    }

    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    console.error('[tasks] error:', err.message);
    return json(res, 500, { error: err.message });
  }
};
