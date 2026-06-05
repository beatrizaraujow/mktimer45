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

    const [totalTasksRes, totalHoursRes, monthlyTasksRes, monthlyHoursRes, usersRes, companyTasksRes, companyHoursRes, userBreakdownRes] =
      await Promise.all([
        db.query(
          `SELECT COUNT(*)::int AS total_done,
                  ${ptsSumSql} AS total_points
           FROM focus_tasks
           WHERE is_done = TRUE
             AND completed_at IS NOT NULL
             AND DATE(completed_at) >= $1 AND DATE(completed_at) <= $2 ${userFilterTasks}`,
          totalParams
        ),
        db.query(
          `SELECT COALESCE(SUM(te.hours), 0)::float AS total_hours
           FROM time_entries te
           WHERE te.work_date >= $1 AND te.work_date <= $2 ${userFilterTime}`,
          timeParams
        ),
        db.query(
          `SELECT TO_CHAR(DATE(completed_at), 'YYYY-MM') AS month,
                  COUNT(*)::int AS task_count,
                  COUNT(*)::int AS done_count,
                  ${ptsSumSql} AS total_points
           FROM focus_tasks
           WHERE is_done = TRUE
             AND completed_at IS NOT NULL
             AND DATE(completed_at) >= $1 AND DATE(completed_at) <= $2 ${userFilterTasks}
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
        // Tasks por empresa (categoria)
        db.query(
          `SELECT COALESCE(NULLIF(TRIM(category),''), 'Sem categoria') AS company,
                  COUNT(*)::int AS task_count,
                  COUNT(*)::int AS done_count,
                  ${ptsSumSql} AS total_points
           FROM focus_tasks
           WHERE is_done = TRUE
             AND completed_at IS NOT NULL
             AND DATE(completed_at) >= $1 AND DATE(completed_at) <= $2 ${userFilterTasks}
           GROUP BY 1 ORDER BY done_count DESC, task_count DESC`,
          totalParams
        ),
        // Horas por empresa (time_entries)
        db.query(
          `SELECT c.name AS company,
                  COALESCE(SUM(te.hours), 0)::float AS total_hours
           FROM time_entries te
           JOIN companies c ON c.id = te.company_id
           WHERE te.work_date >= $1 AND te.work_date <= $2 ${userFilterTime}
           GROUP BY 1 ORDER BY total_hours DESC`,
          timeParams
        ),
        // Breakdown por colaborador (sem filtro de usuário — visão completa da equipe)
        db.query(
          `SELECT u.id, u.name,
                  COALESCE(t.task_count, 0)::int   AS task_count,
                  COALESCE(t.done_count, 0)::int   AS done_count,
                  COALESCE(t.total_points, 0)::int AS total_points,
                  ROUND(COALESCE(h.total_hours, 0)::numeric, 1)::float AS total_hours
           FROM users u
           LEFT JOIN (
             SELECT user_id,
                    COUNT(*)::int AS task_count,
                    COUNT(*)::int AS done_count,
                    ${ptsSumSql} AS total_points
             FROM focus_tasks
             WHERE is_done = TRUE
               AND completed_at IS NOT NULL
               AND DATE(completed_at) >= $1 AND DATE(completed_at) <= $2
             GROUP BY user_id
           ) t ON t.user_id = u.id
           LEFT JOIN (
             SELECT user_id, COALESCE(SUM(hours), 0)::float AS total_hours
             FROM time_entries
             WHERE work_date >= $1 AND work_date <= $2
             GROUP BY user_id
           ) h ON h.user_id = u.id
           WHERE u.active = TRUE
           ORDER BY COALESCE(t.total_points, 0) DESC, COALESCE(t.done_count, 0) DESC`,
          [from, to]
        ),
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

    // Merge tasks + hours por empresa
    const compHoursMap = {};
    companyHoursRes.rows.forEach(r => { compHoursMap[r.company] = Number(r.total_hours); });
    const allCompanies = new Set([
      ...companyTasksRes.rows.map(r => r.company),
      ...Object.keys(compHoursMap),
    ]);
    const companyBreakdown = [...allCompanies].map(company => {
      const t = companyTasksRes.rows.find(r => r.company === company) || {};
      return {
        company,
        taskCount:   t.task_count   || 0,
        doneCount:   t.done_count   || 0,
        totalPoints: t.total_points || 0,
        totalHours:  Math.round((compHoursMap[company] || 0) * 10) / 10,
      };
    }).sort((a, b) => b.doneCount - a.doneCount || b.totalHours - a.totalHours);

    const userBreakdown = userBreakdownRes.rows.map(r => ({
      id:          r.id,
      name:        r.name,
      taskCount:   r.task_count,
      doneCount:   r.done_count,
      totalPoints: r.total_points,
      totalHours:  Number(r.total_hours),
    }));

    return json(res, 200, {
      stats: {
        totalDone:   s.total_done   || 0,
        totalPoints: s.total_points || 0,
        totalHours:  Math.round(totalHours * 100) / 100,
      },
      monthlyBreakdown,
      months,
      users: usersRes.rows,
      companyBreakdown,
      userBreakdown,
      clickupListId: (process.env.CLICKUP_LIST_ID || '').trim() || null,
    });
  } catch (err) {
    console.error('[adm] unhandled error:', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
