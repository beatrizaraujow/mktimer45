const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const { month } = req.query;
  const range = getMonthDateRange(month);

  if (!range) {
    return json(res, 400, {
      error: 'month query must be in YYYY-MM format.',
    });
  }

  const params = [range.start, range.end];
  let userFilterSql = '';

  if (auth.role !== 'admin') {
    userFilterSql = ' AND te.user_id = $3';
    params.push(auth.sub);
  }

  const companyTotals = await db.query(
    `
      SELECT c.name AS company_name, COALESCE(SUM(te.hours), 0)::float AS total_hours
      FROM companies c
      LEFT JOIN time_entries te
        ON te.company_id = c.id
        AND te.work_date >= $1
        AND te.work_date < $2
        ${auth.role !== 'admin' ? 'AND te.user_id = $3' : ''}
      GROUP BY c.name
      ORDER BY c.name
    `,
    params
  );

  const byMember = await db.query(
    `
      SELECT u.name AS user_name, COALESCE(SUM(te.hours), 0)::float AS total_hours
      FROM users u
      LEFT JOIN time_entries te
        ON te.user_id = u.id
        AND te.work_date >= $1
        AND te.work_date < $2
      WHERE u.active = TRUE
      ${auth.role !== 'admin' ? 'AND u.id = $3' : ''}
      GROUP BY u.name
      ORDER BY u.name
    `,
    params
  );

  const byMemberAndCompany = await db.query(
    `
      SELECT
        u.name AS user_name,
        c.name AS company_name,
        COALESCE(SUM(te.hours), 0)::float AS total_hours
      FROM users u
      CROSS JOIN companies c
      LEFT JOIN time_entries te
        ON te.user_id = u.id
        AND te.company_id = c.id
        AND te.work_date >= $1
        AND te.work_date < $2
      WHERE u.active = TRUE
      ${auth.role !== 'admin' ? 'AND u.id = $3' : ''}
      GROUP BY u.name, c.name
      ORDER BY u.name, c.name
    `,
    params
  );

  return json(res, 200, {
    month,
    companyTotals: companyTotals.rows,
    byMember: byMember.rows,
    byMemberAndCompany: byMemberAndCompany.rows,
  });
};
