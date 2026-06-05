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
  if (/altera[cç]|revis[ãa]o?|feedback|ajuste|corre[cç]|rework|change/i.test(s))    return 'revision';
  if (/l[ií]der|leader/i.test(s))                                                    return 'approval';
  if (/andamento|in.?progress|progresso|working|doing|fazendo|em.?curso/i.test(s))   return 'doing';
  return 'todo';
}

// §4 — task aparece no Painel Daily se qualquer condição for verdadeira
function isDailyTask(t, todayStr) {
  const dueDateMs = Number(t.due_date || 0);
  const dueStr    = dueDateMs > 0 ? new Date(dueDateMs).toISOString().slice(0, 10) : null;
  const statusLc  = (t.status?.status || '').toLowerCase().trim();
  if (/altera[cç]|revis[ãa]/i.test(statusLc)) return true; // voltou para fila (cond. 3)
  if (dueStr === todayStr) return true;                      // vence hoje (cond. 1)
  if (dueStr && dueStr < todayStr && !cuTaskDone(t)) return true; // atrasada (cond. 2)
  return false;
}

// ── Helpers de snapshot (§7) ─────────────────────────────────────────────
function extractPtsSnap(t) {
  if (!Array.isArray(t.custom_fields)) return 0;
  const pf = t.custom_fields.find(f =>
    /ponto de atividade mkt/i.test(f.name || '') ||
    (/ponto.*atividade|atividade.*ponto/i.test(f.name || '') && f.value != null)
  ) || t.custom_fields.find(f => /ponto|point/i.test(f.name || '') && f.value != null);
  if (!pf || pf.value == null) return 0;
  const pv = Number(pf.value);
  return Number.isFinite(pv) && pv > 0 ? pv : 0;
}

function calcCoinsMeta(pts, meta100, meta120) {
  if (pts >= meta120)        return 4;
  if (pts >= meta100)        return 3;
  if (pts >= meta100 * 0.80) return 2;
  if (pts >= meta100 * 0.60) return 1;
  return 0;
}

function calcCoinsRanking(pos) {
  if (pos === 1) return 3;
  if (pos === 2) return 2;
  if (pos === 3) return 1;
  return 0;
}

function isoWeekId(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function mondayOfDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dow + 1);
  return d;
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
       WHERE (
         (is_done = TRUE AND COALESCE(completed_at, created_at) >= $1::timestamptz)
         OR
         (is_done = FALSE AND status_cat = 'approval' AND COALESCE(updated_at, created_at) >= $1::timestamptz)
       )
       GROUP BY user_id`,
      [periodStartDate]
    ).catch(() => db.query(
      `SELECT user_id, COUNT(*)::int AS tasks_done
       FROM focus_tasks
       WHERE is_done = TRUE AND COALESCE(completed_at, created_at) >= $1::timestamptz
       GROUP BY user_id`,
      [periodStartDate]
    ));

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
                COALESCE(weekly_pts_120, ROUND(daily_points_goal*5*1.2)) AS weekly_pts_120
         FROM users WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE ORDER BY name`
      );
    } catch {
      usersRes = await db.query(
        `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, 156 AS weekly_pts_120
         FROM users WHERE active = TRUE ORDER BY name`
      );
    }

    // Detect which optional columns exist in focus_tasks
    const colCheck = await db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'focus_tasks'
         AND column_name IN ('points','start_date','end_date','status_cat','updated_at')`
    );
    const cols = new Set(colCheck.rows.map((r) => r.column_name));
    const hasPoints    = cols.has('points');
    const hasDateRange = cols.has('start_date') && cols.has('end_date');
    const hasStatusCat = cols.has('status_cat') && cols.has('updated_at');

    // Build WHERE for today (with or without start_date/end_date)
    const todayWhere = hasDateRange
      ? `(DATE(created_at) = $1::date
           OR (start_date <= $1::date AND (end_date IS NULL OR end_date >= $1::date)))`
      : `DATE(created_at) = $1::date`;

    // approval conta pontos; revision = 0; done = pontos integrais
    const ptsCond = hasStatusCat
      ? `(is_done = TRUE OR status_cat = 'approval')`
      : `is_done`;
    const ptsExpr = hasPoints
      ? `COALESCE(SUM(CASE WHEN ${ptsCond} THEN COALESCE(points,0) ELSE 0 END),0)::int`
      : `0::int`;

    // Para pts semanais: tasks done filtradas por completed_at; tasks em approval filtradas por updated_at
    const weekPtsSql = hasStatusCat && hasPoints
      ? `COALESCE(SUM(
           CASE WHEN is_done = TRUE AND DATE(COALESCE(completed_at, COALESCE(updated_at, created_at))) >= $1::date
                                   AND DATE(COALESCE(completed_at, COALESCE(updated_at, created_at))) <= $2::date
                THEN COALESCE(points,0)
                WHEN is_done = FALSE AND status_cat = 'approval'
                     AND DATE(COALESCE(updated_at, created_at)) >= $1::date
                     AND DATE(COALESCE(updated_at, created_at)) <= $2::date
                THEN COALESCE(points,0)
                ELSE 0 END
         ),0)::int`
      : `COALESCE(SUM(CASE WHEN is_done THEN COALESCE(points,0) ELSE 0 END),0)::int`;

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
                ${weekPtsSql} AS pts_semana,
                COUNT(*)::int AS total_semana,
                SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_semana
         FROM focus_tasks
         WHERE ${hasStatusCat
           ? `DATE(COALESCE(updated_at, created_at)) >= $1::date AND DATE(COALESCE(updated_at, created_at)) <= $2::date`
           : `DATE(created_at) >= $1::date AND DATE(created_at) <= $2::date`}
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

    // Conclusões de rotina da semana (apenas para usuários isCompletionBased — Malu/Zion)
    // Pontos de rotina NÃO somam ao ptsSemana: rotinas não têm pontuação (F5.20)
    let routinePtsMap = new Map();
    try {
      const routinePtsRes = await db.query(
        `SELECT rc.user_id,
                COUNT(rc.id)::int AS routine_done
         FROM routine_completions rc
         JOIN user_routines ur ON ur.id = rc.routine_id AND ur.active = TRUE
         WHERE rc.completed_date >= $1 AND rc.completed_date <= $2
           AND rc.status = 'done'
         GROUP BY rc.user_id`,
        [weekStart, todayStr]
      );
      routinePtsMap = new Map(routinePtsRes.rows.map(r => [Number(r.user_id), { routine_pts: 0, routine_done: Number(r.routine_done) }]));
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
      const weeklyGoal120 = Number(user.weekly_pts_120 || Math.round(weeklyGoal * 1.2));

      const ptsToday    = Number(stats.pts_today);
      const doneToday   = Number(stats.done_today);
      const totalToday  = Number(stats.total_today);
      const routineData = routinePtsMap.get(uid) || { routine_pts: 0, routine_done: 0 };
      // ptsSemana = apenas tasks (rotinas não têm pontos — F5.20)
      const ptsSemana   = Number(wstats.pts_semana);
      // doneSemana/totalSemana: soma rotinas para isCompletionBased (Malu/Zion)
      const doneSemana  = Number(wstats.done_semana) + Number(routineData.routine_done);
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

      const metaStatus = ptsSemana >= weeklyGoal120 ? 'above_120'
                       : ptsSemana >= weeklyGoal    ? 'above_100'
                       : 'below_100';

      let horasH = Math.floor(horas);
      let horasM = Math.round((horas - horasH) * 60);
      if (horasM >= 60) { horasH += 1; horasM = 0; }
      const horasStr = horas > 0.01
        ? `${horasH}h ${String(horasM).padStart(2,'0')}min validadas`
        : '0h validadas';

      return {
        id: uid,
        name: user.name,
        cargo: user.cargo || '',
        dailyGoal,
        weeklyGoal,
        weeklyGoal120,
        metaStatus,
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
                COALESCE(weekly_pts_120, ROUND(daily_points_goal*5*1.2)) AS weekly_pts_120,
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
                  COALESCE(clickup_email,'') AS clickup_email, NULL::bigint AS clickup_user_id
           FROM users WHERE active = TRUE
             AND COALESCE(show_in_daily, TRUE) = TRUE
           ORDER BY name`
        );
      } catch {
        usersRes = await db.query(
          `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, '' AS clickup_email, NULL::bigint AS clickup_user_id
           FROM users WHERE active = TRUE ORDER BY name`
        );
      }
    }

    const weekStart = monday.toISOString().slice(0, 10);

    // Detecta se colunas de status_cat/updated_at existem para scoring avançado
    let liveHasStatusCat = false;
    try {
      const sc2 = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='focus_tasks'
           AND column_name IN ('status_cat','updated_at')`
      );
      liveHasStatusCat = sc2.rowCount >= 2;
    } catch { /* pré-migração: usa scoring antigo */ }

    const liveWeekFilter = liveHasStatusCat
      ? `DATE(COALESCE(updated_at, created_at)) >= $1 AND DATE(COALESCE(updated_at, created_at)) <= $2`
      : `DATE(created_at) >= $1 AND DATE(created_at) <= $2`;
    const liveWeekPts = liveHasStatusCat
      ? `COALESCE(SUM(
           CASE WHEN is_done = TRUE
                     AND DATE(COALESCE(completed_at, COALESCE(updated_at, created_at))) >= $1
                     AND DATE(COALESCE(completed_at, COALESCE(updated_at, created_at))) <= $2
                THEN COALESCE(points,0)
                WHEN is_done = FALSE AND status_cat = 'approval'
                     AND DATE(COALESCE(updated_at, created_at)) >= $1
                     AND DATE(COALESCE(updated_at, created_at)) <= $2
                THEN COALESCE(points,0)
                ELSE 0 END
         ),0)::int`
      : `COALESCE(SUM(CASE WHEN is_done THEN COALESCE(points,0) ELSE 0 END),0)::int`;

    // Queries do banco em paralelo — reduz tempo de ~4×latência para ~1×latência
    const [horasRes, weekPtsRes, routinePtsRes] = await Promise.all([
      db.query(
        `SELECT user_id, COALESCE(SUM(hours),0)::float AS horas_hoje
         FROM time_entries WHERE work_date = $1::date GROUP BY user_id`,
        [todayStr]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT user_id,
                ${liveWeekPts} AS pts_semana,
                SUM(CASE WHEN is_done THEN 1 ELSE 0 END)::int AS done_semana,
                COUNT(*)::int AS total_semana
         FROM focus_tasks
         WHERE ${liveWeekFilter}
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
      const weeklyGoal120 = Number(user.weekly_pts_120 || Math.round(weeklyGoal * 1.2));
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
      const routinePts  = Number(routineData.routine_pts);
      const doneSemana  = doneToday + Number(routineData.routine_done);
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

      // Tasks concluídas no período para pts e horas — tasks-pai E subtasks concluídas
      // done/total usa só parentTasks (para não inflar X/Y); pts usa ALL tasks (pai + subtasks)
      const donePtsTasks = (periodFromMs && periodToMs)
        ? tasks.filter(t => {
            if (!cuTaskDone(t)) return false;
            const closedMs = Number(t.date_closed || t.date_done || 0);
            return closedMs >= periodFromMs && closedMs <= periodToMs;
          })
        : tasks.filter(t => cuTaskDone(t));

      // Pts das tasks-pai E subtasks concluídas + rotinas (fonte: ClickUp ao vivo)
      // DB focus_tasks (wdb.pts_semana) é descartado aqui — dados desatualizados do último sync
      const ptsCuDone  = donePtsTasks.reduce((sum, t) => sum + extractCuPts(t), 0);
      const ptsSemana  = ptsCuDone + routinePts;
      const ptsToday   = ptsCuDone;
      const ptsParaBarra = ptsSemana;

      // Horas via time_spent — TODAS as tasks da semana (completas e em andamento), cap 16h/dia
      const HORA_CAP_DIA = 16;
      const horasTasks = (periodFromMs && periodToMs)
        ? tasks.filter(t => {
            const updatedMs = Number(t.date_updated || t.date_closed || t.date_done || 0);
            return updatedMs >= periodFromMs && updatedMs <= periodToMs;
          })
        : tasks;
      const dayHoras = {};
      for (const t of horasTasks) {
        const refMs  = Number(t.date_updated || t.date_closed || t.date_done || 0);
        const dayKey = refMs > 0
          ? new Date(refMs - 3 * 3600000).toISOString().slice(0, 10)
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

      // Aviso de tasks ativas sem campos obrigatórios — apenas tasks-pai
      const missingFieldsCount = parentTasks.filter(t => {
        if (cuTaskDone(t)) return false;
        const hasEmpresa = resolveEmpresa(t) !== 'Não classificado';
        const hasPontos  = extractCuPts(t) > 0;
        const hasDueDate = Number(t.due_date || 0) > 0;
        return !hasDueDate || !hasEmpresa || !hasPontos;
      }).length;

      // weekPct: baseado nos pts ClickUp ao vivo (ptsParaBarra já inclui rotinas)
      const weekPct = isCompletionBased
        ? (totalSemana > 0 ? Math.round((doneSemana / totalSemana) * 100)
          : totalToday  > 0 ? Math.round((doneToday  / totalToday)  * 100) : 0)
        : (weeklyGoal  > 0 ? Math.round((ptsParaBarra / weeklyGoal) * 100) : 0);

      // % meta real e status usando thresholds individuais do banco (PDF)
      const percentualMeta = weeklyGoal > 0 ? Math.round((ptsParaBarra / weeklyGoal) * 100) : 0;
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
        horas: horasEfetivas,
        horasPorEmpresa,
        horasStr,
        coef,
        missingFieldsCount,
        dailyPct: Math.min(weekPct, 150),
        isCompletionBased,
        tasks: (isFiltered
          ? (parentByUid.get(uid) || [])
          : (parentByUid.get(uid) || []).filter(t => isDailyTask(t, todayStr))
        ).slice(0, isFiltered ? 100 : 25).map((t) => {
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
          const dueDateMs = Number(t.due_date || 0);
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
            due_date:    dueDateMs > 0 ? new Date(dueDateMs).toISOString().slice(0, 10) : null,
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

    // Detecta se colunas de status_cat e updated_at já existem (pós-migração)
    let hasSyncCols = false;
    try {
      const sc = await db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='focus_tasks'
           AND column_name IN ('clickup_task_id','status_cat','updated_at')`
      );
      hasSyncCols = sc.rowCount >= 3;
    } catch { /* ignora */ }

    let created = 0, updated = 0, skipped = 0;

    for (const task of cuTasks) {
      const title         = (task.name || '').trim();
      const clickupTaskId = String(task.id || '').trim();
      if (!title || !clickupTaskId) continue;

      // Pontos via campo "Ponto de atividade MKT"
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
      const statusCat = cuTaskStatusCat(task);
      const category  = task.list?.name || null;
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
          for (const [sysName, sysId] of userMap) {
            if (sysName.startsWith(lookupName) || lookupName.startsWith(sysName)) {
              uid = sysId; break;
            }
          }
        }
        if (!uid) { skipped++; continue; }

        if (hasSyncCols) {
          // UPSERT por (user_id, clickup_task_id): atualiza status_cat/is_done a cada sync
          const result = await db.query(
            `INSERT INTO focus_tasks
               (user_id, title, category, points, is_done, completed_at, clickup_task_id, status_cat, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
             ON CONFLICT (user_id, clickup_task_id) WHERE clickup_task_id IS NOT NULL
             DO UPDATE SET
               status_cat   = EXCLUDED.status_cat,
               is_done      = EXCLUDED.is_done,
               completed_at = COALESCE(EXCLUDED.completed_at, focus_tasks.completed_at),
               points       = COALESCE(EXCLUDED.points, focus_tasks.points),
               title        = EXCLUDED.title,
               category     = EXCLUDED.category,
               updated_at   = NOW()
             RETURNING (xmax = 0) AS inserted`,
            [uid, title, category, points, isDone, closedAt, clickupTaskId, statusCat]
          );
          if (result.rows[0]?.inserted) created++; else updated++;
        } else {
          // Fallback: comportamento antigo (dedup por title+dia)
          const nowBRT  = new Date(Date.now() - 3 * 60 * 60 * 1000);
          const todayBR = nowBRT.toISOString().slice(0, 10);
          const exists  = await db.query(
            `SELECT 1 FROM focus_tasks WHERE user_id=$1 AND title=$2 AND DATE(created_at)=$3 LIMIT 1`,
            [uid, title, todayBR]
          );
          if (exists.rowCount > 0) { skipped++; continue; }
          await db.query(
            `INSERT INTO focus_tasks (user_id, title, category, points, is_done, completed_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [uid, title, category, points, isDone, closedAt]
          );
          created++;
        }
      }
    }

    return json(res, 200, { success: true, created, updated, skipped, total: cuTasks.length });
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

        // Horas via time_spent com cap 16h/dia — com breakdown por empresa (§6)
        const dayH = {};
        for (const t of weekTasks) {
          const closedMs = Number(t.date_closed || t.date_done || 0);
          const dayKey   = closedMs > 0 ? new Date(closedMs - 3 * 3600000).toISOString().slice(0, 10) : weekStart;
          const h = Number(t.time_spent || 0) / 3600000;
          if (h <= 0) continue;
          if (!dayH[dayKey]) dayH[dayKey] = { total: 0, porEmpresa: {} };
          const remaining = Math.max(0, HORA_CAP_DIA - dayH[dayKey].total);
          const applied   = Math.min(h, remaining);
          dayH[dayKey].total += applied;
          const empresa = resolveEmpresa(t);
          dayH[dayKey].porEmpresa[empresa] = (dayH[dayKey].porEmpresa[empresa] || 0) + applied;
        }
        const horasPorEmpresa = { 'SeuBoné': 0, 'Onevo': 0, 'Carbone': 0, 'Não classificado': 0 };
        let horasRaw = 0;
        for (const { total, porEmpresa } of Object.values(dayH)) {
          horasRaw += total;
          for (const [e, h] of Object.entries(porEmpresa)) {
            horasPorEmpresa[e] = (horasPorEmpresa[e] || 0) + h;
          }
        }
        const horas = parseFloat(horasRaw.toFixed(2));

        const percentualMeta = weeklyGoal > 0 ? Math.round((pts / weeklyGoal) * 100) : 0;
        const metaStatus     = percentualMeta >= 120 ? 'above_120' : percentualMeta >= 100 ? 'above_100' : 'below_100';
        const pct            = percentualMeta;
        const stars          = pct >= 100 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;

        return { weekIndex: i + 1, weekStart, weekEnd, isLive, pts, horas, horasPorEmpresa, pct, percentualMeta, metaStatus, stars, tasksDone: weekTasks.length };
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

  // ── GET snapshot-list ─────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'snapshot-list') {
    const snaps = await db.query(
      `SELECT id, semana_id, week_start, week_end, status, calculado_em, validado_em, validado_por
       FROM week_snapshots ORDER BY week_start DESC LIMIT 52`
    ).catch(() => ({ rows: [] }));
    return json(res, 200, { snapshots: snaps.rows });
  }

  // ── GET snapshot-get ──────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'snapshot-get') {
    const { semana_id } = req.query;
    if (!semana_id) return json(res, 400, { error: 'semana_id obrigatório.' });
    const snap = await db.query(
      `SELECT id, semana_id, week_start, week_end, status, calculado_em, validado_em, validado_por, editado_por_admin, historico_edicoes
       FROM week_snapshots WHERE semana_id = $1`, [semana_id]
    );
    if (!snap.rowCount) return json(res, 404, { error: 'Snapshot não encontrado.' });
    const snapshot = snap.rows[0];
    if (auth.role !== 'admin' && snapshot.status !== 'FECHADO') return json(res, 403, { error: 'Semana ainda não encerrada.' });
    const entries = await db.query(
      `SELECT * FROM snapshot_entries WHERE snapshot_id = $1 ${auth.role !== 'admin' ? 'AND user_id = $2' : ''} ORDER BY posicao_ranking, nome`,
      auth.role !== 'admin' ? [snapshot.id, auth.sub] : [snapshot.id]
    );
    return json(res, 200, { snapshot, entries: entries.rows });
  }

  // ── POST snapshot-calculate — gera snapshot (admin only) ──────────────
  if (req.method === 'POST' && action === 'snapshot-calculate') {
    const { requireAdmin: reqAdm } = require('../_lib/auth');
    if (!reqAdm(auth, res)) return;

    const cuToken  = (process.env.CLICKUP_TOKEN  || '').trim();
    const cuListId = (process.env.CLICKUP_LIST_ID || '').trim();
    if (!cuToken || !cuListId) return json(res, 400, { error: 'ClickUp não configurado.' });

    let snapWeekStart, snapWeekEnd, semana_id;
    if (req.body?.semana_id) {
      semana_id = req.body.semana_id;
      const match = semana_id.match(/^(\d{4})-W(\d{2})$/);
      if (!match) return json(res, 400, { error: 'semana_id inválido. Use "YYYY-WNN".' });
      const jan4 = new Date(Date.UTC(Number(match[1]), 0, 4));
      const mon  = mondayOfDate(jan4.toISOString().slice(0, 10));
      mon.setUTCDate(mon.getUTCDate() + (Number(match[2]) - 1) * 7);
      snapWeekStart = mon.toISOString().slice(0, 10);
      const we = new Date(mon); we.setUTCDate(we.getUTCDate() + 6);
      snapWeekEnd = we.toISOString().slice(0, 10);
    } else {
      const nowBRT2 = new Date(Date.now() - 3 * 3600000);
      const mon = mondayOfDate(nowBRT2.toISOString().slice(0, 10));
      mon.setUTCDate(mon.getUTCDate() - 7);
      snapWeekStart = mon.toISOString().slice(0, 10);
      const we = new Date(mon); we.setUTCDate(we.getUTCDate() + 6);
      snapWeekEnd = we.toISOString().slice(0, 10);
      semana_id = isoWeekId(mon);
    }

    let snapUsersRes;
    try {
      snapUsersRes = await db.query(
        `SELECT id, name, COALESCE(cargo,'') AS cargo,
                COALESCE(daily_points_goal,26) AS daily_points_goal,
                COALESCE(weekly_pts_120, ROUND(daily_points_goal*5*1.2)) AS weekly_pts_120,
                COALESCE(clickup_user_id::text,'') AS clickup_user_id,
                COALESCE(clickup_email,'') AS clickup_email
         FROM users WHERE active = TRUE ORDER BY name`
      );
    } catch {
      snapUsersRes = await db.query(
        `SELECT id, name, '' AS cargo, 26 AS daily_points_goal, 156 AS weekly_pts_120, '' AS clickup_user_id, '' AS clickup_email
         FROM users WHERE active = TRUE ORDER BY name`
      );
    }
    const snapDbUsers = snapUsersRes.rows;
    const snapByClickId = new Map(), snapByEmail = new Map(), snapByName = new Map();
    for (const u of snapDbUsers) {
      if (u.clickup_user_id) snapByClickId.set(String(u.clickup_user_id), u);
      if (u.clickup_email)   snapByEmail.set(u.clickup_email.toLowerCase().trim(), u);
      const k = u.name.toLowerCase().trim(); snapByName.set(k, u);
      const f = k.split(' ')[0]; if (!snapByName.has(f)) snapByName.set(f, u);
    }
    const matchSnap = (a) => {
      const id = String(a.id || ''); if (id && snapByClickId.has(id)) return snapByClickId.get(id);
      const em = (a.email || '').toLowerCase().trim(); if (em && snapByEmail.has(em)) return snapByEmail.get(em);
      const fn = (a.username || '').toLowerCase().split(' ')[0]; if (fn && snapByName.has(fn)) return snapByName.get(fn);
      return null;
    };

    const cuAllTasks = [];
    for (let page = 0; page < 6; page++) {
      const r = await fetchClickUp(`https://api.clickup.com/api/v2/list/${cuListId}/task?include_closed=true&subtasks=true&page=${page}`, cuToken);
      if (!r.ok) { if (page === 0) return json(res, 502, { error: `ClickUp ${r.status}` }); break; }
      const b = await r.json(); cuAllTasks.push(...(b.tasks || []));
      if (b.last_page || (b.tasks || []).length < 100) break;
    }

    const snapFromMs = new Date(`${snapWeekStart}T00:00:00-03:00`).getTime();
    const snapToMs   = new Date(`${snapWeekEnd}T23:59:59-03:00`).getTime();
    const SNAP_CAP   = 16;
    const snapTasksByUid = new Map();
    for (const task of cuAllTasks) {
      if (!cuTaskDone(task)) continue;
      const closedMs = Number(task.date_closed || task.date_done || 0);
      if (closedMs < snapFromMs || closedMs > snapToMs) continue;
      for (const a of (Array.isArray(task.assignees) ? task.assignees : [])) {
        const u = matchSnap(a); if (!u) continue;
        const uid = Number(u.id);
        if (!snapTasksByUid.has(uid)) snapTasksByUid.set(uid, []);
        snapTasksByUid.get(uid).push(task);
      }
    }

    const snapEntries = snapDbUsers.map(user => {
      const uid = Number(user.id), meta100 = (Number(user.daily_points_goal)||26)*5;
      const meta120 = Number(user.weekly_pts_120) || Math.round(meta100 * 1.2);
      const uTasks  = snapTasksByUid.get(uid) || [];
      const pts = uTasks.reduce((s, t) => s + extractPtsSnap(t), 0);
      const dH = {};
      for (const t of uTasks) {
        const cm = Number(t.date_closed || t.date_done || 0);
        const dk = cm > 0 ? new Date(cm - 3*3600000).toISOString().slice(0,10) : snapWeekStart;
        const h = Number(t.time_spent||0)/3600000; if (h<=0) continue;
        if (!dH[dk]) dH[dk] = { total:0, porEmpresa:{} };
        const rem = Math.max(0, SNAP_CAP - dH[dk].total), applied = Math.min(h, rem);
        dH[dk].total += applied;
        const emp = resolveEmpresa(t);
        dH[dk].porEmpresa[emp] = (dH[dk].porEmpresa[emp]||0) + applied;
      }
      const hpe = { 'SeuBoné':0,'Onevo':0,'Carbone':0,'Não classificado':0 };
      let ht = 0;
      for (const {total, porEmpresa} of Object.values(dH)) {
        ht += total;
        for (const [e,h] of Object.entries(porEmpresa)) hpe[e] = (hpe[e]||0) + h;
      }
      const horasTotal = parseFloat(ht.toFixed(2));
      const pctMeta = meta100 > 0 ? parseFloat(((pts/meta100)*100).toFixed(2)) : 0;
      const cargoLc = (user.cargo||'').toLowerCase();
      const isCB = cargoLc.includes('storymaker')||cargoLc.includes('ugc')||cargoLc.includes('publisher');
      const coef = isCB
        ? parseFloat(((horasTotal/16)*0.30).toFixed(2))
        : parseFloat(((meta100>0?pts/meta100:0)*0.50 + (horasTotal/16)*0.15).toFixed(2));
      return { user_id:uid, nome:user.name, cargo:user.cargo||'', isCB, pontos:pts, meta_100:meta100, meta_120:meta120,
               percentual_meta:pctMeta, horas_validadas_total:horasTotal, horas_por_empresa:hpe,
               tasks_concluidas:uTasks.length, coeficiente:coef,
               coins_sugeridas_meta: isCB ? 0 : calcCoinsMeta(pts,meta100,meta120),
               coins_sugeridas_ranking:0, coins_sugeridas_total:0, posicao_ranking:0 };
    });

    const ranked = snapEntries.filter(e=>!e.isCB).sort((a,b)=>b.pontos-a.pontos);
    ranked.forEach((e,i) => {
      e.posicao_ranking = i+1;
      e.coins_sugeridas_ranking = calcCoinsRanking(i+1);
      e.coins_sugeridas_total = e.coins_sugeridas_meta + e.coins_sugeridas_ranking;
    });
    snapEntries.filter(e=>e.isCB).forEach(e => { e.coins_sugeridas_total = e.coins_sugeridas_meta; });

    const coinsAcumRows = await db.query(
      `SELECT se.user_id, COALESCE(SUM(se.coins_validadas),0)::int AS total
       FROM snapshot_entries se JOIN week_snapshots ws ON ws.id=se.snapshot_id
       WHERE ws.status='FECHADO' AND ws.semana_id != $1 GROUP BY se.user_id`, [semana_id]
    ).catch(() => ({ rows:[] }));
    const coinsAcumMap = new Map(coinsAcumRows.rows.map(r=>[Number(r.user_id),Number(r.total)]));

    const snapClient = await db.connect();
    try {
      await snapClient.query('BEGIN');
      const sr = await snapClient.query(
        `INSERT INTO week_snapshots (semana_id,week_start,week_end,status,calculado_em)
         VALUES ($1,$2,$3,'PENDENTE_VALIDACAO',NOW())
         ON CONFLICT (semana_id) DO UPDATE SET calculado_em=NOW(),status='PENDENTE_VALIDACAO',updated_at=NOW()
         RETURNING id`, [semana_id, snapWeekStart, snapWeekEnd]
      );
      const snapId = sr.rows[0].id;
      await snapClient.query('DELETE FROM snapshot_entries WHERE snapshot_id=$1', [snapId]);
      for (const e of snapEntries) {
        await snapClient.query(
          `INSERT INTO snapshot_entries (snapshot_id,user_id,semana_id,nome,cargo,pontos,meta_100,meta_120,percentual_meta,
             horas_validadas_total,horas_por_empresa,tasks_concluidas,coeficiente,posicao_ranking,
             coins_sugeridas_meta,coins_sugeridas_ranking,coins_sugeridas_total,coins_validadas,coins_acumuladas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NULL,$18)`,
          [snapId,e.user_id,semana_id,e.nome,e.cargo,e.pontos,e.meta_100,e.meta_120,e.percentual_meta,
           e.horas_validadas_total,JSON.stringify(e.horas_por_empresa),e.tasks_concluidas,e.coeficiente,
           e.posicao_ranking,e.coins_sugeridas_meta,e.coins_sugeridas_ranking,e.coins_sugeridas_total,
           coinsAcumMap.get(e.user_id)||0]
        );
      }
      await snapClient.query('COMMIT');
      return json(res, 200, { success:true, semana_id, snapshot_id:snapId, entries:snapEntries.length });
    } catch(err) { await snapClient.query('ROLLBACK'); throw err; }
    finally { snapClient.release(); }
  }

  // ── PATCH snapshot-validate — fecha semana (admin only) ───────────────
  if (req.method === 'PATCH' && action === 'snapshot-validate') {
    if (auth.role !== 'admin') return json(res, 403, { error: 'Forbidden.' });
    const { semana_id, entries: entryUpdates } = req.body || {};
    if (!semana_id || !Array.isArray(entryUpdates) || !entryUpdates.length)
      return json(res, 400, { error: 'semana_id e entries[] obrigatórios.' });
    const sv = await db.query('SELECT id, status, week_start FROM week_snapshots WHERE semana_id=$1', [semana_id]);
    if (!sv.rowCount) return json(res, 404, { error: 'Snapshot não encontrado.' });
    if (sv.rows[0].status === 'FECHADO') return json(res, 409, { error: 'Semana já fechada.' });
    const snapId2 = sv.rows[0].id;
    const wStart  = sv.rows[0].week_start;
    const vc = await db.connect();
    try {
      await vc.query('BEGIN');
      for (const { user_id, coins_validadas, observacao_admin } of entryUpdates) {
        if (user_id == null || coins_validadas == null) continue;
        await vc.query(
          `UPDATE snapshot_entries SET coins_validadas=$1, observacao_admin=COALESCE($2,''), updated_at=NOW()
           WHERE snapshot_id=$3 AND user_id=$4`,
          [coins_validadas, observacao_admin||'', snapId2, user_id]
        );
      }
      await vc.query(
        `UPDATE week_snapshots SET status='FECHADO',validado_em=NOW(),validado_por=$1,updated_at=NOW() WHERE id=$2`,
        [auth.name, snapId2]
      );
      const veRows = await vc.query('SELECT user_id,coins_validadas,pontos FROM snapshot_entries WHERE snapshot_id=$1', [snapId2]);
      for (const { user_id: uid2, coins_validadas: cv, pontos: pts2 } of veRows.rows) {
        if (cv == null) continue;
        await vc.query(
          `INSERT INTO sb_coins (user_id,week_start,coins_earned,pts_earned)
           VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,week_start) DO UPDATE
             SET coins_earned=EXCLUDED.coins_earned, pts_earned=EXCLUDED.pts_earned, updated_at=NOW()`,
          [uid2, wStart, cv, pts2]
        ).catch(()=>{});
      }
      await vc.query('COMMIT');
      return json(res, 200, { success:true, semana_id, status:'FECHADO' });
    } catch(err) { await vc.query('ROLLBACK'); throw err; }
    finally { vc.release(); }
  }

  // ── PATCH snapshot-edit — edição pós-fechamento (ADMIN_MASTER only) ───
  if (req.method === 'PATCH' && action === 'snapshot-edit') {
    const mc = await db.query('SELECT is_master FROM users WHERE id=$1', [auth.sub]).catch(()=>({rows:[{is_master:false}]}));
    if (!mc.rows[0]?.is_master) return json(res, 403, { error: 'Somente ADMIN_MASTER pode editar semana encerrada.' });
    const { semana_id, user_id, campo, valor, motivo } = req.body || {};
    const EDITAVEIS = ['coins_validadas','observacao_admin'];
    if (!semana_id||!user_id||!campo||valor==null||!motivo) return json(res, 400, { error: 'semana_id, user_id, campo, valor e motivo obrigatórios.' });
    if (!EDITAVEIS.includes(campo)) return json(res, 400, { error: `Campo "${campo}" não editável aqui.` });
    const se2 = await db.query(`SELECT id,historico_edicoes FROM week_snapshots WHERE semana_id=$1 AND status='FECHADO'`, [semana_id]);
    if (!se2.rowCount) return json(res, 404, { error: 'Snapshot FECHADO não encontrado.' });
    const snapId3 = se2.rows[0].id;
    const atualRow = await db.query(`SELECT ${campo} AS val FROM snapshot_entries WHERE snapshot_id=$1 AND user_id=$2`, [snapId3, user_id]);
    if (!atualRow.rowCount) return json(res, 404, { error: 'Colaborador não encontrado.' });
    const logEntry = { editado_em:new Date().toISOString(), editado_por:auth.name, campo_alterado:campo,
                       valor_anterior:atualRow.rows[0].val, valor_novo:valor, motivo };
    const hist2 = [...(se2.rows[0].historico_edicoes||[]), logEntry];
    const ec = await db.connect();
    try {
      await ec.query('BEGIN');
      await ec.query(`UPDATE snapshot_entries SET ${campo}=$1,updated_at=NOW() WHERE snapshot_id=$2 AND user_id=$3`, [valor,snapId3,user_id]);
      await ec.query(`UPDATE week_snapshots SET editado_por_admin=TRUE,historico_edicoes=$1,updated_at=NOW() WHERE id=$2`, [JSON.stringify(hist2),snapId3]);
      if (campo==='coins_validadas') {
        const ws3 = await ec.query('SELECT week_start FROM week_snapshots WHERE id=$1', [snapId3]);
        await ec.query('UPDATE sb_coins SET coins_earned=$1,updated_at=NOW() WHERE user_id=$2 AND week_start=$3',
          [valor, user_id, ws3.rows[0]?.week_start]).catch(()=>{});
      }
      await ec.query('COMMIT');
      return json(res, 200, { success:true, log:logEntry });
    } catch(err) { await ec.query('ROLLBACK'); throw err; }
    finally { ec.release(); }
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);
  } catch (err) {
    console.error('[focus] error:', err.message, err.stack);
    const msg = isNetworkError(err.message)
      ? 'Erro de conexão temporário. Aguarde alguns segundos e atualize a página.'
      : (err.message || 'Erro inesperado.');
    return json(res, 500, { error: msg });
  }
};