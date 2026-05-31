const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const result = await db.query(
    `
      SELECT id, name, role, must_change_password
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [auth.sub]
  );

  if (result.rowCount === 0) {
    return json(res, 404, { error: 'User not found.' });
  }

  const user = result.rows[0];

  return json(res, 200, {
    id: user.id,
    name: user.name,
    role: user.role,
    mustChangePassword: user.must_change_password,
  });
};
