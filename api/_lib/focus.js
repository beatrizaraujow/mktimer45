const db = require('./db');

function getDateParts(dateInput) {
  const date = dateInput ? new Date(`${dateInput}T00:00:00Z`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;

  return {
    isoDate,
    year,
    month,
    day,
    date,
  };
}

function clampWeeks(value) {
  const weeks = Number(value);
  if (Number.isNaN(weeks)) return 4;
  return Math.min(52, Math.max(1, Math.trunc(weeks)));
}

async function getOrCreateActiveSession(userId) {
  const active = await db.query(
    `
      SELECT id, started_at
      FROM focus_sessions
      WHERE user_id = $1
        AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [userId]
  );

  if (active.rowCount > 0) {
    return active.rows[0];
  }

  const inserted = await db.query(
    `
      INSERT INTO focus_sessions (user_id)
      VALUES ($1)
      RETURNING id, started_at
    `,
    [userId]
  );

  return inserted.rows[0];
}

module.exports = {
  getDateParts,
  clampWeeks,
  getOrCreateActiveSession,
};
