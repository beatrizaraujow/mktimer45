const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');
const { getIncompleteRoutines } = require('../_lib/routineAlarm');
const { sendWhatsApp } = require('../_lib/whatsappSend');


module.exports = async function handler(req, res) {
  try {
    const action = (req.query.action || '').toString();

    // ── GET ?action=alarm-check — Vercel cron (CRON_SECRET) ou admin manual ──
    if (req.method === 'GET' && action === 'alarm-check') {
      const cronSecret = (process.env.CRON_SECRET || '').trim();
      const authHeader = (req.headers['authorization'] || '').trim();
      const isCron     = cronSecret && authHeader === `Bearer ${cronSecret}`;

      if (!isCron) {
        const authCheck = requireAuth(req, res);
        if (!authCheck) return;
        if (authCheck.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      }

      // Data a verificar: parâmetro ?date= ou ontem (BRT = UTC-3)
      const dateParam = (req.query.date || '').trim();
      let checkDate;
      if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        checkDate = dateParam;
      } else {
        const yesterday = new Date(Date.now() - 3 * 3600000 - 86400000);
        checkDate = yesterday.toISOString().slice(0, 10);
      }

      try {
        const incompletes = await getIncompleteRoutines(checkDate);

        if (!incompletes.length) {
          return json(res, 200, { sent: false, reason: 'all_done', date: checkDate });
        }

        const [, mo, dy] = checkDate.split('-');
        const dateLabel  = `${dy}/${mo}`;

        const lines = incompletes.map(u =>
          `👤 ${u.name}\n${u.routines.map(t => `- ${t}`).join('\n')}`
        ).join('\n\n');

        const message = `⚠️ Rotinas incompletas de ontem (${dateLabel}):\n\n${lines}`;

        await sendWhatsApp(message);

        console.log(`[alarm-check] enviado para ${checkDate}: ${incompletes.length} pessoa(s)`);
        return json(res, 200, { sent: true, date: checkDate, incompletes });
      } catch (e) {
        console.error('[alarm-check]', e.message);
        return json(res, 500, { error: e.message });
      }
    }

    const auth = requireAuth(req, res);
    if (!auth) return;

    // GET ?action=week-grid&from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=X]
    if (req.method === 'GET' && action === 'week-grid') {
      const from = (req.query.from || '').trim();
      const to   = (req.query.to   || '').trim();
      if (!from || !to) return json(res, 400, { error: 'from and to required.' });

      // Admin can see any user (or all users); member sees only themselves
      let targetUids;
      if (auth.role === 'admin' && req.query.userId) {
        targetUids = [parseInt(req.query.userId, 10)];
      } else if (auth.role === 'admin' && !req.query.userId) {
        const all = await db.query(`SELECT id FROM users WHERE active = TRUE`);
        targetUids = all.rows.map(r => Number(r.id));
      } else {
        targetUids = [auth.sub];
      }

      try {
        // Detecta colunas opcionais (migração pode não ter rodado ainda)
        const colCheck = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'user_routines'
             AND column_name IN ('company','frequency','applies_days','observation')`
        );
        const cols = new Set(colCheck.rows.map(r => r.column_name));
        const companyCol    = cols.has('company')     ? 'ur.company'      : 'NULL::text AS company';
        const frequencyCol  = cols.has('frequency')   ? 'ur.frequency'    : "'daily'::text AS frequency";
        const appliesDCol   = cols.has('applies_days')? 'ur.applies_days' : 'NULL::int[] AS applies_days';

        // Get all active routines for these users
        const routinesRes = await db.query(
          `SELECT ur.id, ur.user_id, ur.title, ur.description,
                  ${companyCol}, ${frequencyCol}, ${appliesDCol},
                  ur.points, ur.sort_order,
                  u.name AS person_name
           FROM user_routines ur
           JOIN users u ON u.id = ur.user_id
           WHERE ur.user_id = ANY($1::int[]) AND ur.active = TRUE
           ORDER BY ur.user_id, ur.sort_order, ur.id`,
          [targetUids]
        );

        // Get all completions in date range (inclui reason para admin ver motivo)
        const rcColCheck = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'routine_completions' AND column_name IN ('status','reason')`
        );
        const rcCols = new Set(rcColCheck.rows.map(r => r.column_name));
        const statusCol = rcCols.has('status') ? 'rc.status' : "'done'::text AS status";
        const reasonCol = rcCols.has('reason') ? 'rc.reason' : 'NULL::text AS reason';

        const completionsRes = await db.query(
          `SELECT rc.routine_id, rc.completed_date::text AS date, ${statusCol}, ${reasonCol}
           FROM routine_completions rc
           JOIN user_routines ur ON ur.id = rc.routine_id
           WHERE ur.user_id = ANY($1::int[])
             AND rc.completed_date >= $2 AND rc.completed_date <= $3`,
          [targetUids, from, to]
        );

        // Build completion map: routineId -> { date -> { status, reason } }
        const compMap = {};
        for (const c of completionsRes.rows) {
          if (!compMap[c.routine_id]) compMap[c.routine_id] = {};
          compMap[c.routine_id][c.date] = { status: c.status, reason: c.reason || null };
        }

        // Build list of dates in range
        const dates = [];
        const cur = new Date(`${from}T00:00:00Z`);
        const end = new Date(`${to}T00:00:00Z`);
        while (cur <= end) {
          dates.push(cur.toISOString().slice(0, 10));
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        // For each routine, compute which dates it applies and completion status
        const routines = routinesRes.rows.map(r => {
          const dayStatuses = {};
          for (const d of dates) {
            const dow = new Date(`${d}T00:00:00Z`).getUTCDay() || 7; // 1=Mon..7=Sun
            let applies = false;
            if (r.frequency === 'daily') {
              applies = !r.applies_days || r.applies_days.length === 0 || r.applies_days.includes(dow);
            } else if (r.frequency === 'daily-weekdays') {
              applies = dow >= 1 && dow <= 5;
            } else if (r.frequency === 'weekly') {
              applies = !r.applies_days || r.applies_days.includes(dow);
            } else if (r.frequency === '3x_week' || r.frequency === 'custom') {
              applies = !r.applies_days || r.applies_days.includes(dow);
            } else if (r.frequency === 'biweekly') {
              const dom = Number(d.slice(8, 10));
              applies = Array.isArray(r.applies_days) && r.applies_days.includes(dom);
            } else if (r.frequency === 'monthly') {
              const dom = Number(d.slice(8, 10));
              applies = !r.applies_days || r.applies_days.length === 0 || r.applies_days.includes(dom);
            }
            if (applies) {
              dayStatuses[d] = compMap[r.id]?.[d] || null;
            }
          }
          return {
            id: r.id,
            userId: r.user_id,
            personName: r.person_name,
            title: r.title,
            description: r.description,
            company: r.company,
            frequency: r.frequency,
            applies_days: r.applies_days || null,
            points: r.points,
            days: dayStatuses,
          };
        });

        // Summary — days[d] agora é { status, reason } ou null
        let totalSlots = 0, doneSlots = 0;
        for (const r of routines) {
          for (const [, entry] of Object.entries(r.days)) {
            totalSlots++;
            if (entry?.status === 'done') doneSlots++;
          }
        }
        const pct = totalSlots > 0 ? Math.round((doneSlots / totalSlots) * 100) : 0;

        return json(res, 200, { routines, dates, summary: { done: doneSlots, total: totalSlots, pct } });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { routines: [], dates: [], summary: { done: 0, total: 0, pct: 0 }, _migrationNeeded: true });
        throw e;
      }
    }

    // GET ?action=today-list&date=YYYY-MM-DD
    // Returns today's applicable routines for the authenticated user (member view)
    if (req.method === 'GET' && action === 'today-list') {
      const dateParam = (req.query.date || '').trim();
      if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return json(res, 400, { error: 'date required (YYYY-MM-DD).' });
      }
      const uid = auth.sub;
      const dow = new Date(`${dateParam}T00:00:00Z`).getUTCDay() || 7; // 1=Mon..7=Sun
      const dayOfMonth = Number(dateParam.slice(8, 10));

      try {
        // Detecta colunas opcionais
        const colCheck2 = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'user_routines'
             AND column_name IN ('company','frequency','applies_days','observation')`
        );
        const cols2 = new Set(colCheck2.rows.map(r => r.column_name));
        const rcColCheck2 = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'routine_completions' AND column_name IN ('status','reason')`
        );
        const rcCols2 = new Set(rcColCheck2.rows.map(r => r.column_name));

        const routinesRes = await db.query(
          `SELECT ur.id, ur.title,
                  ${cols2.has('observation')  ? 'ur.observation'   : 'NULL::text AS observation'},
                  ${cols2.has('frequency')    ? 'ur.frequency'     : "'daily'::text AS frequency"},
                  ${cols2.has('applies_days') ? 'ur.applies_days'  : 'NULL::int[] AS applies_days'},
                  ur.points,
                  ${cols2.has('company')      ? 'ur.company'       : 'NULL::text AS company'},
                  ${rcCols2.has('status')     ? 'rc.status'        : "'done'::text AS status"},
                  ${rcCols2.has('reason')     ? 'rc.reason'        : 'NULL::text AS reason'}
           FROM user_routines ur
           LEFT JOIN routine_completions rc
             ON rc.routine_id = ur.id AND rc.completed_date = $2
           WHERE ur.user_id = $1 AND ur.active = TRUE
           ORDER BY ur.sort_order, ur.id`,
          [uid, dateParam]
        );

        // Filter to only routines that apply today
        const applicable = routinesRes.rows.filter(r => {
          const freq = r.frequency || 'daily';
          const days = r.applies_days; // int[] or null
          if (freq === 'daily') {
            if (!days || !days.length) return true;
            return days.includes(dow);
          }
          if (freq === 'daily-weekdays') {
            return dow >= 1 && dow <= 5;
          }
          if (freq === 'weekly' || freq === '3x_week' || freq === 'custom') {
            return !days || days.includes(dow);
          }
          if (freq === 'biweekly') {
            return Array.isArray(days) && days.includes(dayOfMonth);
          }
          if (freq === 'monthly') {
            return !days || !days.length || days.includes(dayOfMonth);
          }
          return true;
        });

        return json(res, 200, { routines: applicable, date: dateParam });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { routines: [], date: dateParam, _migrationNeeded: true });
        throw e;
      }
    }

    // GET ?action=list&date=YYYY-MM-DD[&userId=X]
    if (req.method === 'GET' && action === 'list') {
      const dateParam = (req.query.date || '').trim();
      if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return json(res, 400, { error: 'Param date required (YYYY-MM-DD).' });
      }
      const targetUid = req.query.userId && auth.role === 'admin'
        ? parseInt(req.query.userId, 10)
        : auth.sub;

      try {
        const result = await db.query(
          `SELECT ur.id, ur.title, ur.description, ur.points, ur.sort_order,
                  ur.frequency, ur.applies_days, ur.company,
                  (SELECT COUNT(*) FROM routine_completions rc
                   WHERE rc.routine_id = ur.id AND rc.completed_date = $2) > 0 AS done_today
           FROM user_routines ur
           WHERE ur.user_id = $1 AND ur.active = TRUE
           ORDER BY ur.sort_order, ur.id`,
          [targetUid, dateParam]
        );
        return json(res, 200, { routines: result.rows });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { routines: [], _migrationNeeded: true });
        throw e;
      }
    }

    // GET ?action=week&from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=X]
    if (req.method === 'GET' && action === 'week') {
      const from = (req.query.from || '').trim();
      const to   = (req.query.to   || '').trim();
      if (!from || !to) return json(res, 400, { error: 'Params from and to required.' });
      const targetUid = req.query.userId && auth.role === 'admin'
        ? parseInt(req.query.userId, 10)
        : auth.sub;

      try {
        const result = await db.query(
          `SELECT rc.completed_date::text AS date,
                  SUM(ur.points)::int AS pts,
                  COUNT(rc.id)::int AS count
           FROM routine_completions rc
           JOIN user_routines ur ON ur.id = rc.routine_id
           WHERE rc.user_id = $1
             AND rc.completed_date >= $2 AND rc.completed_date <= $3
           GROUP BY rc.completed_date ORDER BY rc.completed_date`,
          [targetUid, from, to]
        );
        const totalPts = result.rows.reduce((s, r) => s + Number(r.pts), 0);
        return json(res, 200, { days: result.rows, totalPts });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { days: [], totalPts: 0 });
        throw e;
      }
    }

    // GET ?action=monthly-member-history&months=N[&company=X]  (admin only)
    // Returns last N months with per-member done/total/pct — real data only
    if (req.method === 'GET' && action === 'monthly-member-history') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const periodType = ['day','week','month'].includes(req.query.period) ? req.query.period : 'month';
      const maxN = periodType === 'day' ? 90 : periodType === 'week' ? 26 : 12;
      const defaultN = periodType === 'day' ? 14 : periodType === 'week' ? 8 : 7;
      const nPeriods = Math.min(Math.max(parseInt(req.query.periods || req.query.months || defaultN, 10), 1), maxN);
      const targetCompany = (req.query.company || '').trim() || null;

      try {
        const usersRes = await db.query(
          `SELECT id, name FROM users
           WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE
           ORDER BY name`
        );
        const users = usersRes.rows.map(r => ({ id: Number(r.id), name: r.name }));
        if (!users.length) return json(res, 200, { months: [] });

        const colCheck = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'user_routines'
             AND column_name IN ('frequency','applies_days')`
        );
        const cols = new Set(colCheck.rows.map(r => r.column_name));
        const frequencyCol = cols.has('frequency')    ? 'ur.frequency'    : "'daily'::text AS frequency";
        const appliesDCol  = cols.has('applies_days') ? 'ur.applies_days' : 'NULL::int[] AS applies_days';

        // Build period ranges based on periodType
        const now = new Date();
        const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const periodRanges = [];

        if (periodType === 'month') {
          for (let i = nPeriods - 1; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            const y = d.getUTCFullYear(), m = d.getUTCMonth();
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            const from = `${y}-${String(m+1).padStart(2,'0')}-01`;
            const to   = `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
            periodRanges.push({ from, to, label: `${PT_MONTHS[m]} ${String(y).slice(2)}` });
          }
        } else if (periodType === 'week') {
          const dow = now.getUTCDay() || 7;
          const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow + 1));
          for (let i = nPeriods - 1; i >= 0; i--) {
            const mon = new Date(thisMon); mon.setUTCDate(thisMon.getUTCDate() - i * 7);
            const sun = new Date(mon);     sun.setUTCDate(mon.getUTCDate() + 6);
            const from = mon.toISOString().slice(0, 10);
            const to   = sun.toISOString().slice(0, 10);
            const [, mo, dy] = from.split('-');
            periodRanges.push({ from, to, label: `${dy}/${mo}` });
          }
        } else {
          const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          for (let i = nPeriods - 1; i >= 0; i--) {
            const d = new Date(today); d.setUTCDate(today.getUTCDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const [, mo, dy] = dateStr.split('-');
            periodRanges.push({ from: dateStr, to: dateStr, label: `${dy}/${mo}` });
          }
        }

        const globalFrom = periodRanges[0].from;
        const globalTo   = periodRanges[periodRanges.length - 1].to;
        const allUids    = users.map(u => u.id);

        const routinesRes = await db.query(
          `SELECT ur.id, ur.user_id, ur.company, ${frequencyCol}, ${appliesDCol}
           FROM user_routines ur
           WHERE ur.user_id = ANY($1::int[]) AND ur.active = TRUE
             AND ($2::text IS NULL OR ur.company = $2)`,
          [allUids, targetCompany]
        );

        const compRes = await db.query(
          `SELECT rc.routine_id, rc.completed_date::text AS date
           FROM routine_completions rc
           JOIN user_routines ur ON ur.id = rc.routine_id
           WHERE ur.user_id = ANY($1::int[])
             AND rc.completed_date >= $2 AND rc.completed_date <= $3
             AND rc.status = 'done'`,
          [allUids, globalFrom, globalTo]
        );
        const doneSet = new Set(compRes.rows.map(r => `${r.routine_id}_${r.date}`));

        const result = periodRanges.map(({ from, to, label }, periodIdx) => {
          const dates = [];
          const cur = new Date(`${from}T00:00:00Z`);
          const end = new Date(`${to}T00:00:00Z`);
          while (cur <= end) {
            dates.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
          }

          const memberData = users.map(u => {
            const userRoutines = routinesRes.rows.filter(r => Number(r.user_id) === u.id);
            let total = 0, done = 0;
            for (const r of userRoutines) {
              for (const d of dates) {
                const dow = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
                const freq = r.frequency || 'daily';
                const applyDays = r.applies_days;
                const dom = Number(d.slice(8, 10));
                let applies = false;
                if (freq === 'daily')              applies = !applyDays || applyDays.includes(dow);
                else if (freq === 'daily-weekdays') applies = dow >= 1 && dow <= 5;
                else if (freq === 'weekly')         applies = !applyDays || applyDays.includes(dow);
                else if (freq === '3x_week')        applies = !applyDays || applyDays.includes(dow);
                else if (freq === 'custom')         applies = !applyDays || applyDays.includes(dow);
                else if (freq === 'biweekly')       applies = Array.isArray(applyDays) && applyDays.includes(dom);
                else if (freq === 'monthly')        applies = !applyDays || applyDays.length === 0 || applyDays.includes(dom);
                if (!applies) continue;
                total++;
                if (doneSet.has(`${r.id}_${d}`)) done++;
              }
            }
            // Apenas dado real: sem mock. null = sem rotinas no período (sem barra).
            const pct = total > 0
              ? (done > 0 ? Math.round((done / total) * 100) : 0)
              : null;
            return { userId: u.id, name: u.name, done, total, pct };
          });

          // avg: conta todos os pct não-nulos (inclui 0% para mostrar realidade)
          const validPcts = memberData.map(m => m.pct).filter(p => p !== null);
          const avg = validPcts.length ? Math.round(validPcts.reduce((a, b) => a + b, 0) / validPcts.length) : null;

          return { label, from, to, members: memberData, avg };
        });

        return json(res, 200, { months: result });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { months: [] });
        throw e;
      }
    }

    // GET ?action=weekly-history&weeks=N[&userId=X]
    // Returns last N weeks summary (pct, done, total) for routine completion chart
    if (req.method === 'GET' && action === 'weekly-history') {
      const weeks = Math.min(Math.max(parseInt(req.query.weeks || '8', 10), 1), 26);
      let targetUids;
      if (auth.role === 'admin' && req.query.userId) {
        targetUids = [parseInt(req.query.userId, 10)];
      } else if (auth.role === 'admin' && !req.query.userId) {
        const all = await db.query(`SELECT id FROM users WHERE active = TRUE`);
        targetUids = all.rows.map(r => Number(r.id));
      } else {
        targetUids = [auth.sub];
      }

      try {
        // Build week ranges (Mon–Sun), going back N weeks from current week
        const now = new Date();
        const dow = now.getUTCDay() || 7;
        const thisMon = new Date(now);
        thisMon.setUTCDate(now.getUTCDate() - dow + 1);
        thisMon.setUTCHours(0, 0, 0, 0);

        const weekRanges = [];
        for (let i = weeks - 1; i >= 0; i--) {
          const mon = new Date(thisMon);
          mon.setUTCDate(thisMon.getUTCDate() - i * 7);
          const sun = new Date(mon);
          sun.setUTCDate(mon.getUTCDate() + 6);
          weekRanges.push({
            from: mon.toISOString().slice(0, 10),
            to:   sun.toISOString().slice(0, 10),
          });
        }

        const globalFrom = weekRanges[0].from;
        const globalTo   = weekRanges[weekRanges.length - 1].to;

        // Get all active routines for these users + their frequency/applies_days
        const colCheck = await db.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_name = 'user_routines'
             AND column_name IN ('frequency','applies_days')`
        );
        const cols = new Set(colCheck.rows.map(r => r.column_name));
        const frequencyCol  = cols.has('frequency')   ? 'ur.frequency'    : "'daily'::text AS frequency";
        const appliesDCol   = cols.has('applies_days')? 'ur.applies_days' : 'NULL::int[] AS applies_days';

        const routinesRes = await db.query(
          `SELECT ur.id, ur.user_id, ${frequencyCol}, ${appliesDCol}
           FROM user_routines ur
           WHERE ur.user_id = ANY($1::int[]) AND ur.active = TRUE`,
          [targetUids]
        );

        // Get all completions (status=done only) in range
        const compRes = await db.query(
          `SELECT rc.routine_id, rc.completed_date::text AS date
           FROM routine_completions rc
           JOIN user_routines ur ON ur.id = rc.routine_id
           WHERE ur.user_id = ANY($1::int[])
             AND rc.completed_date >= $2 AND rc.completed_date <= $3
             AND rc.status = 'done'`,
          [targetUids, globalFrom, globalTo]
        );
        const doneSet = new Set(compRes.rows.map(r => `${r.routine_id}_${r.date}`));

        // For each week, compute applicable slots and done slots
        const result = weekRanges.map(({ from, to }) => {
          const dates = [];
          const cur = new Date(`${from}T00:00:00Z`);
          const end = new Date(`${to}T00:00:00Z`);
          while (cur <= end) {
            dates.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
          }

          let total = 0, done = 0;
          for (const r of routinesRes.rows) {
            for (const d of dates) {
              const dow2 = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
              const freq = r.frequency || 'daily';
              const applyDays = r.applies_days;
              let applies = false;
              const dom2 = Number(d.slice(8, 10));
              if (freq === 'daily')   applies = !applyDays || applyDays.includes(dow2);
              if (freq === 'weekly')  applies = !applyDays || applyDays.includes(dow2);
              if (freq === 'biweekly') applies = Array.isArray(applyDays) && applyDays.includes(dom2);
              if (freq === 'monthly') applies = !applyDays || applyDays.length === 0 || applyDays.includes(dom2);
              if (!applies) continue;
              total++;
              if (doneSet.has(`${r.id}_${d}`)) done++;
            }
          }
          const pct = total > 0 ? Math.round((done / total) * 100) : null;
          const [,mo,dy] = from.split('-');
          return { from, to, label: `${dy}/${mo}`, done, total, pct };
        });

        return json(res, 200, { weeks: result });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { weeks: [] });
        throw e;
      }
    }

    // POST ?action=create  body: { userId, title, observation?, company?, frequency, applies_days?, points, sort_order? }
    if (req.method === 'POST' && action === 'create') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const { userId, title, observation, company, frequency, applies_days, points, sort_order } = req.body || {};
      if (!userId || !title) return json(res, 400, { error: 'userId and title required.' });
      try {
        const r = await db.query(
          `INSERT INTO user_routines (user_id, title, observation, company, frequency, applies_days, points, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [userId, title.trim(), observation?.trim() || null, company?.trim() || null,
           frequency || 'daily', applies_days?.length ? applies_days : null,
           Number(points) || 1, Number(sort_order) || 0]
        );
        return json(res, 201, { routine: r.rows[0] });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { routine: null, _migrationNeeded: true });
        throw e;
      }
    }

    // PATCH ?action=update&routineId=X  body: { title?, observation?, frequency?, applies_days?, points?, sort_order?, active? }
    if (req.method === 'PATCH' && action === 'update') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const rid = parseInt(req.query.routineId, 10);
      if (!rid) return json(res, 400, { error: 'routineId required.' });
      const { title, observation, company, frequency, applies_days, points, sort_order, active, userId } = req.body || {};
      try {
        await db.query(
          `UPDATE user_routines SET
             user_id     = COALESCE($10, user_id),
             title       = COALESCE($2, title),
             observation = COALESCE($3, observation),
             company     = COALESCE($4, company),
             frequency   = COALESCE($5, frequency),
             applies_days = CASE WHEN $6::int[] IS NOT NULL THEN $6::int[] ELSE applies_days END,
             points      = COALESCE($7, points),
             sort_order  = COALESCE($8, sort_order),
             active      = COALESCE($9, active)
           WHERE id = $1`,
          [rid, title?.trim() || null, observation?.trim() || null, company?.trim() || null,
           frequency || null, Array.isArray(applies_days) && applies_days.length ? applies_days : null,
           points ? Number(points) : null, sort_order != null ? Number(sort_order) : null,
           active != null ? Boolean(active) : null,
           userId ? Number(userId) : null]
        );
        return json(res, 200, { ok: true });
      } catch (e) { throw e; }
    }

    // DELETE ?action=delete&routineId=X
    if (req.method === 'DELETE' && action === 'delete') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const rid = parseInt(req.query.routineId, 10);
      if (!rid) return json(res, 400, { error: 'routineId required.' });
      await db.query(`UPDATE user_routines SET active = FALSE WHERE id = $1`, [rid]);
      return json(res, 200, { ok: true });
    }

    // POST ?action=toggle  body: { routineId, date, status, reason? }
    if (req.method === 'POST' && action === 'toggle') {
      const { routineId, date, status: reqStatus, reason } = req.body || {};
      if (!routineId || !date) return json(res, 400, { error: 'routineId and date required.' });
      const rid = parseInt(routineId, 10);

      try {
        const own = await db.query(
          `SELECT user_id FROM user_routines WHERE id = $1 AND active = TRUE`, [rid]
        );
        if (!own.rowCount) return json(res, 404, { error: 'Routine not found.' });
        const ownerUid = Number(own.rows[0].user_id);
        if (auth.role !== 'admin' && ownerUid !== auth.sub) {
          return json(res, 403, { error: 'Forbidden.' });
        }

        if (reqStatus === 'remove') {
          const existing = await db.query(
            `SELECT status FROM routine_completions WHERE routine_id = $1 AND completed_date = $2`,
            [rid, date]
          );
          if (existing.rows[0]?.status === 'done') {
            return json(res, 403, { error: 'Rotinas concluídas não podem ser desfeitas.' });
          }
          await db.query(
            `DELETE FROM routine_completions WHERE routine_id = $1 AND completed_date = $2`,
            [rid, date]
          );
          return json(res, 200, { status: null });
        }

        const newStatus = reqStatus === 'skip' ? 'skip' : 'done';
        const reasonVal = newStatus === 'skip' ? (reason?.trim() || null) : null;

        await db.query(
          `INSERT INTO routine_completions (routine_id, user_id, completed_date, status, reason)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (routine_id, completed_date) DO UPDATE SET status = $4, reason = $5`,
          [rid, ownerUid, date, newStatus, reasonVal]
        );
        return json(res, 200, { status: newStatus });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { status: null, _migrationNeeded: true });
        throw e;
      }
    }

    // GET ?action=admin-report&from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=X][&status=skip|done|pending]
    if (req.method === 'GET' && action === 'admin-report') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const from     = (req.query.from   || '').trim();
      const to       = (req.query.to     || '').trim();
      const filterUid = req.query.userId ? parseInt(req.query.userId, 10) : null;
      const filterStatus = (req.query.status || '').trim(); // 'done'|'skip'|'pending'
      if (!from || !to) return json(res, 400, { error: 'from and to required.' });

      try {
        // Build date list
        const dates = [];
        const cur = new Date(`${from}T00:00:00Z`);
        const endD = new Date(`${to}T00:00:00Z`);
        while (cur <= endD) { dates.push(cur.toISOString().slice(0,10)); cur.setUTCDate(cur.getUTCDate()+1); }

        // Get all active routines (filtered by user if needed)
        const rParams = filterUid ? [filterUid] : null;
        const rFilter = filterUid ? 'AND ur.user_id = $1' : '';
        const routinesRes = await db.query(
          `SELECT ur.id, ur.user_id, ur.title, ur.frequency, ur.applies_days,
                  u.name AS person_name
           FROM user_routines ur JOIN users u ON u.id = ur.user_id
           WHERE ur.active = TRUE ${rFilter}
           ORDER BY u.name, ur.sort_order`,
          rParams || []
        );

        // Get completions in range
        const compParams = filterUid ? [from, to, filterUid] : [from, to];
        const compFilter = filterUid ? 'AND rc.user_id = $3' : '';
        const compRes = await db.query(
          `SELECT rc.routine_id, rc.completed_date::text AS date, rc.status, rc.reason,
                  u.name AS person_name
           FROM routine_completions rc
           JOIN user_routines ur ON ur.id = rc.routine_id
           JOIN users u ON u.id = rc.user_id
           WHERE rc.completed_date >= $1 AND rc.completed_date <= $2 ${compFilter}`,
          compParams
        );

        const compMap = {};
        for (const c of compRes.rows) {
          const key = `${c.routine_id}_${c.date}`;
          compMap[key] = { status: c.status, reason: c.reason };
        }

        // Build report: for each routine+date that applies, determine status
        const rows = [];
        for (const r of routinesRes.rows) {
          for (const d of dates) {
            const dow = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
            const dom = Number(d.slice(8,10));
            const freq = r.frequency || 'daily';
            const days = r.applies_days;
            let applies = false;
            if (freq === 'daily')    applies = !days || days.includes(dow);
            if (freq === 'weekly')   applies = !days || days.includes(dow);
            if (freq === 'biweekly') applies = Array.isArray(days) && days.includes(dom);
            if (freq === 'monthly')  applies = !days || days.includes(dom);
            if (!applies) continue;

            const key = `${r.id}_${d}`;
            const comp = compMap[key] || null;
            const status = comp ? comp.status : 'pending';

            if (filterStatus && status !== filterStatus) continue;

            rows.push({
              routineId:   r.id,
              userId:      r.user_id,
              personName:  r.person_name,
              title:       r.title,
              date:        d,
              status,
              reason:      comp?.reason || null,
            });
          }
        }

        return json(res, 200, { rows });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { rows: [] });
        throw e;
      }
    }

    // ── Rituais do Time ────────────────────────────────────────────────

    // GET ?action=ritual-week&from=YYYY-MM-DD&to=YYYY-MM-DD
    if (req.method === 'GET' && action === 'ritual-week') {
      const from = (req.query.from || '').trim();
      const to   = (req.query.to   || '').trim();
      if (!from || !to) return json(res, 400, { error: 'from and to required.' });
      try {
        const ritualsRes = await db.query(
          `SELECT id, title, type, description, day_of_week, sort_order
           FROM team_rituals WHERE active = TRUE ORDER BY sort_order, id`
        );
        const occsRes = await db.query(
          `SELECT ro.id, ro.ritual_id, ro.occurrence_date::text AS date, ro.status, ro.notes
           FROM ritual_occurrences ro
           JOIN team_rituals rt ON rt.id = ro.ritual_id
           WHERE rt.active = TRUE
             AND ro.occurrence_date >= $1 AND ro.occurrence_date <= $2`,
          [from, to]
        );
        const occIds = occsRes.rows.map(r => r.id);
        let attendanceRows = [];
        if (occIds.length > 0) {
          const attRes = await db.query(
            `SELECT ra.occurrence_id, ra.user_id, u.name
             FROM ritual_attendance ra JOIN users u ON u.id = ra.user_id
             WHERE ra.occurrence_id = ANY($1::int[])`,
            [occIds]
          );
          attendanceRows = attRes.rows;
        }
        const attMap = {};
        for (const a of attendanceRows) {
          if (!attMap[a.occurrence_id]) attMap[a.occurrence_id] = [];
          attMap[a.occurrence_id].push({ userId: a.user_id, name: a.name });
        }
        const occMap = {};
        for (const o of occsRes.rows) {
          if (!occMap[o.ritual_id]) occMap[o.ritual_id] = {};
          occMap[o.ritual_id][o.date] = {
            id: o.id, status: o.status, notes: o.notes, attendance: attMap[o.id] || [],
          };
        }
        const dates = [];
        const cur = new Date(`${from}T00:00:00Z`);
        const end = new Date(`${to}T00:00:00Z`);
        while (cur <= end) { dates.push(cur.toISOString().slice(0, 10)); cur.setUTCDate(cur.getUTCDate() + 1); }
        const usersRes = await db.query(`SELECT id, name FROM users WHERE active = TRUE ORDER BY name`);
        const rituals = ritualsRes.rows.map(r => {
          const days = {};
          for (const d of dates) {
            const dow = new Date(`${d}T00:00:00Z`).getUTCDay() || 7;
            let applies = false;
            if (r.type === 'daily')        applies = dow >= 1 && dow <= 5;
            else if (r.type === 'weekly')  applies = dow === (r.day_of_week || 1);
            else if (r.type === 'monthly') applies = !!(occMap[r.id]?.[d]);
            if (applies || occMap[r.id]?.[d]) {
              days[d] = occMap[r.id]?.[d] || { id: null, status: 'pending', notes: null, attendance: [] };
            }
          }
          return { id: r.id, title: r.title, type: r.type, description: r.description,
                   day_of_week: r.day_of_week, sort_order: r.sort_order, days };
        });
        return json(res, 200, { rituals, dates, users: usersRes.rows });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { rituals: [], dates: [], users: [], _migrationNeeded: true });
        throw e;
      }
    }

    // POST ?action=ritual-toggle-status  body: { ritualId, date, status }
    if (req.method === 'POST' && action === 'ritual-toggle-status') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const { ritualId, date, status } = req.body || {};
      if (!ritualId || !date) return json(res, 400, { error: 'ritualId and date required.' });
      const newStatus = ['done', 'cancelled', 'pending'].includes(status) ? status : 'done';
      try {
        if (newStatus === 'pending') {
          await db.query(`DELETE FROM ritual_occurrences WHERE ritual_id = $1 AND occurrence_date = $2`, [ritualId, date]);
          return json(res, 200, { status: 'pending', occurrenceId: null });
        }
        const r = await db.query(
          `INSERT INTO ritual_occurrences (ritual_id, occurrence_date, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (ritual_id, occurrence_date) DO UPDATE SET status = $3
           RETURNING id`,
          [ritualId, date, newStatus]
        );
        return json(res, 200, { status: newStatus, occurrenceId: r.rows[0].id });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { status: null, _migrationNeeded: true });
        throw e;
      }
    }

    // POST ?action=ritual-toggle-attendance  body: { occurrenceId, userId }
    if (req.method === 'POST' && action === 'ritual-toggle-attendance') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const { occurrenceId, userId } = req.body || {};
      if (!occurrenceId || !userId) return json(res, 400, { error: 'occurrenceId and userId required.' });
      try {
        const existing = await db.query(
          `SELECT id FROM ritual_attendance WHERE occurrence_id = $1 AND user_id = $2`, [occurrenceId, userId]
        );
        if (existing.rowCount > 0) {
          await db.query(`DELETE FROM ritual_attendance WHERE occurrence_id = $1 AND user_id = $2`, [occurrenceId, userId]);
          return json(res, 200, { attended: false });
        }
        await db.query(
          `INSERT INTO ritual_attendance (occurrence_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [occurrenceId, userId]
        );
        return json(res, 200, { attended: true });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { attended: null, _migrationNeeded: true });
        throw e;
      }
    }

    // POST ?action=ritual-save  body: { id?, title, type, description, day_of_week, sort_order }
    if (req.method === 'POST' && action === 'ritual-save') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const { id, title, type, description, day_of_week, sort_order } = req.body || {};
      if (!title || !type) return json(res, 400, { error: 'title and type required.' });
      if (!['daily', 'weekly', 'monthly'].includes(type)) return json(res, 400, { error: 'Invalid type.' });
      try {
        if (id) {
          await db.query(
            `UPDATE team_rituals SET title=$2, type=$3, description=$4, day_of_week=$5, sort_order=$6 WHERE id=$1`,
            [id, title.trim(), type, description?.trim() || null,
             day_of_week ? Number(day_of_week) : null, Number(sort_order) || 0]
          );
          return json(res, 200, { ok: true, id });
        }
        const r = await db.query(
          `INSERT INTO team_rituals (title, type, description, day_of_week, sort_order)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [title.trim(), type, description?.trim() || null,
           day_of_week ? Number(day_of_week) : null, Number(sort_order) || 0]
        );
        return json(res, 201, { ok: true, id: r.rows[0].id });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { ok: false, _migrationNeeded: true });
        throw e;
      }
    }

    // DELETE ?action=ritual-delete&ritualId=X
    if (req.method === 'DELETE' && action === 'ritual-delete') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Admin only.' });
      const rid = parseInt(req.query.ritualId, 10);
      if (!rid) return json(res, 400, { error: 'ritualId required.' });
      try {
        await db.query(`UPDATE team_rituals SET active = FALSE WHERE id = $1`, [rid]);
        return json(res, 200, { ok: true });
      } catch (e) {
        if (e.code === '42P01') return json(res, 200, { ok: false, _migrationNeeded: true });
        throw e;
      }
    }

    return json(res, 404, { error: 'Unknown action.' });
  } catch (err) {
    if (err.code === '42P01') {
      // Tabela não existe ainda — retorna vazio sem quebrar
      return json(res, 200, { routines: [], days: [], totalPts: 0, _migrationNeeded: true });
    }
    console.error('[routines]', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
