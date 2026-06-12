const { Pool } = require('pg');

let pool;

function buildPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,                    // 1 conexão por invocação serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

function getPool() {
  if (!pool) pool = buildPool();
  return pool;
}

const SOCKET_ERRORS = ['socket', 'connection terminated', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'server closed'];

async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } catch (err) {
    const isSocketErr = SOCKET_ERRORS.some(k => (err.message || '').toLowerCase().includes(k.toLowerCase()));
    if (isSocketErr) {
      // Recria o pool e tenta uma vez mais
      client.release(true);
      pool = null;
      const client2 = await getPool().connect();
      try {
        return await client2.query(text, params);
      } finally {
        client2.release();
      }
    }
    throw err;
  } finally {
    try { client.release(); } catch (_) {}
  }
}

async function connect() {
  return getPool().connect();
}

module.exports = { query, connect };
