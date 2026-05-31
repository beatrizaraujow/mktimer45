const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');
const { getDateParts, clampWeeks, getOrCreateActiveSession } = require('../_lib/focus');

function weekStart(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

function parseMonth(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

function initials(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function startOfWeekUtc(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}

function addWeeksUtc(date, weeks) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

module.exports = async function handler(req, res) {
  try {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const action = (req.query.action || '').toString();

  if (req.method === 'POST' && action === 'start') {
    const session = await getOrCreateActiveSession(auth.sub);
    return json(res, 200, { success: true, session: { id: session.id, startedAt: session.started_at } });
  }

  if (req.method === 'POST' && action === 'stop') {
    const stopped = await db.query(
      `
        UPDATE focus_sessions
        SET ended_at = NOW()
        WHERE id = (
          SELECT id
          FROM focus_sessions
          WHERE user_id = $1
            AND ended_at IS NULL
          ORDER BY started_at DESC
          LIMIT 1
        )
        RETURNING id, started_at, ended_at
      `,
      [auth.sub]
    );

    return json(res, 200, { success: true, session: stopped.rowCount > 0 ? stopped.rows[0] : null });
  }

  if (req.method === 'GET' && action === 'overview') {
    const parts = getDateParts(req.query.date);
    if (!parts) return json(res, 400, { error: 'Invalid date. Use YYYY-MM-DD.' });

    const weeks = clampWeeks(req.query.weeks || 14);
    const anchorMonth = req.query.calendarIn && /^\d{4}-\d{2}$/.test(req.query.calendarIn)
      ? req.query.calendarIn
      : parts.isoDate.slice(0, 7);

    const dayStart = `${parts.isoDate}T00:00:00Z`;
    const nextDay = new Date(`${parts.isoDate}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayEnd = nextDay.toISOString();

    const goalResult = await db.query('SELECT focus_goal_minutes FROM users WHERE id = $1', [auth.sub]);
    const focusGoalMinutes = goalResult.rowCount > 0 ? Number(goalResult.rows[0].focus_goal_minutes) : 360;

    const timeUsed = await db.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(COALESCE(ended_at, NOW()), $2::timestamptz) - GREATEST(started_at, $1::timestamptz))) / 60), 0)::float AS minutes FROM focus_sessions WHERE user_id = $3 AND started_at < $2::timestamptz AND COALESCE(ended_at, NOW()) > $1::timestamptz`,
      [dayStart, dayEnd, auth.sub]
    );

    const panelDaily = await db.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(COALESCE(ended_at, NOW()), $2::timestamptz) - GREATEST(started_at, $1::timestamptz))) / 60), 0)::float AS minutes FROM focus_sessions WHERE started_at < $2::timestamptz AND COALESCE(ended_at, NOW()) > $1::timestamptz`,
      [dayStart, dayEnd]
    );

    const active = await db.query(
      `SELECT id, started_at FROM focus_sessions WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [auth.sub]
    );

    const anchorDate = new Date(`${anchorMonth}-01T00:00:00Z`);
    const anchorWeekEnd = new Date(anchorDate);
    anchorWeekEnd.setUTCMonth(anchorWeekEnd.getUTCMonth() + 1);
    anchorWeekEnd.setUTCDate(0);
    const endWeekStart = startOfWeekUtc(anchorWeekEnd);
    const startWeekStart = addWeeksUtc(endWeekStart, -(weeks - 1));

    const trend = await db.query(
      `
        WITH weeks AS (
          SELECT generate_series($1::date, $2::date, INTERVAL '1 week')::date AS week_start
        )
        SELECT
          week_start,
          COALESCE(
            SUM(
              CASE
                WHEN fs.id IS NULL THEN 0
                ELSE EXTRACT(EPOCH FROM (
                  LEAST(COALESCE(fs.ended_at, NOW()), (week_start + INTERVAL '1 week')::timestamptz) -
                  GREATEST(fs.started_at, week_start::timestamptz)
                )) / 60
              END
            ),
            0
          )::float AS minutes
        FROM weeks
        LEFT JOIN focus_sessions fs
          ON fs.user_id = $3
          AND fs.started_at < (week_start + INTERVAL '1 week')::timestamptz
          AND COALESCE(fs.ended_at, NOW()) > week_start::timestamptz
        GROUP BY week_start
        ORDER BY week_start
      `,
      [startWeekStart.toISOString().slice(0, 10), endWeekStart.toISOString().slice(0, 10), auth.sub]
    );

    const timeUsedMinutes = Math.round(Number(timeUsed.rows[0].minutes || 0));
    const panelDailyMinutes = Math.round(Number(panelDaily.rows[0].minutes || 0));
    const gaugePercent = Math.min(100, Math.round((timeUsedMinutes / focusGoalMinutes) * 100));
    const countdownSeconds = Math.max(0, (focusGoalMinutes - timeUsedMinutes) * 60);
    const totalMinutes = Math.round(trend.rows.reduce((sum, row) => sum + Number(row.minutes || 0), 0));

    return json(res, 200, {
      date: parts.isoDate,
      weeks,
      anchorMonth,
      timeUsedMinutes,
      panelDailyMinutes,
      focusGoalMinutes,
      gaugePercent,
      countdownSeconds,
      activeSession: active.rowCount > 0 ? active.rows[0] : null,
      totalMinutes,
      weekTrend: trend.rows.map((row, index, rows) => {
        const minutes = Math.round(Number(row.minutes || 0));
        const cumulativeMinutes = Math.round(
          rows.slice(0, index + 1).reduce((sum, currentRow) => sum + Number(currentRow.minutes || 0), 0)
        );

        return {
          label: `Semana ${index + 1}`,
          weekStart: row.week_start,
          minutes,
          totalMinutes: cumulativeMinutes,
        };
      }),
    });
  }

  if (req.method === 'GET' && action === 'consistency') {
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7);
    const range = parseMonth(selectedMonth);
    if (!range) return json(res, 400, { error: 'Invalid month. Use YYYY-MM.' });

    const goalResult = await db.query('SELECT focus_goal_minutes FROM users WHERE id = $1', [auth.sub]);
    const focusGoalMinutes = goalResult.rowCount > 0 ? Number(goalResult.rows[0].focus_goal_minutes) : 360;
    const goalHours = focusGoalMinutes / 60;

    const rows = await db.query(
      `WITH days AS (
         SELECT generate_series($1::date, ($2::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS day
       )
       SELECT day, COALESCE(SUM(te.hours), 0)::float AS hours
       FROM days
       LEFT JOIN time_entries te ON te.user_id = $3 AND te.work_date = day
       GROUP BY day ORDER BY day`,
      [range.start.toISOString().slice(0, 10), range.end.toISOString().slice(0, 10), auth.sub]
    );

    const days = rows.rows.map((row) => {
      const hours = Number(row.hours || 0);
      const minutes = Math.round(hours * 60);
      return {
        day: row.day,
        minutes,
        status: hours >= goalHours ? 'full' : hours > 0 ? 'partial' : 'empty',
      };
    });

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayInfo = days.find((d) => d.day === todayIso);
    const countdownSeconds = Math.max(0, (focusGoalMinutes - (todayInfo ? todayInfo.minutes : 0)) * 60);
    const streak = days.reduceRight((acc, day) => (day.minutes > 0 ? acc + 1 : acc), 0);

    return json(res, 200, {
      month: selectedMonth,
      focusGoalMinutes,
      streak,
      countdownSeconds,
      days,
    });
  }

  if (req.method === 'GET' && action === 'leaderboard') {
    const now = new Date();
    const fromParam = req.query.from;
    const toParam   = req.query.to;
    let periodStartDate, todayDate, weeks;

    if (fromParam && toParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      periodStartDate = fromParam;
      todayDate       = toParam;
      weeks = Math.max(1, Math.ceil((new Date(toParam) - new Date(fromParam)) / (7 * 86400000)));
    } else {
      weeks = clampWeeks(req.query.weeks || 4);
      const periodStart = new Date(now);
      periodStart.setUTCDate(periodStart.getUTCDate() - weeks * 7);
      periodStartDate = periodStart.toISOString().slice(0, 10);
      todayDate       = now.toISOString().slice(0, 10);
    }

    const users = await db.query('SELECT id, name, role FROM users WHERE active = TRUE ORDER BY name');

    const hoursResult = await db.query(
      `SELECT user_id, COALESCE(SUM(hours), 0)::float AS total_hours
       FROM time_entries
       WHERE work_date >= $1 AND work_date <= $2
       GROUP BY user_id`,
      [periodStartDate, todayDate]
    );

    const tasksDone = await db.query(
      `SELECT user_id, COUNT(*)::int AS tasks_done
       FROM focus_tasks
       WHERE is_done = TRUE AND COALESCE(completed_at, created_at) >= $1::timestamptz
       GROUP BY user_id`,
      [periodStartDate]
    );

    const streakStart = new Date(now);
    streakStart.setUTCDate(streakStart.getUTCDate() - 60);
    const dailyPresence = await db.query(
      `WITH days AS (
         SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS day
       )
       SELECT u.id AS user_id, day,
         CASE WHEN EXISTS (
           SELECT 1 FROM time_entries te WHERE te.user_id = u.id AND te.work_date = day
         ) THEN 1 ELSE 0 END AS has_entry
       FROM users u CROSS JOIN days
       WHERE u.active = TRUE
       ORDER BY u.id, day DESC`,
      [streakStart.toISOString().slice(0, 10), todayDate]
    );

    const hoursMap  = new Map(hoursResult.rows.map((r) => [Number(r.user_id), Number(r.total_hours)]));
    const tasksMap  = new Map(tasksDone.rows.map((r) => [Number(r.user_id), Number(r.tasks_done)]));
    const streakMap = new Map();
    let currentUser = null;
    let count = 0;
    for (const row of dailyPresence.rows) {
      const userId = Number(row.user_id);
      if (currentUser !== userId) {
        if (currentUser !== null && !streakMap.has(currentUser)) streakMap.set(currentUser, count);
        currentUser = userId;
        count = 0;
      }
      if (streakMap.has(userId)) continue;
      if (Number(row.has_entry) === 1) count += 1;
      else streakMap.set(userId, count);
    }
    if (currentUser !== null && !streakMap.has(currentUser)) streakMap.set(currentUser, count);

    const ranking = users.rows.map((user) => {
      const totalHours       = Number((hoursMap.get(user.id) || 0).toFixed(2));
      const tasksCompleted   = tasksMap.get(user.id) || 0;
      const streak           = streakMap.get(user.id) || 0;
      const consistencyFactor = Number((1 + Math.min(streak, 14) * 0.05).toFixed(2));
      const score            = Number((totalHours * consistencyFactor + tasksCompleted).toFixed(2));
      return { userId: user.id, name: user.name, role: user.role, avatar: initials(user.name), focusedHours: totalHours, tasksCompleted, streak, consistencyFactor, score };
    });

    ranking.sort((a, b) => b.score - a.score);
    const maxScore = ranking.length ? ranking[0].score : 1;

    return json(res, 200, {
      weeks,
      formula: 'score = (totalHours * consistencyFactor) + tasksCompleted',
      items: ranking.map((item, index) => ({ ...item, rank: index + 1, progressPercent: maxScore > 0 ? Math.round((item.score / maxScore) * 100) : 0 })),
    });
  }

  // ── GET team-daily ─────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'team-daily') {
    // Brazil is UTC-3; derive "today" in BRT
    const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr = nowBRT.toISOString().slice(0, 10);

    // Week number within the month (1-based, ceil of day/7)
    const dayOfMonth = nowBRT.getUTCDate();
    const weekNum    = Math.ceil(dayOfMonth / 7);

    // Monday of current ISO week
    const wdBRT     = nowBRT.getUTCDay() || 7; // 1=Mon … 7=Sun
    const mondayBRT = new Date(nowBRT);
    mondayBRT.setUTCDate(nowBRT.getUTCDate() - wdBRT + 1);
    const weekStart = mondayBRT.toISOString().slice(0, 10);

    // Try full schema; fall back if migration_v2 hasn't been run yet
    let usersRes;
    try {
      usersRes = await db.query(
        `SELECT id, name, COALESCE(cargo,'') AS cargo, COALESCE(daily_points_goal,26) AS daily_points_goal
         FROM users WHERE active = TRUE ORDER BY name`
      );
    } catch {
      usersRes = await db.query(
        `SELECT id, name, '' AS cargo, 26 AS daily_points_goal
         FROM users WHERE active = TRUE ORDER BY name`
      );
    }

    // Detect which optional columns exist in focus_tasks
    const colCheck = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'focus_tasks'
         AND column_name IN ('points','start_date','end_date')`
    );
    const cols = new Set(colCheck.rows.map((r) => r.column_name));
    const hasPoints    = cols.has('points');
    const hasDateRange = cols.has('start_date') && cols.has('end_date');

    // Build WHERE for today (with or without start_date/end_date)
    const todayWhere = hasDateRange
      ? `(DATE(created_at) = $1::date
           OR (start_date <= $1::date AND (end_date IS NULL OR end_date >= $1::date)))`
      : `DATE(created_at) = $1::date`;

    const ptsExpr = hasPoints
      ? `COALESCE(SUM(CASE WHEN is_done THEN COALESCE(points,0) ELSE 0 END),0)::int`
      : `0::int`;

    const [taskStatsRes, horasRes, weekPtsRes, taskDetailRes] = await Promise.all([
      db.query(
        `SELECT user_id,
                COUNT(*)::int AS total_today,
                SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_today,
                ${ptsExpr} AS pts_today
         FROM focus_tasks
         WHERE ${todayWhere}
         GROUP BY user_id`,
        [todayStr]
      ),
      db.query(
        `SELECT user_id, COALESCE(SUM(hours), 0)::float AS horas_hoje
         FROM time_entries WHERE work_date = $1::date
         GROUP BY user_id`,
        [todayStr]
      ),
      db.query(
        `SELECT user_id,
                ${ptsExpr} AS pts_semana,
                COUNT(*)::int AS total_semana,
                SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_semana
         FROM focus_tasks
         WHERE DATE(created_at) >= $1::date AND DATE(created_at) <= $2::date
         GROUP BY user_id`,
        [weekStart, todayStr]
      ),
      db.query(
        `SELECT id, user_id, title, category,
                ${hasPoints ? 'points' : 'NULL::smallint AS points'},
                is_done, created_at
         FROM focus_tasks
         WHERE ${todayWhere}
         ORDER BY user_id, is_done DESC,
                  ${hasPoints ? 'COALESCE(points,0) DESC,' : ''}
                  created_at DESC`,
        [todayStr]
      ),
    ]);

    const taskStatsMap = new Map(taskStatsRes.rows.map((r) => [Number(r.user_id), r]));
    const horasMap     = new Map(horasRes.rows.map((r) => [Number(r.user_id), Number(r.horas_hoje)]));
    const weekPtsMap   = new Map(weekPtsRes.rows.map((r) => [Number(r.user_id), r]));

    const tasksPerUser = new Map();
    for (const t of taskDetailRes.rows) {
      const uid = Number(t.user_id);
      if (!tasksPerUser.has(uid)) tasksPerUser.set(uid, []);
      tasksPerUser.get(uid).push(t);
    }

    const members = usersRes.rows.map((user) => {
      const uid      = Number(user.id);
      const stats    = taskStatsMap.get(uid) || { total_today: 0, done_today: 0, pts_today: 0 };
      const horas    = horasMap.get(uid) || 0;
      const wstats   = weekPtsMap.get(uid) || { pts_semana: 0, total_semana: 0, done_semana: 0 };
      const dailyGoal  = Number(user.daily_points_goal);
      const weeklyGoal = dailyGoal * 5;

      const ptsToday    = Number(stats.pts_today);
      const doneToday   = Number(stats.done_today);
      const totalToday  = Number(stats.total_today);
      const ptsSemana   = Number(wstats.pts_semana);
      const doneSemana  = Number(wstats.done_semana);
      const totalSemana = Number(wstats.total_semana);

      const cargoLc = (user.cargo || '').toLowerCase();
      const isCompletionBased =
        cargoLc.includes('storymaker') ||
        cargoLc.includes('ugc') ||
        cargoLc.includes('publisher');

      const weekPct = isCompletionBased
        ? (totalSemana > 0 ? Math.round((doneSemana / totalSemana) * 100) : 0)
        : (weeklyGoal  > 0 ? Math.round((ptsSemana / weeklyGoal) * 100)   : 0);

      const weekLabel = isCompletionBased ? 'Conclusão' : `Sem ${weekNum}`;

      const dailyPct = isCompletionBased
        ? (totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0)
        : (dailyGoal  > 0 ? Math.round((ptsToday  / dailyGoal) * 100)  : 0);

      // Productivity coefficient
      const ptsRate   = dailyGoal > 0 ? Math.min(ptsToday / dailyGoal, 1.5) : 0;
      const taskRate  = totalToday > 0 ? doneToday / totalToday : 0;
      const horasRate = Math.min(horas / 8, 1);
      const coef = horas > 0.01
        ? Math.round((ptsRate * 0.50 + taskRate * 0.35 + horasRate * 0.15) * 100)
        : Math.round((ptsRate * 0.60 + taskRate * 0.40) * 100);

      const horasH = Math.floor(horas);
      const horasM = Math.round((horas - horasH) * 60);
      const horasStr = horas > 0.01
        ? `${horasH}h ${String(horasM).padStart(2,'0')}min validadas`
        : '0h validadas';

      return {
        id: uid,
        name: user.name,
        cargo: user.cargo || '',
        dailyGoal,
        weeklyGoal,
        weekNum,
        weekLabel,
        weekPct,
        ptsToday,
        doneToday,
        totalToday,
        ptsSemana,
        horas,
        horasStr,
        coef,
        dailyPct: Math.min(dailyPct, 150),
        isCompletionBased,
        tasks: (tasksPerUser.get(uid) || []).slice(0, 18),
      };
    });

    return json(res, 200, { date: todayStr, weekNum, members });
  }

  // ── GET clickup-calendar ───────────────────────────────────────────
  if (req.method === 'GET' && action === 'clickup-calendar') {
    const token  = (process.env.CLICKUP_TOKEN  || '').trim();
    const listId = (process.env.CLICKUP_LIST_ID || '').trim();
    if (!token || !listId) return json(res, 400, { error: 'ClickUp não configurado.', source: 'not_configured' });

    const cuRes = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=0`,
      { headers: { Authorization: token } }
    );
    if (!cuRes.ok) return json(res, 502, { error: `ClickUp ${cuRes.status}` });
    const { tasks = [] } = await cuRes.json();

    const days = {};
    for (const t of tasks) {
      if (t.date_done && t.status?.type === 'closed') {
        const brt  = new Date(Number(t.date_done) - 3 * 60 * 60 * 1000);
        const key  = brt.toISOString().slice(0, 10);
        const dow  = brt.getUTCDay(); // 0=Sun … 6=Sat
        if (dow !== 0) days[key] = (days[key] || 0) + 1; // skip Sundays
      }
    }
    return json(res, 200, { days });
  }

  // ── GET clickup-live ───────────────────────────────────────────────
  if (req.method === 'GET' && action === 'clickup-live') {
    const token  = (process.env.CLICKUP_TOKEN  || '').trim();
    const listId = (process.env.CLICKUP_LIST_ID || '').trim();

    if (!token || !listId) {
      return json(res, 400, {
        error: 'ClickUp não configurado. Adicione CLICKUP_TOKEN e CLICKUP_LIST_ID nas variáveis de ambiente do Vercel.',
        source: 'not_configured',
      });
    }

    // Fetch all tasks from the ClickUp list
    const cuRes = await fetch(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=0`,
      { headers: { Authorization: token } }
    );

    if (!cuRes.ok) {
      const errText = await cuRes.text();
      return json(res, 502, { error: `ClickUp ${cuRes.status}: ${errText.slice(0, 200)}` });
    }

    const { tasks: allCuTasks = [] } = await cuRes.json();

    // Optional date filter: if from/to provided, filter by date_done (BRT)
    const fromP = (req.query.from || '').trim();
    const toP   = (req.query.to   || '').trim();
    const isFiltered  = Boolean(fromP && toP);
    const isTodayOnly = isFiltered && fromP === toP; // "Hoje" mode
    let cuTasks = allCuTasks;
    if (isFiltered) {
      const fromMs = new Date(`${fromP}T00:00:00-03:00`).getTime();
      const toMs   = new Date(`${toP}T23:59:59-03:00`).getTime();
      cuTasks = allCuTasks.filter((t) => {
        if (isTodayOnly) {
          // Hoje: all open tasks + tasks done today
          if (t.status?.type !== 'closed') return true;
          const ms = Number(t.date_done || 0);
          return ms > 0 && ms >= fromMs && ms <= toMs;
        }
        // Period: only closed tasks in range
        if (t.status?.type !== 'closed') return false;
        const ms = Number(t.date_done || 0);
        return ms > 0 && ms >= fromMs && ms <= toMs;
      });
    }

    // Date helpers (Brazil UTC-3)
    const nowBRT    = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr  = nowBRT.toISOString().slice(0, 10);
    const wd        = nowBRT.getUTCDay() || 7;
    const monday    = new Date(nowBRT);
    monday.setUTCDate(nowBRT.getUTCDate() - wd + 1);
    const weekNum   = Math.ceil(nowBRT.getUTCDate() / 7);

    // Load system users — try with clickup_email first, fall back gracefully
    let usersRes;
    try {
      usersRes = await db.query(
        `SELECT id, name,
                COALESCE(cargo,'') AS cargo,
                COALESCE(daily_points_goal,26) AS daily_points_goal,
                COALESCE(clickup_email,'') AS clickup_email
         FROM users WHERE active = TRUE ORDER BY name`
      );
    } catch {
      try {
        usersRes = await db.query(
          `SELECT id, name, COALESCE(cargo,'') AS cargo, COALESCE(daily_points_goal,26) AS daily_points_goal, '' AS clickup_email
           FROM users WHERE active = TRUE ORDER BY name`
        );
      } catch {
        usersRes = await db.query(
          `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, '' AS clickup_email
           FROM users WHERE active = TRUE ORDER BY name`
        );
      }
    }

    // Load today's hours from local time_entries
    const horasRes = await db.query(
      `SELECT user_id, COALESCE(SUM(hours),0)::float AS horas_hoje
       FROM time_entries WHERE work_date = $1::date GROUP BY user_id`,
      [todayStr]
    );
    const horasMap = new Map(horasRes.rows.map((r) => [Number(r.user_id), Number(r.horas_hoje)]));

    // Build lookup maps — email (primary) + name fallback
    const userByEmail = new Map();
    const userByName  = new Map();
    for (const u of usersRes.rows) {
      if (u.clickup_email) userByEmail.set(u.clickup_email.toLowerCase().trim(), u);
      const key = u.name.toLowerCase().trim();
      userByName.set(key, u);
      const first = key.split(' ')[0];
      if (!userByName.has(first)) userByName.set(first, u);
    }

    const matchAssignee = (a) => {
      const email = (a.email || '').toLowerCase().trim();
      // 1. Exact email match
      if (email && userByEmail.has(email)) return userByEmail.get(email);
      // 2. First name from ClickUp username
      const uname = (a.username || '').toLowerCase().trim();
      const first = uname.split(' ')[0];
      if (first && userByName.has(first)) return userByName.get(first);
      // 3. First segment of email prefix
      const seg = email.split('@')[0].split('.')[0];
      if (seg && userByName.has(seg)) return userByName.get(seg);
      // 4. Partial match
      if (first) {
        for (const [k, u] of userByName) {
          if (k.startsWith(first) || first.startsWith(k)) return u;
        }
      }
      return null;
    };

    // Group ClickUp tasks by system user id
    const cuByUid = new Map();
    for (const task of cuTasks) {
      for (const a of (Array.isArray(task.assignees) ? task.assignees : [])) {
        const sysUser = matchAssignee(a);
        if (!sysUser) continue;
        const uid = Number(sysUser.id);
        if (!cuByUid.has(uid)) cuByUid.set(uid, []);
        cuByUid.get(uid).push(task);
      }
    }

    const isTaskDone = (t) =>
      t.status?.type === 'closed' ||
      /^(done|completo|conclu|complete)/i.test(t.status?.status || '');

    const getStatusCat = (t) => {
      const s  = (t.status?.status || '').toLowerCase();
      const tp = (t.status?.type   || '').toLowerCase();
      if (tp === 'closed' || /completo|done|complete|conclu/i.test(s)) return 'done';
      if (/l[ií]der|leader/i.test(s))                                   return 'leader';
      if (/aprova|approval|review|aguardando/i.test(s))                 return 'approval';
      if (/altera|revis|corre|revision/i.test(s))                       return 'revision';
      return 'todo';
    };

    const members = usersRes.rows.map((user) => {
      const uid   = Number(user.id);
      const tasks = cuByUid.get(uid) || [];
      const horas = horasMap.get(uid) || 0;

      const doneToday  = tasks.filter(isTaskDone).length;
      const totalToday = tasks.length;

      const dailyGoal  = Number(user.daily_points_goal);
      const cargoLc    = (user.cargo || '').toLowerCase();
      const isCompletionBased =
        cargoLc.includes('storymaker') || cargoLc.includes('ugc') || cargoLc.includes('publisher');

      const weekPct   = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
      const weekLabel = isCompletionBased ? 'Conclusão' : `Sem ${weekNum}`;
      const taskRate  = totalToday > 0 ? doneToday / totalToday : 0;
      const horasRate = Math.min(horas / 8, 1);
      const coef      = Math.round((taskRate * 0.70 + horasRate * 0.30) * 100);

      const horasH   = Math.floor(horas);
      const horasM   = Math.round((horas - horasH) * 60);
      const horasStr = horas > 0.01
        ? `${horasH}h ${String(horasM).padStart(2, '0')}min validadas`
        : '0h validadas';

      // Sum points from completed tasks (extracted from ClickUp custom fields)
      const ptsToday = tasks
        .filter((t) => t.statusCat === 'done' || t.is_done)
        .reduce((sum, t) => sum + (t.points || 0), 0);

      return {
        id: uid,
        name:   user.name,
        cargo:  user.cargo || '',
        dailyGoal,
        weeklyGoal: dailyGoal * 5,
        weekNum,
        weekLabel,
        weekPct,
        ptsToday,
        doneToday,
        totalToday,
        ptsSemana: 0,
        horas,
        horasStr,
        coef,
        dailyPct: Math.min(weekPct, 150),
        isCompletionBased,
        tasks: tasks.slice(0, isFiltered ? 100 : 25).map((t) => {
          // Extract points from ClickUp custom fields
          let pts = null;
          if (Array.isArray(t.custom_fields)) {
            const pf = t.custom_fields.find(
              (f) => /ponto|point/i.test(f.name || '') && f.value != null
            );
            if (pf) {
              const pv = Number(pf.value);
              if ([1, 2, 3, 5, 8].includes(pv)) pts = pv;
            }
          }
          return {
            id:          t.id,
            title:       t.name || '—',
            category:    t.list?.name || null,
            points:      pts,
            is_done:     isTaskDone(t),
            statusLabel: t.status?.status || '',
            statusColor: t.status?.color  || null,
            statusCat:   getStatusCat(t),
          };
        }),
      };
    });

    return json(res, 200, { date: todayStr, weekNum, source: 'clickup', members });
  }

  // ── POST clickup-sync ───────────────────────────────────────────────
  if (req.method === 'POST' && action === 'clickup-sync') {
    const { requireAdmin } = require('../_lib/auth');
    if (!requireAdmin(auth, res)) return;

    const token  = process.env.CLICKUP_TOKEN;
    const listId = process.env.CLICKUP_LIST_ID || (req.body && req.body.listId);

    if (!token)  return json(res, 400, { error: 'CLICKUP_TOKEN não configurado no ambiente.' });
    if (!listId) return json(res, 400, { error: 'CLICKUP_LIST_ID não configurado.' });

    // Fetch tasks from ClickUp
    let cuTasks = [];
    try {
      const cuRes = await fetch(
        `https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=false&order_by=created&reverse=true`,
        { headers: { Authorization: token } }
      );
      if (!cuRes.ok) {
        const errBody = await cuRes.text();
        return json(res, 502, { error: `ClickUp retornou ${cuRes.status}: ${errBody.slice(0, 200)}` });
      }
      const cuData = await cuRes.json();
      cuTasks = cuData.tasks || [];
    } catch (fetchErr) {
      return json(res, 502, { error: `Erro ao chamar ClickUp: ${fetchErr.message}` });
    }

    // Load system users for name mapping
    const usersRes = await db.query('SELECT id, name FROM users WHERE active = TRUE');
    const userMap  = new Map();
    for (const u of usersRes.rows) {
      userMap.set(u.name.toLowerCase().trim(), u.id);
    }

    let created = 0;
    let skipped = 0;

    for (const task of cuTasks) {
      const title    = (task.name || '').trim();
      if (!title) continue;

      // Find points from custom fields
      let points = null;
      if (Array.isArray(task.custom_fields)) {
        const pf = task.custom_fields.find(
          (f) => /ponto|point/i.test(f.name || '') && f.value != null
        );
        if (pf) {
          const pv = Number(pf.value);
          if ([1, 2, 3, 5, 8].includes(pv)) points = pv;
        }
      }

      const isDone = (task.status?.type === 'closed') || /^(done|completo|conclu)/i.test(task.status?.status || '');
      const category = task.list?.name || null;

      // Map each assignee to a system user
      const assignees = Array.isArray(task.assignees) ? task.assignees : [];
      if (!assignees.length) { skipped++; continue; }

      for (const assignee of assignees) {
        const lookupName = (assignee.username || assignee.email || '').toLowerCase().trim().split('@')[0];
        let uid = userMap.get(lookupName);
        if (!uid) {
          // partial match
          for (const [sysName, sysId] of userMap) {
            if (sysName.startsWith(lookupName) || lookupName.startsWith(sysName)) {
              uid = sysId;
              break;
            }
          }
        }
        if (!uid) { skipped++; continue; }

        // Dedup: skip if same title already exists for this user today (BRT)
        const nowBRT  = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const todayBR = nowBRT.toISOString().slice(0, 10);
        const exists  = await db.query(
          `SELECT 1 FROM focus_tasks WHERE user_id=$1 AND title=$2 AND DATE(created_at)=$3 LIMIT 1`,
          [uid, title, todayBR]
        );
        if (exists.rowCount > 0) { skipped++; continue; }

        await db.query(
          `INSERT INTO focus_tasks (user_id, title, category, points, is_done)
           VALUES ($1, $2, $3, $4, $5)`,
          [uid, title, category, points, isDone]
        );
        created++;
      }
    }

    return json(res, 200, { success: true, created, skipped, total: cuTasks.length });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    console.error('[focus] error:', err.message, err.stack);
    return json(res, 500, { error: err.message });
  }
};