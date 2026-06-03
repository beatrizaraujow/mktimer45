const db = require('../_lib/db');
const { requireAuth, requireAdmin } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  // Verifica role no banco (JWT pode estar desatualizado)
  const roleRes = await db.query(
    'SELECT role FROM users WHERE id = $1 AND active = TRUE', [auth.sub]
  );
  const isAdmin = roleRes.rows[0]?.role === 'admin';

  if (req.method === 'GET') {
    if (!isAdmin) return json(res, 403, { error: 'Forbidden.' });
    const result = await db.query(
      `SELECT id, name, role, COALESCE(cargo,'') AS cargo, COALESCE(daily_points_goal,26) AS daily_points_goal, active
       FROM users WHERE active = TRUE ORDER BY name`
    );
    return json(res, 200, { users: result.rows });
  }

  if (req.method === 'PATCH') {
    if (!isAdmin) return json(res, 403, { error: 'Forbidden.' });
    const body = req.body || {};
    const { id, cargo, dailyPointsGoal, clickupEmail, clickupUserId } = body;
    if (!id) return json(res, 400, { error: 'User id required.' });

    const sets = [];
    const params = [];
    if (cargo !== undefined)          { params.push(cargo);          sets.push(`cargo = $${params.length}`); }
    if (dailyPointsGoal !== undefined) { params.push(dailyPointsGoal); sets.push(`daily_points_goal = $${params.length}`); }
    if (clickupEmail !== undefined)   { params.push(clickupEmail || null); sets.push(`clickup_email = $${params.length}`); }
    if (clickupUserId !== undefined)  { params.push(clickupUserId ? Number(clickupUserId) : null); sets.push(`clickup_user_id = $${params.length}`); }
    if (!sets.length) return json(res, 400, { error: 'Nothing to update.' });

    params.push(id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    return json(res, 200, { success: true });
  }

  return methodNotAllowed(res, ['GET', 'PATCH']);
};
