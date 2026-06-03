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

// ── Status concluídos — SBHub Regras Técnicas seção 3 (+ variações do ClickUp) ──
const COMPLETED_STATUSES = new Set([
  // Exatos do documento
  'aprovar', 'publicar', 'banco de criativos',
  'concluído', 'concluido', 'concluída', 'concluida',
  'done', 'closed', 'finalizado', 'finalizada',
  // Variações comuns no ClickUp
  'aprovado', 'aprovada',
  'publicado', 'publicada',
  'completo', 'completa', 'complete', 'completed',
]);

// ── Mapeamento Empresa → grupo — seção 2 ─────────────────────────────────
const EMPRESA_TAGS = [
  { grupo: 'SeuBoné',  tags: ['seuboné', 'seubone', 'sb personalizados', 'sb bolsas', 'box corporativo', 'sb brindes', 'sb agro', 'p2p igor freire', 'igor freire'] },
  { grupo: 'Onevo',    tags: ['cássio maia', 'cassio maia', 'onevo energia', 'onevo investimentos'] },
  { grupo: 'Carbone',  tags: ['carbone educação', 'carbone educacao', 'carbone club', 'pedro galvão', 'pedro galvao'] },
];

function resolveEmpresa(task) {
  const candidates = [];
  if (Array.isArray(task.custom_fields)) {
    const ef = task.custom_fields.find(f => /empresa/i.test(f.name || ''));
    if (ef?.value) candidates.push(String(ef.value).toLowerCase().trim());
  }
  if (Array.isArray(task.tags)) task.tags.forEach(tg => candidates.push((tg.name || '').toLowerCase().trim()));
  for (const { grupo, tags } of EMPRESA_TAGS) {
    if (candidates.some(c => tags.some(t => c.includes(t) || t.includes(c)))) return grupo;
  }
  return 'Não classificado';
}

function cuTaskDone(t) {
  const s  = (t.status?.status || '').toLowerCase().trim();
  const tp = (t.status?.type   || '').toLowerCase().trim();
  if (tp === 'closed') return true;
  if (COMPLETED_STATUSES.has(s)) return true;
  // Regex fallback para prefixos/sufixos não mapeados (ex: "Concluído ✓", "Publicado!")
  if (/^(conclu|finaliz|publicad|aprovad|banco.?de.?criativ|complet)/i.test(s)) return true;
  return false;
}

function cuTaskStatusCat(t) {
  const s = (t.status?.status || '').toLowerCase().trim();
  // Publicar e aprovar ficam em categorias próprias (verificados antes do done geral)
  if (/^publicar$|banco.?de.?criativ/i.test(s))                                      return 'publish';
  if (/^aprovar$|aguardando/i.test(s))                                               return 'approval';
  if (cuTaskDone(t)) return 'done';
  if (/altera[cç]|revis/i.test(s))                                                   return 'revision';
  if (/l[ií]der|leader/i.test(s))                                                    return 'approval';
  if (/andamento|in.?progress|progresso|working|doing|fazendo|em.?curso/i.test(s))   return 'doing';
  return 'todo';
}

// Palavras-chave de erros de socket/rede que não devem chegar ao usuário
const NETWORK_ERR_KEYWORDS = ['socket', 'fetch failed', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE',
  'connection closed', 'connection terminated', 'verbose: true', 'network'];

function isNetworkError(msg = '') {
  const m = msg.toLowerCase();
  return NETWORK_ERR_KEYWORDS.some(k => m.includes(k.toLowerCase()));
}

async function fetchClickUp(url, token) {
  try {
    const res = await fetch(url, { headers: { Authorization: token } });
    return res;
  } catch (err) {
    if (isNetworkError(err.message)) {
      throw new Error('Sem resposta do ClickUp — verifique a conexão ou tente novamente em instantes.');
    }
    throw err;
  }
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

    // Try full schema; fall back if migration hasn't been run yet
    // show_in_daily=FALSE exclui ADM Master (Maria Clara) da grade do time
    let usersRes;
    try {
      usersRes = await db.query(
        `SELECT id, name, COALESCE(cargo,'') AS cargo,
                COALESCE(daily_points_goal,26) AS daily_points_goal,
                COALESCE(weekly_goal_120,0) AS weekly_goal_120
         FROM users WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE ORDER BY name`
      );
    } catch {
      usersRes = await db.query(
        `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, 0 AS weekly_goal_120
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

    // Pontos de rotina da semana
    let routinePtsMap = new Map();
    try {
      const routinePtsRes = await db.query(
        `SELECT rc.user_id,
                COALESCE(SUM(ur.points), 0)::int AS routine_pts,
                COUNT(rc.id)::int AS routine_done
         FROM routine_completions rc
         JOIN user_routines ur ON ur.id = rc.routine_id AND ur.active = TRUE
         WHERE rc.completed_date >= $1 AND rc.completed_date <= $2
         GROUP BY rc.user_id`,
        [weekStart, todayStr]
      );
      routinePtsMap = new Map(routinePtsRes.rows.map(r => [Number(r.user_id), r]));
    } catch { /* table may not exist yet */ }

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
      const dailyGoal     = Number(user.daily_points_goal);
      const weeklyGoal    = dailyGoal * 5;
      const weeklyGoal120 = Number(user.weekly_goal_120) > 0
        ? Number(user.weekly_goal_120)
        : Math.round(weeklyGoal * 1.2);

      const ptsToday    = Number(stats.pts_today);
      const doneToday   = Number(stats.done_today);
      const totalToday  = Number(stats.total_today);
      const routineData = routinePtsMap.get(uid) || { routine_pts: 0, routine_done: 0 };
      const ptsSemana   = Number(wstats.pts_semana) + Number(routineData.routine_pts);
      const doneSemana  = Number(wstats.done_semana) + Number(routineData.routine_done);
      // totalSemana inclui rotinas para que done nunca exceda total
      const totalSemana = Math.max(Number(wstats.total_semana) + Number(routineData.routine_done), doneSemana);

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

      // Coeficiente — Regras do Sistema (PDF)
      // Grupo Pontos (Samuel/Thiago/Klenio/Bia): pts/meta×50 + done/total×35 + horas/16h×15
      // Malu/Zion (isCompletionBased): done/total×70 + horas/16h×30 (sem componente de pontos)
      const _ptsRate  = weeklyGoal > 0 ? ptsSemana / weeklyGoal : 0;
      const _taskRate = totalSemana > 0 ? doneSemana / totalSemana : 0;
      const _horaRate = horas / 16; // sem cap — pode ultrapassar 100%
      const coef = isCompletionBased
        ? Math.round((_taskRate * 0.70 + _horaRate * 0.30) * 100)
        : Math.round((_ptsRate  * 0.50 + _taskRate * 0.35 + _horaRate * 0.15) * 100);

      let horasH = Math.floor(horas);
      let horasM = Math.round((horas - horasH) * 60);
      if (horasM >= 60) { horasH += 1; horasM = 0; }
      const horasStr = horas > 0.01
        ? `${horasH}h ${String(horasM).padStart(2,'0')}min validadas`
        : '0h validadas';

      const metaStatus = ptsSemana >= weeklyGoal120 ? 'above_120'
                       : ptsSemana >= weeklyGoal    ? 'above_100'
                       : 'below_100';
      const percentualMeta = weeklyGoal > 0 ? Math.round((ptsSemana / weeklyGoal) * 100) : 0;

      return {
        id: uid,
        name: user.name,
        cargo: user.cargo || '',
        dailyGoal,
        weeklyGoal,
        weeklyGoal120,
        weekNum,
        weekLabel,
        weekPct,
        percentualMeta,
        metaStatus,
        ptsToday,
        doneToday,
        totalToday,
        doneSemana,
        totalSemana,
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

    const cuRes = await fetchClickUp(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=0`,
      token
    );
    if (!cuRes.ok) return json(res, 502, { error: `ClickUp ${cuRes.status}` });
    const firstCalPage = await cuRes.json();
    const tasks = [...(firstCalPage.tasks || [])];
    if (!firstCalPage.last_page && tasks.length >= 100) {
      for (let page = 1; page < 5; page++) {
        const r2 = await fetchClickUp(
          `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`, token
        );
        if (!r2.ok) break;
        const b = await r2.json();
        tasks.push(...(b.tasks || []));
        if (b.last_page || (b.tasks || []).length < 100) break;
      }
    }

    const days = {};
    for (const t of tasks) {
      const closedMs = Number(t.date_closed || t.date_done || 0);
      if (closedMs && cuTaskDone(t)) {
        const brt  = new Date(closedMs - 3 * 60 * 60 * 1000);
        const key  = brt.toISOString().slice(0, 10);
        const dow  = brt.getUTCDay();
        if (dow !== 0) days[key] = (days[key] || 0) + 1;
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

    // Optional date filter: if from/to provided, filter by date_done (BRT)
    const fromP    = (req.query.from     || '').trim();
    const toP      = (req.query.to       || '').trim();
    const showOpen = req.query.showOpen === '1';
    const isFiltered = Boolean(fromP && toP);

    // Fetch tasks do ClickUp — sempre include_closed=true para capturar tasks concluídas
    // Período longo (>7d): até 4 páginas. Período curto/diário: 2 páginas bastam
    const rangeMs  = (fromP && toP)
      ? (new Date(toP).getTime() - new Date(fromP).getTime())
      : 0;
    const MAX_PAGES = rangeMs > 7 * 86400000 ? 4 : 2;

    const cuRes = await fetchClickUp(
      `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=0`,
      token
    );

    if (!cuRes.ok) {
      const errText = await cuRes.text();
      return json(res, 502, { error: `ClickUp ${cuRes.status}: ${errText.slice(0, 200)}` });
    }

    const firstPage  = await cuRes.json();
    const allCuTasks = [...(firstPage.tasks || [])];

    if (!firstPage.last_page && (firstPage.tasks || []).length >= 100) {
      for (let page = 1; page < MAX_PAGES; page++) {
        const r2 = await fetchClickUp(
          `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`,
          token
        );
        if (!r2.ok) break;
        const body = await r2.json();
        allCuTasks.push(...(body.tasks || []));
        if (body.last_page || (body.tasks || []).length < 100) break;
      }
    }

    // Date helpers (Brazil UTC-3) — definido antes do filtro para uso no daily
    const nowBRT    = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr  = nowBRT.toISOString().slice(0, 10);
    const wd        = nowBRT.getUTCDay() || 7;
    const monday    = new Date(nowBRT);
    monday.setUTCDate(nowBRT.getUTCDate() - wd + 1);
    const weekNum   = Math.ceil(nowBRT.getUTCDate() / 7);

    // Load system users — tenta com clickup_user_id + clickup_email, fallback gradual
    // show_in_daily=FALSE exclui ADM Master (Maria Clara) da grade do time
    let usersRes;
    try {
      usersRes = await db.query(
        `SELECT id, name,
                COALESCE(cargo,'') AS cargo,
                COALESCE(daily_points_goal,26) AS daily_points_goal,
                COALESCE(weekly_goal_120,0) AS weekly_goal_120,
                COALESCE(clickup_email,'') AS clickup_email,
                clickup_user_id
         FROM users WHERE active = TRUE
           AND COALESCE(show_in_daily, TRUE) = TRUE
         ORDER BY name`
      );
    } catch {
      try {
        usersRes = await db.query(
          `SELECT id, name, COALESCE(cargo,'') AS cargo, COALESCE(daily_points_goal,26) AS daily_points_goal,
                  0 AS weekly_goal_120,
                  COALESCE(clickup_email,'') AS clickup_email, NULL::bigint AS clickup_user_id
           FROM users WHERE active = TRUE
             AND COALESCE(show_in_daily, TRUE) = TRUE
           ORDER BY name`
        );
      } catch {
        usersRes = await db.query(
          `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, 0 AS weekly_goal_120, '' AS clickup_email, NULL::bigint AS clickup_user_id
           FROM users WHERE active = TRUE ORDER BY name`
        );
      }
    }

    const weekStart = monday.toISOString().slice(0, 10);

    // Queries do banco em paralelo — reduz tempo de ~4×latência para ~1×latência
    const [horasRes, weekPtsRes, routinePtsRes] = await Promise.all([
      db.query(
        `SELECT user_id, COALESCE(SUM(hours),0)::float AS horas_hoje
         FROM time_entries WHERE work_date = $1::date GROUP BY user_id`,
        [todayStr]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT user_id,
                COALESCE(SUM(CASE WHEN is_done THEN COALESCE(points,0) ELSE 0 END),0)::int AS pts_semana,
                SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_semana,
                COUNT(*)::int AS total_semana
         FROM focus_tasks
         WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
         GROUP BY user_id`,
        [weekStart, todayStr]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT rc.user_id,
                COALESCE(SUM(ur.points), 0)::int AS routine_pts,
                COUNT(rc.id)::int AS routine_done
         FROM routine_completions rc
         JOIN user_routines ur ON ur.id = rc.routine_id AND ur.active = TRUE
         WHERE rc.completed_date >= $1 AND rc.completed_date <= $2
         GROUP BY rc.user_id`,
        [weekStart, todayStr]
      ).catch(() => ({ rows: [] })),
    ]);

    const horasMap    = new Map(horasRes.rows.map((r) => [Number(r.user_id), Number(r.horas_hoje)]));
    const weekPtsMap  = new Map(weekPtsRes.rows.map((r) => [Number(r.user_id), r]));
    const routinePtsMap = new Map(routinePtsRes.rows.map(r => [Number(r.user_id), r]));

    // Build lookup maps: ClickUp user ID (primário) > email > nome
    const userByClickupId = new Map();
    const userByEmail     = new Map();
    const userByName      = new Map();
    for (const u of usersRes.rows) {
      if (u.clickup_user_id) userByClickupId.set(String(u.clickup_user_id), u);
      if (u.clickup_email)   userByEmail.set(u.clickup_email.toLowerCase().trim(), u);
      const key = u.name.toLowerCase().trim();
      userByName.set(key, u);
      const first = key.split(' ')[0];
      if (!userByName.has(first)) userByName.set(first, u);
    }

    const matchAssignee = (a) => {
      // 1. ClickUp User ID — mais confiável, não muda
      const cuId = String(a.id || '');
      if (cuId && userByClickupId.has(cuId)) return userByClickupId.get(cuId);
      // 2. Email exato
      const email = (a.email || '').toLowerCase().trim();
      if (email && userByEmail.has(email)) return userByEmail.get(email);
      // 3. Primeiro nome do username do ClickUp
      const uname = (a.username || '').toLowerCase().trim();
      const first = uname.split(' ')[0];
      if (first && userByName.has(first)) return userByName.get(first);
      // 4. Prefixo do email (ex: "samuel" de "samuel.alves@...")
      const seg = email.split('@')[0].split('.')[0];
      if (seg && userByName.has(seg)) return userByName.get(seg);
      // 5. Match parcial por nome
      if (first) {
        for (const [k, u] of userByName) {
          if (k.startsWith(first) || first.startsWith(k)) return u;
        }
      }
      return null;
    };

    // Limites do período para métricas (calculado separado do display de tasks)
    const periodFromMs = isFiltered ? new Date(`${fromP}T00:00:00-03:00`).getTime() : null;
    const periodToMs   = isFiltered ? new Date(`${toP}T23:59:59-03:00`).getTime()   : null;

    // Índice de subtasks por parent ID (para exibir aninhadas no frontend)
    const subtasksByParent = new Map();
    for (const task of allCuTasks) {
      if (task.parent) {
        if (!subtasksByParent.has(task.parent)) subtasksByParent.set(task.parent, []);
        subtasksByParent.get(task.parent).push(task);
      }
    }

    // cuByUid — TODAS as tasks (inclui subtasks) → usado apenas para métricas
    // parentByUid — apenas tasks raiz (sem parent) → usada para exibição no grid
    const cuByUid     = new Map();
    const parentByUid = new Map();
    for (const task of allCuTasks) {
      for (const a of (Array.isArray(task.assignees) ? task.assignees : [])) {
        const sysUser = matchAssignee(a);
        if (!sysUser) continue;
        const uid = Number(sysUser.id);
        if (!cuByUid.has(uid)) cuByUid.set(uid, []);
        cuByUid.get(uid).push(task);
        if (!task.parent) {
          if (!parentByUid.has(uid)) parentByUid.set(uid, []);
          parentByUid.get(uid).push(task);
        }
      }
    }

    const members = usersRes.rows.map((user) => {
      const uid          = Number(user.id);
      const tasks        = cuByUid.get(uid) || [];        // todas as tasks (inclui subtasks) — para pts/horas
      const parentTasks  = parentByUid.get(uid) || [];    // só tasks raiz — para contagem done/total
      const horas        = horasMap.get(uid) || 0;

      const dailyGoal    = Number(user.daily_points_goal);
      const weeklyGoal   = dailyGoal * 5;
      // Meta 120% customizada (PDF); fallback para cálculo matemático se não definida
      const weeklyGoal120 = Number(user.weekly_goal_120) > 0
        ? Number(user.weekly_goal_120)
        : Math.round(weeklyGoal * 1.2);
      const cargoLc    = (user.cargo || '').toLowerCase();
      const isCompletionBased =
        cargoLc.includes('storymaker') || cargoLc.includes('ugc') || cargoLc.includes('publisher');

      // Contagem de done/total: snapshot atual de todas as tasks-pai (sem filtro de período)
      // Tasks em 'aprovar'/'publicar' contam como done (cuTaskDone=true)
      // O filtro de período se aplica apenas a pts e horas ganhos (doneTasksForMetrics abaixo)
      const doneToday  = parentTasks.filter(t => cuTaskDone(t)).length;
      const totalToday = parentTasks.length;

      const wdb         = weekPtsMap.get(uid) || { pts_semana: 0, done_semana: 0, total_semana: 0 };
      const routineData = routinePtsMap.get(uid) || { routine_pts: 0, routine_done: 0 };
      const ptsSemana   = Number(wdb.pts_semana) + Number(routineData.routine_pts);
      const doneSemana  = doneToday + Number(routineData.routine_done);
      // totalSemana nunca menor que doneSemana (rotinas somam ao done mas não havia contrapartida no total)
      const totalSemana = Math.max(totalToday + Number(routineData.routine_done), doneSemana);

      // Extrai pontos do campo "Ponto de atividade MKT" (seção 1)
      const extractCuPts = (t) => {
        if (!Array.isArray(t.custom_fields)) return 0;
        const pf = t.custom_fields.find(f =>
          /ponto de atividade mkt/i.test(f.name || '') ||
          (/ponto.*atividade|atividade.*ponto/i.test(f.name || '') && f.value != null)
        ) || t.custom_fields.find(f => /ponto|point/i.test(f.name || '') && f.value != null);
        if (!pf || pf.value == null) return 0;
        const pv = Number(pf.value);
        return Number.isFinite(pv) && pv > 0 ? pv : 0;
      };

      // Extrai time_spent do ClickUp (ms → horas) — seção 1
      const extractTimeSpent = (t) => {
        const ms = Number(t.time_spent || 0);
        return ms > 0 ? ms / 3600000 : 0;
      };

      // Tasks concluídas no período para pts e horas
      const doneTasksForMetrics = (periodFromMs && periodToMs)
        ? tasks.filter(t => {
            if (!cuTaskDone(t)) return false;
            const closedMs = Number(t.date_closed || t.date_done || 0);
            return closedMs >= periodFromMs && closedMs <= periodToMs;
          })
        : tasks.filter(t => cuTaskDone(t));

      // Pts das tasks concluídas no período
      const ptsToday = doneTasksForMetrics.reduce((sum, t) => sum + extractCuPts(t), 0);

      // Pts de todas as tasks (informativo — NÃO usado para ranking nem barra de progresso)
      const ptsTotalSemana = tasks.reduce((sum, t) => sum + extractCuPts(t), 0);

      // Barra de progresso e ranking usam apenas pts GANHOS (done tasks)
      const ptsParaBarra = ptsSemana || ptsToday || 0;

      // Horas via time_spent no período — cap 16h/dia
      const HORA_CAP_DIA = 16;
      const dayHoras = {};
      for (const t of doneTasksForMetrics) {
        const closedMs = Number(t.date_closed || t.date_done || 0);
        const dayKey   = closedMs > 0
          ? new Date(closedMs - 3 * 3600000).toISOString().slice(0, 10)
          : todayStr;
        const h = extractTimeSpent(t);
        if (h <= 0) continue;
        if (!dayHoras[dayKey]) dayHoras[dayKey] = { total: 0, porEmpresa: {} };
        const remaining = Math.max(0, HORA_CAP_DIA - dayHoras[dayKey].total);
        const applied = Math.min(h, remaining);
        dayHoras[dayKey].total += applied;
        const empresa = resolveEmpresa(t);
        dayHoras[dayKey].porEmpresa[empresa] = (dayHoras[dayKey].porEmpresa[empresa] || 0) + applied;
      }
      const horasPorEmpresa = { 'SeuBoné': 0, 'Onevo': 0, 'Carbone': 0, 'Não classificado': 0 };
      let horasCuTotal = 0;
      for (const { total, porEmpresa } of Object.values(dayHoras)) {
        horasCuTotal += total;
        for (const [e, h] of Object.entries(porEmpresa)) {
          horasPorEmpresa[e] = (horasPorEmpresa[e] || 0) + h;
        }
      }

      // Aviso de tasks ativas sem campos obrigatórios (seção 4)
      const missingFieldsCount = tasks.filter(t => {
        if (cuTaskDone(t)) return false;
        const hasEmpresa = resolveEmpresa(t) !== 'Não classificado';
        const hasPontos  = extractCuPts(t) > 0;
        const hasDueDate = Number(t.due_date || 0) > 0;
        return !hasDueDate || !hasEmpresa || !hasPontos;
      }).length;

      // weekPct: banco local tem prioridade; fallback para ClickUp
      const weekPct = isCompletionBased
        ? (totalSemana > 0 ? Math.round((doneSemana / totalSemana) * 100)
          : totalToday  > 0 ? Math.round((doneToday  / totalToday)  * 100) : 0)
        : (weeklyGoal  > 0 ? Math.round((ptsParaBarra / weeklyGoal) * 100) : 0);

      // % meta real (em relação à meta 100%)
      const percentualMeta = weeklyGoal > 0 ? Math.round((ptsParaBarra / weeklyGoal) * 100) : 0;
      // metaStatus usa os limites customizados do PDF (ex: Bia 120% = 50 pts, não 36)
      const metaStatus = ptsParaBarra >= weeklyGoal120 ? 'above_120'
                       : ptsParaBarra >= weeklyGoal    ? 'above_100'
                       : 'below_100';

      const weekLabel = isCompletionBased ? 'Conclusão' : `Sem ${weekNum}`;
      // Usa horas ClickUp se disponíveis; fallback para banco local
      const horasEfetivas = horasCuTotal > 0 ? horasCuTotal : horas;
      // Coeficiente — Regras do Sistema (PDF)
      // Grupo Pontos: pts/meta×50% + done/total×35% + horas/16h×15%
      // Malu/Zion (isCompletionBased): done/total×70% + horas/16h×30% — sem pts, pode passar 100%
      const _cuTaskRate = totalToday > 0 ? doneToday / totalToday : 0;
      const _cuHoraRate = horasEfetivas / 16; // sem cap — pode ultrapassar 100%
      const _cuPtsRate  = weeklyGoal > 0 ? ptsParaBarra / weeklyGoal : 0;
      const coef        = isCompletionBased
        ? Math.round((_cuTaskRate * 0.70 + _cuHoraRate * 0.30) * 100)
        : Math.round((_cuPtsRate  * 0.50 + _cuTaskRate * 0.35 + _cuHoraRate * 0.15) * 100);

      let horasH = Math.floor(horasEfetivas);
      let horasM = Math.round((horasEfetivas - horasH) * 60);
      if (horasM >= 60) { horasH += 1; horasM = 0; }
      const horasStr = horasEfetivas > 0.01
        ? `${horasH}h ${String(horasM).padStart(2, '0')}min validadas`
        : '0h validadas';

      return {
        id: uid,
        name:   user.name,
        cargo:  user.cargo || '',
        dailyGoal,
        weeklyGoal,
        weeklyGoal120,
        weekNum,
        weekLabel,
        weekPct,
        percentualMeta,
        metaStatus,
        ptsToday,
        doneToday,
        totalToday,
        doneSemana,
        totalSemana,
        ptsSemana,
        ptsTotalSemana,
        horas: horasEfetivas,
        horasPorEmpresa,
        horasStr,
        coef,
        missingFieldsCount,
        dailyPct: Math.min(weekPct, 150),
        isCompletionBased,
        tasks: (parentByUid.get(uid) || []).slice(0, isFiltered ? 100 : 25).map((t) => {
          const pts     = extractCuPts(t);
          const empresa = resolveEmpresa(t);
          const subs    = (subtasksByParent.get(t.id) || []).map((sub) => ({
            id:          sub.id,
            title:       sub.name || '—',
            is_done:     cuTaskDone(sub),
            statusLabel: sub.status?.status || '',
            statusColor: sub.status?.color  || null,
            statusCat:   cuTaskStatusCat(sub),
            points:      extractCuPts(sub) > 0 ? extractCuPts(sub) : null,
          }));
          return {
            id:          t.id,
            title:       t.name || '—',
            category:    t.list?.name || null,
            empresa,
            points:      pts > 0 ? pts : null,
            is_done:     cuTaskDone(t),
            statusLabel: t.status?.status || '',
            statusColor: t.status?.color  || null,
            statusCat:   cuTaskStatusCat(t),
            subtasks:    subs,
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
      const cuRes = await fetchClickUp(
        `https://api.clickup.com/api/v2/list/${listId}/task?page=0&include_closed=false&order_by=created&reverse=true`,
        token
      );
      if (!cuRes.ok) {
        const errBody = await cuRes.text();
        return json(res, 502, { error: `ClickUp retornou ${cuRes.status}: ${errBody.slice(0, 200)}` });
      }
      const cuData = await cuRes.json();
      cuTasks = cuData.tasks || [];
    } catch (fetchErr) {
      const msg = isNetworkError(fetchErr.message)
        ? 'Sem resposta do ClickUp — tente novamente em instantes.'
        : `Erro ao chamar ClickUp: ${fetchErr.message}`;
      return json(res, 502, { error: msg });
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

      // Pontos via campo "Ponto de atividade MKT" (seção 1)
      let points = null;
      if (Array.isArray(task.custom_fields)) {
        const pf = task.custom_fields.find(f =>
          /ponto de atividade mkt/i.test(f.name || '') ||
          (/ponto.*atividade|atividade.*ponto/i.test(f.name || '') && f.value != null)
        ) || task.custom_fields.find(f => /ponto|point/i.test(f.name || '') && f.value != null);
        if (pf && pf.value != null) {
          const pv = Number(pf.value);
          if ([1, 2, 3, 5, 8].includes(pv)) points = pv;
        }
      }

      const isDone    = cuTaskDone(task);
      const category  = task.list?.name || null;
      // date_closed como referência histórica (seção 6)
      const closedAt  = isDone && Number(task.date_closed || task.date_done || 0) > 0
        ? new Date(Number(task.date_closed || task.date_done)).toISOString()
        : null;

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
          `INSERT INTO focus_tasks (user_id, title, category, points, is_done, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uid, title, category, points, isDone, closedAt]
        );
        created++;
      }
    }

    return json(res, 200, { success: true, created, skipped, total: cuTasks.length });
  }

  // ── GET clickup-history ───────────────────────────────────────────────
  // Histórico semanal direto do ClickUp — usa date_closed como referência (seção 6)
  if (req.method === 'GET' && action === 'clickup-history') {
    const token  = (process.env.CLICKUP_TOKEN  || '').trim();
    const listId = (process.env.CLICKUP_LIST_ID || '').trim();
    if (!token || !listId) return json(res, 400, { error: 'ClickUp não configurado.', source: 'not_configured' });

    const { from, to, userId: qUserId } = req.query;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return json(res, 400, { error: 'Params from e to são obrigatórios (YYYY-MM-DD).' });
    }
    if (qUserId && auth.role !== 'admin' && parseInt(qUserId, 10) !== auth.sub) {
      return json(res, 403, { error: 'Forbidden.' });
    }

    const fromMs = new Date(`${from}T00:00:00-03:00`).getTime();
    const toMs   = new Date(`${to}T23:59:59-03:00`).getTime();

    // Busca tasks do ClickUp com paginação — sem filtro de data server-side pois
    // date_done pode ser null em tasks com status "done" customizado (ex: "Concluído")
    const allCuTasks = [];
    const MAX_PAGES = 5;
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await fetchClickUp(
        `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=true&page=${page}`,
        token
      );
      if (!r.ok) {
        if (page === 0) return json(res, 502, { error: `ClickUp ${r.status}` });
        break;
      }
      const body = await r.json();
      const pageTasks = body.tasks || [];
      allCuTasks.push(...pageTasks);
      if (body.last_page || pageTasks.length < 100) break;
    }

    // Filtra client-side: concluídas E dentro do período
    // Usa date_closed → date_done → date_updated como fallback de timestamp
    const tasks = allCuTasks.filter(t => {
      if (!cuTaskDone(t)) return false;
      const closedMs = Number(t.date_closed || t.date_done || t.date_updated || 0);
      return closedMs >= fromMs && closedMs <= toMs;
    });

    // Carrega usuários do sistema com ClickUp user ID
    let usersRes;
    try {
      usersRes = await db.query(
        `SELECT id, name, COALESCE(cargo,'') AS cargo,
                COALESCE(daily_points_goal,26) AS daily_points_goal,
                COALESCE(clickup_email,'') AS clickup_email,
                clickup_user_id
         FROM users WHERE active = TRUE ORDER BY name`
      );
    } catch {
      usersRes = await db.query(
        `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, '' AS clickup_email, NULL::bigint AS clickup_user_id
         FROM users WHERE active = TRUE ORDER BY name`
      );
    }

    let allUsers = usersRes.rows;
    if (qUserId) allUsers = allUsers.filter(u => u.id === parseInt(qUserId, 10));

    // Mapas: ClickUp user ID (primário) > email > nome
    const cuById    = new Map();
    const cuByEmail = new Map();
    const cuByName  = new Map();
    for (const u of allUsers) {
      if (u.clickup_user_id) cuById.set(String(u.clickup_user_id), u);
      if (u.clickup_email)   cuByEmail.set(u.clickup_email.toLowerCase().trim(), u);
      const key = u.name.toLowerCase().trim();
      cuByName.set(key, u);
      const first = key.split(' ')[0];
      if (!cuByName.has(first)) cuByName.set(first, u);
    }
    const matchCuAssignee = (a) => {
      const cuId = String(a.id || '');
      if (cuId && cuById.has(cuId)) return cuById.get(cuId);
      const email = (a.email || '').toLowerCase().trim();
      if (email && cuByEmail.has(email)) return cuByEmail.get(email);
      const uname = (a.username || '').toLowerCase().trim();
      const first = uname.split(' ')[0];
      if (first && cuByName.has(first)) return cuByName.get(first);
      const seg = email.split('@')[0].split('.')[0];
      if (seg && cuByName.has(seg)) return cuByName.get(seg);
      if (first) for (const [k, u] of cuByName) { if (k.startsWith(first) || first.startsWith(k)) return u; }
      return null;
    };

    // Índice de tasks por usuário
    const tasksByUid = new Map();
    for (const task of tasks) {
      for (const a of (Array.isArray(task.assignees) ? task.assignees : [])) {
        const u = matchCuAssignee(a);
        if (!u) continue;
        const uid = Number(u.id);
        if (!tasksByUid.has(uid)) tasksByUid.set(uid, []);
        tasksByUid.get(uid).push(task);
      }
    }

    // Helper: extrai pontos de uma task (campo "Ponto de atividade MKT")
    const extractPts = (t) => {
      if (!Array.isArray(t.custom_fields)) return 0;
      const pf = t.custom_fields.find(f =>
        /ponto de atividade mkt/i.test(f.name || '') ||
        (/ponto.*atividade|atividade.*ponto/i.test(f.name || '') && f.value != null)
      ) || t.custom_fields.find(f => /ponto|point/i.test(f.name || '') && f.value != null);
      if (!pf || pf.value == null) return 0;
      const pv = Number(pf.value);
      return Number.isFinite(pv) && pv > 0 ? pv : 0;
    };

    // Helper: semana (segunda) que contém uma data
    const mondayOf = (dateStr) => {
      const d = new Date(`${dateStr}T00:00:00Z`);
      const dow = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - dow + 1);
      return d.toISOString().slice(0, 10);
    };

    // Constrói lista de semanas no período
    const firstMonday = mondayOf(from);
    const weekStarts = [];
    let cur = new Date(`${firstMonday}T00:00:00Z`);
    while (cur <= new Date(`${to}T00:00:00Z`)) {
      weekStarts.push(cur.toISOString().slice(0, 10));
      cur = new Date(cur);
      cur.setUTCDate(cur.getUTCDate() + 7);
    }

    const todayStr = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const HORA_CAP_DIA = 16;

    const usersWithWeeks = allUsers.map(user => {
      const dailyGoal  = Number(user.daily_points_goal) || 26;
      const weeklyGoal = dailyGoal * 5;
      const meta100    = weeklyGoal;
      const meta120    = Math.round(weeklyGoal * 1.2);
      const userTasks  = tasksByUid.get(Number(user.id)) || [];

      const weekData = weekStarts.map((weekStart, i) => {
        const weekEndObj = new Date(`${weekStart}T00:00:00Z`);
        weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
        const weekEnd   = weekEndObj.toISOString().slice(0, 10);
        const isLive    = weekStart <= todayStr && todayStr <= weekEnd;
        const wFromMs   = new Date(`${weekStart}T00:00:00Z`).getTime();
        const wToMs     = new Date(`${weekEnd}T23:59:59Z`).getTime();

        // Tasks concluídas nesta semana (pelo date_closed BRT)
        const weekTasks = userTasks.filter(t => {
          const closedMs = Number(t.date_closed || t.date_done || 0);
          return closedMs >= wFromMs && closedMs <= wToMs;
        });

        // Pontos da semana
        const pts = weekTasks.reduce((sum, t) => sum + extractPts(t), 0);

        // Horas via time_spent com cap 16h/dia
        const dayH = {};
        for (const t of weekTasks) {
          const closedMs = Number(t.date_closed || t.date_done || 0);
          const dayKey   = closedMs > 0 ? new Date(closedMs - 3 * 3600000).toISOString().slice(0, 10) : weekStart;
          const h = Number(t.time_spent || 0) / 3600000;
          if (h <= 0) continue;
          dayH[dayKey] = (dayH[dayKey] || 0);
          const remaining = Math.max(0, HORA_CAP_DIA - dayH[dayKey]);
          dayH[dayKey] += Math.min(h, remaining);
        }
        const horas = parseFloat(Object.values(dayH).reduce((s, h) => s + h, 0).toFixed(2));

        const percentualMeta = weeklyGoal > 0 ? Math.round((pts / weeklyGoal) * 100) : 0;
        const metaStatus     = percentualMeta >= 120 ? 'above_120' : percentualMeta >= 100 ? 'above_100' : 'below_100';
        const pct            = percentualMeta;
        const stars          = pct >= 100 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;

        return { weekIndex: i + 1, weekStart, weekEnd, isLive, pts, horas, pct, percentualMeta, metaStatus, stars, tasksDone: weekTasks.length };
      });

      return { id: user.id, name: user.name, cargo: user.cargo, dailyGoal, weeklyGoal, meta100, meta120, weeks: weekData };
    });

    const weekLabels = weekStarts.map((ws, i) => {
      const weekEndObj = new Date(`${ws}T00:00:00Z`);
      weekEndObj.setUTCDate(weekEndObj.getUTCDate() + 6);
      const wEnd   = weekEndObj.toISOString().slice(0, 10);
      const isLive = ws <= todayStr && todayStr <= wEnd;
      return { index: i + 1, weekStart: ws, weekEnd: wEnd, isLive };
    });

    return json(res, 200, { from, to, source: 'clickup', weeks: weekLabels, users: usersWithWeeks });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
  } catch (err) {
    console.error('[focus] error:', err.message, err.stack);
    const msg = isNetworkError(err.message)
      ? 'Erro de conexão temporário. Aguarde alguns segundos e atualize a página.'
      : (err.message || 'Erro inesperado.');
    return json(res, 500, { error: msg });
  }
};