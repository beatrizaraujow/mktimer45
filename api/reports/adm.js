const db = require('../_lib/db');
const { requireAuth, requireAdmin } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

module.exports = async function handler(req, res) {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    // Verifica role no banco (JWT pode estar desatualizado após promoção)
    const roleRes = await db.query(
      'SELECT role FROM users WHERE id = $1 AND active = TRUE',
      [auth.sub]
    );
    const dbRole = roleRes.rows[0]?.role;
    if (dbRole !== 'admin') {
      return json(res, 403, { error: 'Acesso restrito a administradores.' });
    }

    const { from: fromRaw, to: toRaw, fromMonth, toMonth, userId } = req.query;

    let from, to;
    if (fromMonth && toMonth && /^\d{4}-\d{2}$/.test(fromMonth) && /^\d{4}-\d{2}$/.test(toMonth)) {
      from = `${fromMonth}-01`;
      const toEnd = new Date(`${toMonth}-01T00:00:00Z`);
      toEnd.setUTCMonth(toEnd.getUTCMonth() + 1);
      toEnd.setUTCDate(0);
      to = toEnd.toISOString().slice(0, 10);
    } else if (fromRaw && toRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) && /^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
      from = fromRaw;
      to = toRaw;
    } else {
      return json(res, 400, { error: 'Forneça from/to (YYYY-MM-DD) ou fromMonth/toMonth (YYYY-MM).' });
    }

    // Detect optional columns
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'focus_tasks'
        AND column_name = 'points'
    `);
    const hasPoints = colCheck.rows.length > 0;
    const ptsSumSql = hasPoints
      ? `COALESCE(SUM(CASE WHEN is_done THEN COALESCE(points,0) ELSE 0 END), 0)::int`
      : `SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int`;

    const uid = userId ? parseInt(userId, 10) : null;

    const totalParams = [from, to];
    let userFilterTasks = '';
    if (uid) { totalParams.push(uid); userFilterTasks = ` AND user_id = $${totalParams.length}`; }

    const timeParams = [from, to];
    let userFilterTime = '';
    if (uid) { timeParams.push(uid); userFilterTime = ` AND te.user_id = $${timeParams.length}`; }

    const [totalTasksRes, totalHoursRes, monthlyTasksRes, monthlyHoursRes, usersRes] =
      await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS total_tasks,
                  SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS total_done,
                  ${ptsSumSql} AS total_points
           FROM focus_tasks
           WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2 ${userFilterTasks}`,
          totalParams
        ),
        db.query(
          `SELECT COALESCE(SUM(te.hours), 0)::float AS total_hours
           FROM time_entries te
           WHERE te.work_date >= $1 AND te.work_date <= $2 ${userFilterTime}`,
          timeParams
        ),
        db.query(
          `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM') AS month,
                  COUNT(*)::int AS task_count,
                  SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_count,
                  ${ptsSumSql} AS total_points
           FROM focus_tasks
           WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2 ${userFilterTasks}
           GROUP BY 1 ORDER BY 1`,
          totalParams
        ),
        db.query(
          `SELECT TO_CHAR(te.work_date, 'YYYY-MM') AS month,
                  COALESCE(SUM(te.hours), 0)::float AS total_hours
           FROM time_entries te
           WHERE te.work_date >= $1 AND te.work_date <= $2 ${userFilterTime}
           GROUP BY 1 ORDER BY 1`,
          timeParams
        ),
        db.query(`SELECT id, name FROM users WHERE active = TRUE ORDER BY name`),
      ]);

    const tasksMap = {};
    monthlyTasksRes.rows.forEach(r => { tasksMap[r.month] = r; });
    const hoursMap = {};
    monthlyHoursRes.rows.forEach(r => { hoursMap[r.month] = Number(r.total_hours); });

    const allYMs = new Set([
      ...monthlyTasksRes.rows.map(r => r.month),
      ...monthlyHoursRes.rows.map(r => r.month),
    ]);
    const cur = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
    const endDate = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
    while (cur <= endDate) { allYMs.add(cur.toISOString().slice(0, 7)); cur.setUTCMonth(cur.getUTCMonth() + 1); }

    const sortedYMs = [...allYMs].sort();

    const monthlyBreakdown = sortedYMs.map(month => ({
      month,
      task_count:   tasksMap[month]?.task_count   || 0,
      done_count:   tasksMap[month]?.done_count   || 0,
      total_points: tasksMap[month]?.total_points || 0,
      total_hours:  Math.round((hoursMap[month] || 0) * 100) / 100,
    }));

    const months = sortedYMs.map(ym => ({
      ym,
      label:     monthLabel(ym),
      tasksDone: tasksMap[ym]?.done_count   || 0,
      pts:       tasksMap[ym]?.total_points || 0,
      horas:     Math.round((hoursMap[ym] || 0) * 10) / 10,
    }));

    const s = totalTasksRes.rows[0] || {};
    const totalHours = Number(totalHoursRes.rows[0]?.total_hours || 0);

    return json(res, 200, {
      stats: {
        totalTasks:  s.total_tasks  || 0,
        totalDone:   s.total_done   || 0,
        totalPoints: s.total_points || 0,
        totalHours:  Math.round(totalHours * 100) / 100,
      },
      monthlyBreakdown,
      months,
      users: usersRes.rows,
    });
  } catch (err) {
    console.error('[adm] unhandled error:', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
