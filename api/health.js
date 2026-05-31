const { json, methodNotAllowed } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  return json(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
