const db = require('../_lib/db');
const { signAuthToken } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const { name, password } = req.body || {};

  if (!name || !password) {
    return json(res, 400, {
      error: 'Name and password are required.',
    });
  }

  const userResult = await db.query(
    `
      SELECT id, name, role, must_change_password
      FROM users
      WHERE active = TRUE
        AND LOWER(name) = LOWER($1)
        AND password_hash = crypt($2, password_hash)
      LIMIT 1
    `,
    [name.trim(), password]
  );

  if (userResult.rowCount === 0) {
    return json(res, 401, {
      error: 'Invalid credentials.',
    });
  }

  const user = userResult.rows[0];
  const token = signAuthToken(user);

  return json(res, 200, {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mustChangePassword: user.must_change_password,
    },
  });
};
