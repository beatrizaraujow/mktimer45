const jwt = require('jsonwebtoken');
const { json } = require('./http');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return secret;
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '12h' }
  );
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function requireAuth(req, res) {
  const token = getTokenFromRequest(req);

  if (!token) {
    json(res, 401, { error: 'Unauthorized.' });
    return null;
  }

  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    json(res, 401, { error: 'Invalid token.' });
    return null;
  }
}

function requireAdmin(auth, res) {
  if (!auth || auth.role !== 'admin') {
    json(res, 403, { error: 'Forbidden.' });
    return false;
  }

  return true;
}

module.exports = {
  signAuthToken,
  requireAuth,
  requireAdmin,
};
