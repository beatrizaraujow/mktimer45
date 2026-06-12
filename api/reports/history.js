const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

// Computa pontos esperados de rotinas num intervalo de 7 dias (weekStart..weekStart+6)
function computeExpectedRoutinePts(routines, weekStart) {
  let total = 0;
  const ws = new Date(`${weekStart}T00:00:00Z`);
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  for (const r of routines) {
    const pts    = Number(r.points) || 1;
    const days   = Array.isArray(r.applies_days) ? r.applies_days : [];
    const freq   = r.frequency || 'daily';
    for (let d = new Date(ws); d <= we; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay() || 7; // 1=Seg..7=Dom
      const dom = d.getUTCDate();
      let applies = false;
      if (freq === 'daily')        applies = !days.length || days.includes(dow);
      else if (freq === 'weekly')  applies = !days.length || days.includes(dow);
      else if (freq === 'monthly') applies = !days.length || days.includes(dom);
      if (applies) total += pts;
    }
  }
  return total;
}

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
        AND column_name IN ('cargo','daily_points_goal','weekly_pts_120','points')
    `);
    const cols = new Set(colCheck.rows.map(r => r.column_name));
    const hasCargo      = cols.has('cargo');
    const hasDailyGoal  = cols.has('daily_points_goal');
    const hasWeekly120  = cols.has('weekly_pts_120');
    const hasPoints     = cols.has('points');

    const cargoSql      = hasCargo     ? `COALESCE(cargo,'')` : `''`;
    const dailyGoalSql  = hasDailyGoal ? `COALESCE(daily_points_goal,26)` : `26`;
    const weekly120Sql  = hasWeekly120
      ? `COALESCE(weekly_pts_120, ROUND(${dailyGoalSql}*5*1.2))`
      : `ROUND(${dailyGoalSql}*5*1.2)`;
    const ptsSql        = hasPoints    ? `COALESCE(SUM(ft.points),0)::int` : `COUNT(ft.id)::int`;

    // Determine which users to include
    let usersResult;
    const userSelectCols = `id, name, ${cargoSql} AS cargo, ${dailyGoalSql} AS daily_points_goal, ${weekly120Sql} AS weekly_pts_120`;
    if (userId) {
      usersResult = await db.query(
        `SELECT ${userSelectCols} FROM users WHERE id = $1 AND active = TRUE`,
        [parseInt(userId, 10)]
      );
    } else if (auth.role === 'admin') {
      usersResult = await db.query(
        `SELECT ${userSelectCols} FROM users WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE ORDER BY name`
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
         AND COALESCE(ft.completed_at, ft.created_at)::date >= uw.week_start
         AND COALESCE(ft.completed_at, ft.created_at)::date <= uw.week_end
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

    // Usuários cujas metas são calculadas a partir das rotinas (daily_points_goal = 0)
    const routineBasedIds = users.filter(u => Number(u.daily_points_goal) === 0).map(u => u.id);
    const routineGoalMap = new Map(); // `${weekStart}_${userId}` → pts esperados
    const routineDoneMap = new Map(); // `${weekStart}_${userId}` → pts concluídos

    if (routineBasedIds.length > 0) {
      try {
        const routinesRes = await db.query(
          `SELECT user_id, frequency, applies_days, points
           FROM user_routines WHERE user_id = ANY($1) AND active = TRUE`,
          [routineBasedIds]
        );
        const routinesByUser = new Map();
        for (const r of routinesRes.rows) {
          const uid = Number(r.user_id);
          if (!routinesByUser.has(uid)) routinesByUser.set(uid, []);
          routinesByUser.get(uid).push(r);
        }
        for (const uid of routineBasedIds) {
          for (const weekStart of weeks) {
            const expected = computeExpectedRoutinePts(routinesByUser.get(uid) || [], weekStart);
            routineGoalMap.set(`${weekStart}_${uid}`, expected);
          }
        }

        const routineDoneRes = await db.query(
          `WITH ws AS (SELECT unnest($1::date[]) AS week_start),
           uw AS (SELECT u.id AS user_id, ws.week_start
                  FROM ws CROSS JOIN (SELECT unnest($2::int[]) AS id) u)
           SELECT uw.week_start::text, uw.user_id,
             COALESCE(SUM(CASE WHEN rc.status = 'done' THEN ur.points ELSE 0 END), 0)::int AS done_pts
           FROM uw
           LEFT JOIN routine_completions rc
             ON rc.user_id = uw.user_id
             AND rc.completed_date >= uw.week_start
             AND rc.completed_date <= (uw.week_start + INTERVAL '6 days')::date
           LEFT JOIN user_routines ur ON ur.id = rc.routine_id AND ur.active = TRUE
           GROUP BY uw.week_start, uw.user_id`,
          [weeks, routineBasedIds]
        );
        for (const r of routineDoneRes.rows) {
          routineDoneMap.set(`${String(r.week_start).slice(0, 10)}_${Number(r.user_id)}`, Number(r.done_pts));
        }
      } catch (_) { /* user_routines ainda não migrado — routine-based users ficam com meta 0 */ }
    }

    // Coins logic — escala 0–6 (máximo = 6):
    //   0 coins → < 20%
    //   1 coin  → ≥ 20%
    //   2 coins → ≥ 40%
    //   3 coins → ≥ 60%
    //   4 coins → ≥ 80%
    //   5 coins → ≥ 100% (meta atingida)
    //   6 coins → ≥ 120% (bônus)
    function calcCoins(pts, meta100, meta120) {
      if (pts >= meta120)        return 6;
      if (pts >= meta100)        return 5;
      if (pts >= meta100 * 0.80) return 4;
      if (pts >= meta100 * 0.60) return 3;
      if (pts >= meta100 * 0.40) return 2;
      if (pts >= meta100 * 0.20) return 1;
      return 0;
    }

    const usersWithWeeks = users.map(user => {
      const isRoutineBased = Number(user.daily_points_goal) === 0;
      const dailyGoal      = isRoutineBased ? 0 : (Number(user.daily_points_goal) || 26);
      const fixedWeekly    = dailyGoal * 5;
      const fixedMeta120   = Number(user.weekly_pts_120) || Math.round(fixedWeekly * 1.2);

      const weekData = weeks.map((weekStart, i) => {
        const weekEndObj = new Date(`${weekStart}T00:00:00Z`);
        weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
        const weekEnd = weekEndObj.toISOString().slice(0, 10);
        const isLive  = weekStart <= todayStr && todayStr <= weekEnd;

        const ptsKey  = `${weekStart}_${user.id}`;
        const ptsData = ptsIndex.get(ptsKey) || { pts: 0, tasksDone: 0 };
        const horas   = parseFloat((hoursIndex.get(ptsKey) || 0).toFixed(2));

        const weeklyGoal = isRoutineBased
          ? (routineGoalMap.get(ptsKey) || 0)
          : fixedWeekly;
        const pts = isRoutineBased
          ? (routineDoneMap.get(ptsKey) || 0)
          : ptsData.pts;
        const meta120 = isRoutineBased
          ? Math.round(weeklyGoal * 1.2)
          : fixedMeta120;

        const percentualMeta   = weeklyGoal > 0 ? Math.round((pts / weeklyGoal) * 100) : 0;
        const metaStatus       = pts >= meta120 ? 'above_120' : pts >= weeklyGoal ? 'above_100' : 'below_100';
        const pct              = percentualMeta;
        const coins            = weeklyGoal > 0 ? calcCoins(pts, weeklyGoal, meta120) : 0;
        const faltouPara100    = Math.max(0, weeklyGoal - pts);
        const faltouPara120    = Math.max(0, meta120 - pts);

        return {
          weekIndex: i + 1, weekStart, weekEnd, isLive,
          pts, horas, pct, percentualMeta, metaStatus,
          coins, faltouPara100, faltouPara120,
          tasksDone: ptsData.tasksDone,
          weeklyGoal,  // exposto por semana — varia para isRoutineBased
          meta120,
        };
      });

      return {
        id: user.id, name: user.name, cargo: user.cargo,
        dailyGoal,
        weeklyGoal: isRoutineBased ? 0 : fixedWeekly,
        meta100: isRoutineBased ? 0 : fixedWeekly,
        meta120: isRoutineBased ? 0 : fixedMeta120,
        isRoutineBased,
        isCompletionBased: false,
        weeks: weekData,
      };
    });

    const weekLabels = weeks.map((ws, i) => {
      const weekEndObj = new Date(`${ws}T00:00:00Z`);
      weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
      const wEnd   = weekEndObj.toISOString().slice(0, 10);
      const isLive = ws <= todayStr && todayStr <= wEnd;
      return { index: i + 1, weekStart: ws, weekEnd: wEnd, isLive };
    });

    // Atribuição automática: persiste coins das semanas concluídas em sb_coins
    try {
      const uids = [], wstarts = [], coined = [], ptsd = [];
      for (const user of usersWithWeeks) {
        for (const w of user.weeks) {
          if (w.isLive || w.weekEnd >= todayStr) continue; // só semanas fechadas
          uids.push(user.id);
          wstarts.push(w.weekStart);
          coined.push(w.coins);
          ptsd.push(w.pts);
        }
      }
      if (uids.length) {
        await db.query(
          `INSERT INTO sb_coins (user_id, week_start, coins_earned, pts_earned)
           SELECT * FROM UNNEST($1::int[], $2::date[], $3::smallint[], $4::int[])
           ON CONFLICT (user_id, week_start) DO UPDATE
             SET coins_earned = EXCLUDED.coins_earned,
                 pts_earned   = EXCLUDED.pts_earned,
                 updated_at   = NOW()`,
          [uids, wstarts, coined, ptsd]
        );
      }
    } catch (_) { /* sb_coins table not yet migrated — safe to ignore */ }

    return json(res, 200, { from, to, weeks: weekLabels, users: usersWithWeeks });
  } catch (err) {
    console.error('[history] unhandled error:', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
