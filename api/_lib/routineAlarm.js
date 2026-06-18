const db = require('./db');

function routineApplies(freq, applyDays, date) {
  const d   = new Date(`${date}T00:00:00Z`);
  const dow = d.getUTCDay() || 7; // 1=Seg..7=Dom
  const dom = d.getUTCDate();
  if (freq === 'daily')          return !applyDays || applyDays.length === 0 || applyDays.includes(dow);
  if (freq === 'daily-weekdays') return dow >= 1 && dow <= 5;
  if (freq === 'weekly')         return !applyDays || applyDays.includes(dow);
  if (freq === '3x_week')        return !applyDays || applyDays.includes(dow);
  if (freq === 'custom')         return !applyDays || applyDays.includes(dow);
  if (freq === 'biweekly')       return Array.isArray(applyDays) && applyDays.includes(dom);
  if (freq === 'monthly')        return !applyDays || applyDays.length === 0 || applyDays.includes(dom);
  return false;
}

// Retorna [{ name, routines: [title] }] para quem tiver rotinas pendentes na data.
async function getIncompleteRoutines(date) {
  const colCheck = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'user_routines'
       AND column_name IN ('frequency', 'applies_days')`
  );
  const cols     = new Set(colCheck.rows.map(r => r.column_name));
  const freqCol  = cols.has('frequency')    ? 'ur.frequency'              : "'daily'::text AS frequency";
  const applyCol = cols.has('applies_days') ? 'ur.applies_days'           : 'NULL::int[] AS applies_days';

  const routinesRes = await db.query(
    `SELECT ur.id, ur.user_id, ur.title, ${freqCol}, ${applyCol}, u.name AS person_name
     FROM user_routines ur
     JOIN users u ON u.id = ur.user_id
     WHERE ur.active = TRUE AND u.active = TRUE
       AND COALESCE(u.show_in_daily, TRUE) = TRUE
     ORDER BY u.name, ur.sort_order, ur.id`
  );

  const compRes = await db.query(
    `SELECT rc.routine_id
     FROM routine_completions rc
     WHERE rc.completed_date = $1 AND rc.status = 'done'`,
    [date]
  );
  const doneSet = new Set(compRes.rows.map(r => r.routine_id));

  const userMap = new Map(); // userId → { name, routines: [title] }
  for (const r of routinesRes.rows) {
    const freq = r.frequency || 'daily';
    if (!routineApplies(freq, r.applies_days, date)) continue;
    if (doneSet.has(r.id)) continue;
    if (!userMap.has(r.user_id)) {
      userMap.set(r.user_id, { name: r.person_name, routines: [] });
    }
    userMap.get(r.user_id).routines.push(r.title);
  }

  return Array.from(userMap.values());
}

module.exports = { getIncompleteRoutines };
