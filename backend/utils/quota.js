// Tracks Gemini API usage against a daily quota, exposed as a 0-100 percentage.
// Counter resets automatically at UTC midnight. Adjust GEMINI_DAILY_QUOTA in .env
// to match whatever your API key's actual daily limit is.

const DAILY_LIMIT = parseInt(process.env.GEMINI_DAILY_QUOTA, 10) || 1500;

let usedToday = 0;
let currentDay = getDateKey();

function getDateKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function checkRollover() {
  const today = getDateKey();
  if (today !== currentDay) {
    currentDay = today;
    usedToday = 0;
  }
}

function recordRequest() {
  checkRollover();
  usedToday++;
}

function getNextResetIso() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
}

function getQuotaStatus() {
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