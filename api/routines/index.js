const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  try {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const action = (req.query.action || '').toString();

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
              applies = true;
            } else if (r.frequency === 'weekly') {
              applies = !r.applies_days || r.applies_days.includes(dow);
            } else if (r.frequency === 'monthly') {
              // applies on the creation day of month — simplified: applies on first day of each week
              applies = dow === 1; // Monday only for now
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
            // all days OR weekdays only
            if (!days) return true;
            return days.includes(dow);
          }
          if (freq === 'weekly') {
            return !days || days.includes(dow);
          }
          if (freq === 'monthly') {
            return !days || days.includes(dayOfMonth);
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
      const { title, observation, company, frequency, applies_days, points, sort_order, active } = req.body || {};
      try {
        await db.query(
          `UPDATE user_routines SET
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
           frequency || null, applies_days?.length ? applies_days : null,
           points ? Number(points) : null, sort_order != null ? Number(sort_order) : null,
           active != null ? Boolean(active) : null]
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
            if (freq === 'daily')   applies = !days || days.includes(dow);
            if (freq === 'weekly')  applies = !days || days.includes(dow);
            if (freq === 'monthly') applies = !days || days.includes(dom);
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
