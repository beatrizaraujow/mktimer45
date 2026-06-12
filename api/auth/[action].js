const db = require('../_lib/db');
const { signAuthToken, requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  if (action === 'login') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const { name, email, password } = req.body || {};
    const identifier = (email || name || '').trim();
    if (!identifier || !password) return json(res, 400, { error: 'Email e senha são obrigatórios.' });

    const result = await db.query(
      `SELECT id, name, role, must_change_password, COALESCE(is_master, FALSE) AS is_master
       FROM users
       WHERE active = TRUE
         AND (LOWER(COALESCE(clickup_email,'')) = LOWER($1) OR LOWER(name) = LOWER($1))
         AND password_hash = crypt($2, password_hash)
       LIMIT 1`,
      [identifier, password]
    );
    if (result.rowCount === 0) return json(res, 401, { error: 'Invalid credentials.' });

    const user = result.rows[0];
    return json(res, 200, {
      token: signAuthToken(user),
      user: { id: user.id, name: user.name, role: user.role, mustChangePassword: user.must_change_password, isMaster: user.is_master },
    });
  }

  if (action === 'change-password') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const auth = requireAuth(req, res);
    if (!auth) return;

    const { currentPassword, newPassword } = req.body || {};
    const cur = String(currentPassword || '').trim();
    const nxt = String(newPassword || '').trim();

    if (!cur || !nxt) return json(res, 400, { error: 'Senha atual e nova senha sao obrigatorias.' });
    if (nxt.length < 6) return json(res, 400, { error: 'A nova senha precisa ter no minimo 6 caracteres.' });

    const result = await db.query(
      `UPDATE users
       SET password_hash = crypt($3, gen_salt('bf')), must_change_password = FALSE, updated_at = NOW()
       WHERE id = $1 AND password_hash = crypt($2, password_hash)
       RETURNING id`,
      [auth.sub, cur, nxt]
    );
    if (result.rowCount === 0) return json(res, 401, { error: 'Senha atual invalida. Use a senha com que voce acabou de entrar no sistema.' });

    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: 'Unknown auth action.' });
};
