const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  try {
    const { action, userId } = req.query;

    // ── GET team-coins (feed público para o Turbo Dashboard) ─────────────
    // Autenticado por chave estática TURBO_DASHBOARD_KEY (sem JWT).
    if (action === 'team-coins') {
      // CORS — permite chamada cross-origin do dashboard
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

      const dashKey = process.env.TURBO_DASHBOARD_KEY || 'sb-turbo-2026-coins';
      if (String(req.query.key || '') !== dashKey) {
        return json(res, 401, { error: 'Invalid key.' });
      }

      const result = await db.query(
        `SELECT u.name,
                COALESCE(u.clickup_email, '') AS email,
                COALESCE(SUM(l.amount), 0)::int AS total_coins
         FROM users u
         LEFT JOIN sb_coin_ledger l ON l.user_id = u.id
         WHERE u.active = TRUE
           AND COALESCE(u.show_in_daily, TRUE) = TRUE
         GROUP BY u.id, u.name, u.clickup_email
         ORDER BY u.name`
      );

      return json(res, 200, {
        users: result.rows.map(r => ({
          name:       r.name,
          email:      r.email,
          totalCoins: Number(r.total_coins),
        })),
      });
    }

    // ── GET team-junho-breakdown (Turbo Dashboard) ───────────────────────
    if (action === 'team-junho-breakdown') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }
      if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

      const dashKey = process.env.TURBO_DASHBOARD_KEY || 'sb-turbo-2026-coins';
      if (String(req.query.key || '') !== dashKey) {
        return json(res, 401, { error: 'Invalid key.' });
      }

      const [usersRes, weeklyRes, ledgerRes] = await Promise.all([
        db.query(
          `SELECT id, name, COALESCE(clickup_email,'') AS email
           FROM users
           WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE
           ORDER BY name`
        ),
        db.query(
          `SELECT sc.user_id,
                  sc.week_start::text AS week_start,
                  sc.coins_earned::int AS coins_earned,
                  COALESCE(sc.pts_earned, 0)::int AS pts_earned
           FROM sb_coins sc
           JOIN users u ON u.id = sc.user_id
           WHERE u.active = TRUE
             AND COALESCE(u.show_in_daily, TRUE) = TRUE
             AND sc.week_start >= '2026-06-01'
             AND sc.week_start <  '2026-07-01'
           ORDER BY sc.week_start`
        ).catch(() => ({ rows: [] })),
        db.query(
          `SELECT user_id, COALESCE(SUM(amount),0)::int AS total
           FROM sb_coin_ledger GROUP BY user_id`
        ).catch(() => ({ rows: [] })),
      ]);

      const weeklyMap  = {};
      for (const r of weeklyRes.rows) {
        const uid = Number(r.user_id);
        if (!weeklyMap[uid]) weeklyMap[uid] = { total: 0, weeks: [] };
        weeklyMap[uid].total += Number(r.coins_earned);
        weeklyMap[uid].weeks.push({ weekStart: r.week_start, coinsEarned: Number(r.coins_earned), ptsEarned: Number(r.pts_earned) });
      }
      const ledgerMap = new Map(ledgerRes.rows.map(r => [Number(r.user_id), Number(r.total)]));

      return json(res, 200, {
        users: usersRes.rows.map(u => {
          const uid = Number(u.id);
          const w   = weeklyMap[uid] || { total: 0, weeks: [] };
          return {
            name:           u.name,
            email:          u.email,
            ledgerTotal:    ledgerMap.get(uid) || 0,
            weeklyCoinsJun: w.total,
            weeks:          w.weeks,
          };
        }),
      });
    }

    // Todos os demais endpoints exigem JWT
    const auth = requireAuth(req, res);
    if (!auth) return;

    if (req.method !== 'GET' && req.method !== 'POST') {
      return methodNotAllowed(res, ['GET', 'POST']);
    }

    // ── GET balance (default) ─────────────────────────────────────────────
    if (req.method === 'GET' && (!action || action === 'balance')) {
      const targetId = userId ? parseInt(userId, 10) : auth.sub;
      if (auth.role !== 'admin' && targetId !== auth.sub) {
        return json(res, 403, { error: 'Forbidden.' });
      }

      const todayStr = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

      const [ledgerRes, weeksRes] = await Promise.all([
        db.query(
          `SELECT COALESCE(SUM(amount), 0)::int AS total
           FROM sb_coin_ledger WHERE user_id = $1`,
          [targetId]
        ).catch(() => ({ rows: [{ total: 0 }] })),

        db.query(
          `SELECT sc.week_start,
                  (sc.week_start + INTERVAL '6 days')::date AS week_end,
                  sc.coins_earned, sc.pts_earned,
                  EXISTS (
                    SELECT 1 FROM sb_coin_ledger l
                    WHERE l.user_id = $1
                      AND l.week_start = sc.week_start
                      AND l.type = 'weekly_earn'
                  ) AS credited
           FROM sb_coins sc
           WHERE sc.user_id = $1
           ORDER BY sc.week_start DESC
           LIMIT 12`,
          [targetId]
        ).catch(() => ({ rows: [] })),
      ]);

      const pendingCoins = weeksRes.rows
        .filter(r => !r.credited && String(r.week_end).slice(0, 10) < todayStr)
        .reduce((s, r) => s + Number(r.coins_earned), 0);

      return json(res, 200, {
        userId:      targetId,
        totalCoins:  Number(ledgerRes.rows[0]?.total || 0),
        pendingCoins,
        weeks: weeksRes.rows.map(r => ({
          weekStart:   String(r.week_start).slice(0, 10),
          weekEnd:     String(r.week_end).slice(0, 10),
          coinsEarned: Number(r.coins_earned),
          ptsEarned:   Number(r.pts_earned),
          credited:    Boolean(r.credited),
        })),
      });
    }

    // ── GET leaderboard ───────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'leaderboard') {
      const todayStr = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

      const [usersRes, ledgerSumRes, sbStatsRes] = await Promise.all([
        db.query(
          `SELECT id, name, COALESCE(cargo,'') AS cargo
           FROM users
           WHERE active = TRUE AND COALESCE(show_in_daily, TRUE) = TRUE
           ORDER BY name`
        ),

        db.query(
          `SELECT user_id, COALESCE(SUM(amount), 0)::int AS total
           FROM sb_coin_ledger
           GROUP BY user_id`
        ).catch(() => ({ rows: [] })),

        db.query(
          `SELECT user_id,
                  COUNT(*)::int                                       AS weeks_total,
                  SUM(coins_earned)::int                              AS coins_earned_total,
                  COUNT(*) FILTER (WHERE coins_earned >= 5)::int      AS weeks_meta_hit,
                  MAX(coins_earned)::int                              AS best_week
           FROM sb_coins
           WHERE (week_start + INTERVAL '6 days')::date < $1
           GROUP BY user_id`,
          [todayStr]
        ).catch(() => ({ rows: [] })),
      ]);

      const ledgerMap = new Map(ledgerSumRes.rows.map(r => [Number(r.user_id), Number(r.total)]));
      const statsMap  = new Map(sbStatsRes.rows.map(r => [Number(r.user_id), r]));

      const leaderboard = usersRes.rows.map(u => {
        const uid   = Number(u.id);
        const stats = statsMap.get(uid);
        return {
          id:           uid,
          name:         u.name,
          cargo:        u.cargo,
          totalCoins:   ledgerMap.get(uid) || 0,
          pendingCoins: stats
            ? Math.max(0, Number(stats.coins_earned_total) - (ledgerMap.get(uid) || 0))
            : 0,
          weeksTotal:   stats ? Number(stats.weeks_total)    : 0,
          weeksMetaHit: stats ? Number(stats.weeks_meta_hit) : 0,
          bestWeek:     stats ? Number(stats.best_week)      : 0,
        };
      }).sort((a, b) => b.totalCoins - a.totalCoins || b.pendingCoins - a.pendingCoins);

      return json(res, 200, { leaderboard });
    }

    // ── POST credit-weekly ────────────────────────────────────────────────
    // Credita semanas encerradas no ledger. Idempotente.
    // Fonte de verdade: snapshot_entries.coins_validadas se disponível, senão sb_coins.coins_earned.
    if (req.method === 'POST' && action === 'credit-weekly') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Forbidden.' });

      const todayStr = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

      // Semanas encerradas ainda não creditadas no ledger
      const pendingRes = await db.query(
        `SELECT sc.user_id, sc.week_start::text AS week_start,
                COALESCE(se.coins_validadas, sc.coins_earned)::int AS coins_to_credit
         FROM sb_coins sc
         LEFT JOIN week_snapshots ws ON ws.week_start = sc.week_start
         LEFT JOIN snapshot_entries se
           ON se.snapshot_id = ws.id AND se.user_id = sc.user_id
         WHERE (sc.week_start + INTERVAL '6 days')::date < $1
           AND NOT EXISTS (
             SELECT 1 FROM sb_coin_ledger l
             WHERE l.user_id = sc.user_id
               AND l.week_start = sc.week_start
               AND l.type = 'weekly_earn'
           )`,
        [todayStr]
      ).catch(() => ({ rows: [] }));

      if (!pendingRes.rows.length) {
        return json(res, 200, { credited: 0, skipped: 0, message: 'Nenhuma semana pendente.' });
      }

      let credited = 0, skipped = 0;
      for (const row of pendingRes.rows) {
        const amount = Number(row.coins_to_credit);
        if (amount <= 0) { skipped++; continue; }

        const result = await db.query(
          `INSERT INTO sb_coin_ledger (user_id, week_start, amount, type, description)
           VALUES ($1, $2::date, $3, 'weekly_earn', $4)
           ON CONFLICT (user_id, week_start) WHERE type = 'weekly_earn' DO NOTHING
           RETURNING id`,
          [row.user_id, row.week_start, amount, `Coins semana ${row.week_start}`]
        ).catch(() => ({ rows: [] }));

        if (result.rows.length) credited++; else skipped++;
      }

      return json(res, 200, {
        credited,
        skipped,
        total: pendingRes.rows.length,
      });
    }

    // ── POST admin-adjust ─────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'admin-adjust') {
      if (auth.role !== 'admin') return json(res, 403, { error: 'Forbidden.' });

      const { userId: targetUserId, amount, description } = req.body || {};
      const uid = parseInt(targetUserId, 10);
      const amt = parseInt(amount, 10);

      if (!uid || isNaN(amt) || amt === 0) {
        return json(res, 400, { error: 'userId e amount (diferente de 0) sao obrigatorios.' });
      }

      if (amt < 0) {
        const balRes = await db.query(
          `SELECT COALESCE(SUM(amount), 0)::int AS total FROM sb_coin_ledger WHERE user_id = $1`,
          [uid]
        ).catch(() => ({ rows: [{ total: 0 }] }));
        const current = Number(balRes.rows[0]?.total || 0);
        if (current + amt < 0) {
          return json(res, 400, { error: `Saldo insuficiente. Atual: ${current} coins.` });
        }
      }

      const desc = (description || '').trim() || `Ajuste manual`;
      await db.query(
        `INSERT INTO sb_coin_ledger (user_id, amount, type, description)
         VALUES ($1, $2, 'admin_adjust', $3)`,
        [uid, amt, desc]
      );

      const newBalRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS total FROM sb_coin_ledger WHERE user_id = $1`,
        [uid]
      ).catch(() => ({ rows: [{ total: 0 }] }));

      return json(res, 200, {
        success:    true,
        userId:     uid,
        amount:     amt,
        newBalance: Number(newBalRes.rows[0]?.total || 0),
      });
    }

    return json(res, 400, { error: 'Action invalida. Use: balance, leaderboard, credit-weekly, admin-adjust.' });

  } catch (err) {
    console.error('[coins] unhandled error:', err);
    return json(res, 500, { error: err.message || String(err) });
  }
};
