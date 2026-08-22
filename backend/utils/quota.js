// backend/utils/quota.js
// Tracks Gemini API usage against a daily quota, exposed as a 0-100 percentage.
// Persisted to SQLite (quota_usage table) so the count survives server
// restarts/redeploys instead of resetting to 0 every time Render spins the
// dyno back up. Counter still resets at UTC midnight either way.

const db = require("../database/database");

const DAILY_LIMIT = parseInt(process.env.GEMINI_DAILY_QUOTA, 10) || 1500;

let usedToday = 0;
let currentDay = getDateKey();

function getDateKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getNextResetIso() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

const ready = (async () => {
  await dbRun(
    "CREATE TABLE IF NOT EXISTS quota_usage (day TEXT PRIMARY KEY, used INTEGER NOT NULL DEFAULT 0)"
  );

  currentDay = getDateKey();
  const row = await dbGet("SELECT used FROM quota_usage WHERE day = ?", [currentDay]);
  usedToday = row ? row.used : 0;
})().catch((err) => {
  console.error("Failed to initialize quota table:", err);
});

function checkRollover() {
  const today = getDateKey();
  if (today !== currentDay) {
    currentDay = today;
    usedToday = 0;
  }
}

function persist(day, used) {
  dbRun(
    "INSERT INTO quota_usage (day, used) VALUES (?, ?) " +
    "ON CONFLICT(day) DO UPDATE SET used = excluded.used",
    [day, used]
  ).catch((err) => console.error("Failed to persist quota usage:", err));
}

async function recordRequest() {
  await ready;
  checkRollover();
  usedToday++;
  persist(currentDay, usedToday);
}

async function getQuotaStatus() {
  await ready;
  checkRollover();
  const percent = Math.min(100, Math.round((usedToday / DAILY_LIMIT) * 100));
  return {
    used: usedToday,
    limit: DAILY_LIMIT,
    percent,
    resetsAt: getNextResetIso()
  };
}

module.exports = { recordRequest, getQuotaStatus };