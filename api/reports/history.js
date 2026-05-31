const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dow + 1);
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    const { from, to, userId } = req.query;

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return json(res, 400, { error: 'Params from and to are required (YYYY-MM-DD).' });
    }

    if (userId && auth.role !== 'admin' && parseInt(userId, 10) !== auth.sub) {
      return json(res, 403, { error: 'Forbidden.' });
    }

    // Detect which optional columns exist
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('users','focus_tasks')
        AND column_name IN ('cargo','daily_points_goal','points')
    `);
    const cols = new Set(colCheck.rows.map(r => r.column_name));
    const hasCargo     = cols.has('cargo');
    const hasDailyGoal = cols.has('daily_points_goal');
    const hasPoints    = cols.has('points');

    const cargoSql     = hasCargo     ? `COALESCE(cargo,'')` : `''`;
    const dailyGoalSql = hasDailyGoal ? `COALESCE(daily_points_goal,26)` : `26`;
    const ptsSql       = hasPoints    ? `COALESCE(SUM(ft.points),0)::int` : `COUNT(ft.id)::int`;

    // Determine which users to include
    let usersResult;
    const userSelectCols = `id, name, ${cargoSql} AS cargo, ${dailyGoalSql} AS daily_points_goal`;
    if (userId) {
      usersResult = await db.query(
        `SELECT ${userSelectCols} FROM users WHERE id = $1 AND active = TRUE`,
        [parseInt(userId, 10)]
      );
    } else if (auth.role === 'admin') {
      usersResult = await db.query(
        `SELECT ${userSelectCols} FROM users WHERE active = TRUE ORDER BY name`
      );
    } else {
      usersResult = await db.query(
        `SELECT ${userSelectCols} FROM users WHERE id = $1`,
        [auth.sub]
      );
    }

    const users   = usersResult.rows;
    const userIds = users.map(u => u.id);
    if (!userIds.length) return json(res, 200, { weeks: [], users: [] });

    // Build week starts (Mondays)
    const firstMonday = mondayOf(from);
    const weeks = [];
    let cur = new Date(`${firstMonday}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    while (cur <= toDate) {
      weeks.push(cur.toISOString().slice(0, 10));
      cur = new Date(cur);
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
    if (!weeks.length) return json(res, 200, { weeks: [], users: [] });

    const todayStr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Points + tasks per user per week
    const ptsResult = await db.query(
      `WITH week_series AS (SELECT unnest($1::date[]) AS week_start),
       weeks AS (SELECT week_start, (week_start + INTERVAL '6 days')::date AS week_end FROM week_series),
       uw AS (SELECT u.id AS user_id, w.week_start, w.week_end
              FROM users u CROSS JOIN weeks w WHERE u.id = ANY($2::int[]))
       SELECT uw.week_start, uw.user_id,
         ${ptsSql} AS pts,
         COUNT(ft.id)::int AS tasks_done
       FROM uw
       LEFT JOIN focus_tasks ft ON ft.user_id = uw.user_id
         AND ft.is_done = TRUE
         AND ft.created_at::date >= uw.week_start AND ft.created_at::date <= uw.week_end
       GROUP BY uw.week_start, uw.user_id
       ORDER BY uw.week_start, uw.user_id`,
      [weeks, userIds]
    );

    // Hours per user per week
    const hoursResult = await db.query(
      `WITH week_series AS (SELECT unnest($1::date[]) AS week_start),
       weeks AS (SELECT week_start, (week_start + INTERVAL '6 days')::date AS week_end FROM week_series),
       uw AS (SELECT u.id AS user_id, w.week_start, w.week_end
              FROM users u CROSS JOIN weeks w WHERE u.id = ANY($2::int[]))
       SELECT uw.week_start, uw.user_id,
         COALESCE(SUM(te.hours),0)::float AS horas
       FROM uw
       LEFT JOIN time_entries te ON te.user_id = uw.user_id
         AND te.work_date >= uw.week_start AND te.work_date <= uw.week_end
       GROUP BY uw.week_start, uw.user_id
       ORDER BY uw.week_start, uw.user_id`,
      [weeks, userIds]
    );

    const ptsIndex = new Map();
    for (const r of ptsResult.rows) {
      const key = `${String(r.week_start).slice(0, 10)}_${r.user_id}`;
      ptsIndex.set(key, { pts: Number(r.pts), tasksDone: Number(r.tasks_done) });
    }
    const hoursIndex = new Map();
    for (const r of hoursResult.rows) {
      const key = `${String(r.week_start).slice(0, 10)}_${r.user_id}`;
      hoursIndex.set(key, Number(r.horas));
    }

    const usersWithWeeks = users.map(user => {
      const dailyGoal  = Number(user.daily_points_goal) || 26;
      const weeklyGoal = dailyGoal * 5;

      const weekData = weeks.map((weekStart, i) => {
        const weekEndObj = new Date(`${weekStart}T00:00:00Z`);
        weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
        const weekEnd = weekEndObj.toISOString().slice(0, 10);
        const isLive  = weekStart <= todayStr && todayStr <= weekEnd;

        const ptsKey  = `${weekStart}_${user.id}`;
        const ptsData = ptsIndex.get(ptsKey) || { pts: 0, tasksDone: 0 };
        const horas   = parseFloat((hoursIndex.get(ptsKey) || 0).toFixed(2));
        const pts     = ptsData.pts;
        const pct     = weeklyGoal > 0 ? Math.round((pts / weeklyGoal) * 100) : 0;
        const stars   = pct >= 100 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;

        return { weekIndex: i + 1, weekStart, weekEnd, isLive, pts, horas, pct, stars, tasksDone: ptsData.tasksDone };
      });

      return { id: user.id, name: user.name, cargo: user.cargo, dailyGoal, weeklyGoal, weeks: weekData };
    });

    const weekLabels = weeks.map((ws, i) => {
      const weekEndObj = new Date(`${ws}T00:00:00Z`);
      weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
      const wEnd   = weekEndObj.toISOString().slice(0, 10);
      const isLive = ws <= todayStr && todayStr <= wEnd;
      return { index: i + 1, weekStart: ws, weekEnd: wEnd, isLive };
    });

    return json(res, 200, { from, to, weeks: weekLabels, users: usersWithWeeks });
  } catch (err) {
    console.error('[history] unhandled error:', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
