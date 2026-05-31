const db = require('./_lib/db');
const { requireAuth } = require('./_lib/auth');
const { json, methodNotAllowed } = require('./_lib/http');

const COMPANY_PREFIX = {
  onevo:   'onevo',
  seubone: 'seub',
  carbone: 'carb',
};

function getMonthDateRange(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [year, monthStr] = month.split('-');
  const start = new Date(Number(year), Number(monthStr) - 1, 1);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(Number(year), Number(monthStr), 1);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function createTimeEntry(req, res, auth) {
  const { workDate, hours, companyKey, description } = req.body || {};

  if (!workDate || !hours || !companyKey) {
    return json(res, 400, { error: 'workDate, hours e companyKey são obrigatórios.' });
  }

  const parsedHours = Number(hours);

  if (Number.isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    return json(res, 400, { error: 'Hours must be a number between 0 and 24.' });
  }

  const prefix = COMPANY_PREFIX[companyKey];
  if (!prefix) {
    return json(res, 400, { error: 'companyKey inválido. Use: onevo, seubone ou carbone.' });
  }

  const companyResult = await db.query(
    'SELECT id FROM companies WHERE LOWER(name) LIKE $1 LIMIT 1',
    [`${prefix}%`]
  );

  if (companyResult.rowCount === 0) {
    return json(res, 400, { error: 'Empresa não encontrada.' });
  }

  await db.query(
    `
      INSERT INTO time_entries (user_id, company_id, work_date, hours, description)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [auth.sub, companyResult.rows[0].id, workDate, parsedHours, (description || '').trim() || null]
  );

  return json(res, 201, { success: true });
}

async function listTimeEntries(req, res, auth) {
  const { month } = req.query;
  const range = getMonthDateRange(month);

  if (!range) {
    return json(res, 400, {
      error: 'month query must be in YYYY-MM format.',
    });
  }

  const isAdmin = auth.role === 'admin';

  let queryText = `
    SELECT
      te.id,
      te.work_date,
      te.hours,
      te.description,
      c.name AS company_name,
      u.name AS user_name
    FROM time_entries te
    JOIN companies c ON c.id = te.company_id
    JOIN users u ON u.id = te.user_id
    WHERE te.work_date >= $1
      AND te.work_date < $2
  `;

  const queryParams = [range.start, range.end];

  if (!isAdmin) {
    queryText += ' AND te.user_id = $3';
    queryParams.push(auth.sub);
  }

  queryText += ' ORDER BY te.work_date DESC, te.id DESC';

  const result = await db.query(queryText, queryParams);

  return json(res, 200, {
    items: result.rows,
  });
}

async function updateTimeEntry(req, res, auth) {
  const id = parseInt(req.query.id, 10);
  if (!id) return json(res, 400, { error: 'id is required.' });

  const { hours, workDate } = req.body || {};
  const parsedHours = Number(hours);
  if (!hours || Number.isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    return json(res, 400, { error: 'Hours must be a number between 0 and 24.' });
  }

  const updates = ['hours = $1'];
  const params = [parsedHours];

  if (workDate && /^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    params.push(workDate);
    updates.push(`work_date = $${params.length}`);
  }

  params.push(id, auth.sub);
  const result = await db.query(
    `UPDATE time_entries SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING id`,
    params
  );

  if (result.rowCount === 0) return json(res, 404, { error: 'Entry not found.' });
  return json(res, 200, { success: true });
}

async function deleteTimeEntries(req, res, auth) {
  const id = req.query.id ? parseInt(req.query.id, 10) : null;

  if (id) {
    await db.query('DELETE FROM time_entries WHERE id = $1 AND user_id = $2', [id, auth.sub]);
    return json(res, 200, { success: true });
  }

  const weekStart = req.query.weekStart;
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return json(res, 400, { error: 'Provide id or weekStart (YYYY-MM-DD).' });
  }

  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  await db.query(
    'DELETE FROM time_entries WHERE user_id = $1 AND work_date >= $2 AND work_date < $3',
    [auth.sub, weekStart, end.toISOString().slice(0, 10)]
  );

  return json(res, 200, { success: true });
}

module.exports = async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  if (req.method === 'POST') {
    return createTimeEntry(req, res, auth);
  }

  if (req.method === 'GET') {
    return listTimeEntries(req, res, auth);
  }

  if (req.method === 'PATCH') {
    return updateTimeEntry(req, res, auth);
  }

  if (req.method === 'DELETE') {
    return deleteTimeEntries(req, res, auth);
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
};
