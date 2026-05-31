const db = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { json, methodNotAllowed } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const { currentPassword, newPassword } = req.body || {};
  const currentPasswordNormalized = String(currentPassword || '').trim();
  const newPasswordNormalized = String(newPassword || '').trim();

  if (!currentPasswordNormalized || !newPasswordNormalized) {
    return json(res, 400, {
      error: 'Senha atual e nova senha sao obrigatorias.',
    });
  }

  if (newPasswordNormalized.length < 6) {
    return json(res, 400, {
      error: 'A nova senha precisa ter no minimo 6 caracteres.',
    });
  }

  const updateResult = await db.query(
    `
      UPDATE users
      SET
        password_hash = crypt($3, gen_salt('bf')),
        must_change_password = FALSE,
        updated_at = NOW()
      WHERE id = $1
        AND password_hash = crypt($2, password_hash)
      RETURNING id
    `,
    [auth.sub, currentPasswordNormalized, newPasswordNormalized]
  );

  if (updateResult.rowCount === 0) {
    return json(res, 401, {
      error: 'Senha atual invalida. Use a senha com que voce acabou de entrar no sistema.',
    });
  }

  return json(res, 200, {
    success: true,
  });
};
