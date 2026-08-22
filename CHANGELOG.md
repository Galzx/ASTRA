# ASTRA-Lite — Changelog

**Date:** August 22, 2026  
**Scope:** Codebase audit & improvement pass — 16 fixes across security, reliability, architecture, and infrastructure.

---

## 🚨 Critical Fixes

### 1. Restored `backend/utils/gemini.js` — AI functions recovered

The file was accidentally overwritten with a copy of `server.js`, completely destroying all AI functionality. The chatbot, schedule OCR, file analysis, and NLP intent parsing were all broken at runtime.

**What was recovered:**
- `askGemini()` — Knowledge base Q&A with Gemini fallback
- `askGeminiWithFile()` — Multimodal file analysis
- `extractScheduleFromFile()` — OCR schedule extraction from images/PDFs
- `answerScheduleQuestion()` — Schedule-aware Q&A
- `parseScheduleEditRequest()` — NLP intent parsing for move/add/none/unclear actions
- `QuotaError` class — Structured quota exceeded errors
- `withRetry()` — Retry wrapper with exponential backoff for 429 errors

**Enhancement:** `parseScheduleEditRequest` now supports the `add` action (adding new classes via chat), in addition to `move`, `none`, and `unclear`.

---

### 2. Transaction-safe schedule saves in `backend/data/schedule.js`

**Problem:** `saveSchedule()` deleted all existing schedule entries before inserting new ones. If the inserts failed (constraint error, disk full, crash), the user's entire schedule was permanently lost with no way to recover.

**Fix:** Wrapped the DELETE + INSERT sequence in a SQLite transaction:
```
BEGIN TRANSACTION → DELETE → INSERT all → COMMIT
                                          ↓ (on any error)
                                       ROLLBACK
```

---

### 3. Secrets protection

**Problem:** Live API keys (`GEMINI_API_KEY`, `JWT_SECRET`, `ADMIN_KEY`) existed in plain text `.env` files, including inside a nested duplicate clone directory.

**Fixes:**
- Created `backend/.env.example` documenting all required and optional environment variables
- Updated `.gitignore` to cover `.env.local`, `.env.*.local`, `backend/uploads_tmp/`, and the nested `/ASTRA-Lite/` clone directory
- Removed duplicate `.env` entry from `.gitignore`

---

## 🔴 High-Priority Security Fixes

### 4. Async bcrypt in `backend/models/User.js`

**Problem:** `bcrypt.hashSync()` and `bcrypt.compareSync()` block the entire Node.js event loop. During password hashing (~100ms), the server cannot handle any other requests — every concurrent user freezes.

**Fix:**
- `User.save()`: `bcrypt.hashSync(password, 10)` → `await bcrypt.hash(password, 10)`
- `User.verifyPassword()`: `bcrypt.compareSync()` → `await bcrypt.compare()`
- `routes/auth.js`: Added `await` to the now-async `verifyPassword()` call

---

### 5. User existence validation in `backend/middleware/auth.js`

**Problem:** The JWT middleware only verified the token signature. If a user was deleted or banned, their token remained fully authorized for up to 7 days (the token expiry).

**Fix:** After JWT verification, the middleware now queries the database via `User.findByUsername(decoded.username)`. If the user no longer exists, a 403 error is returned.

---

### 6. Trust proxy + Helmet in `backend/server.js`

**Problem:** Behind Render's reverse proxy, all incoming requests appeared to originate from the same IP address, making `express-rate-limit` either too aggressive (blocking everyone) or useless. No HTTP security headers were set.

**Fixes:**
- Added `app.set("trust proxy", 1)` — rate limiter now sees real client IPs
- Added `app.use(helmet())` — sets security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- Installed `helmet` package as a dependency

---

### 7. Database path fix in `backend/database/database.js`

**Problem:** The database path `"./database/astra.db"` was relative to `process.cwd()`. Running `node backend/server.js` from the repository root would create or look for the database at `root/database/astra.db` instead of `backend/database/astra.db`.

**Fix:** Changed to `path.join(__dirname, "astra.db")`, which always resolves correctly regardless of where Node is invoked from.

---

## 🟠 Feature Enhancement

### 8. Add-class-via-chat in `backend/server.js`

Students can now add new classes through natural language chat commands (e.g., *"add Data Structures on Monday, 7:00 AM to 8:30 AM, Room 202"*).

**Changes:**
- Added `isValidTimeString()` helper to validate Gemini's time output before writing to DB
- Extended `isScheduleRelated` regex to match `add` and `create` keywords
- Restructured the empty-schedule early return to allow ADD intents through (previously all schedule operations were blocked when the schedule was empty)
- Added complete `add` action handler with day/time/subject/room validation
- Added `scheduleChanged: true` flag to move and add responses so the frontend knows to refresh the schedule grid

---

## 🔵 Infrastructure Improvements

### 9. npm Workspaces — `package.json` (root)

**Problem:** The root `package.json` had no `name`, no `version`, no `scripts`, and contained misplaced dependencies (`@supabase/supabase-js`, `express-rate-limit`) that belong in `backend/`.

**Fix:** Replaced with proper workspace configuration:
- `workspaces: ["backend", "frontend"]`
- Root scripts: `dev:backend`, `dev:frontend`, `build`, `start`
- Removed misplaced dependencies

### 10. Backend entry point — `backend/package.json`

- Fixed `main` from `"index.js"` to `"server.js"`
- Added `"start": "node server.js"` script

### 11. Project documentation — `README.md`

Created comprehensive README (was 0 bytes) covering:
- Project overview and features
- Tech stack table
- Prerequisites and setup instructions
- Environment variable reference
- Project structure diagram

### 12. Editor configuration — `.editorconfig`

Replaced 60 lines of Visual Studio C++ formatting rules with standard web development settings:
- `indent_style = space`, `indent_size = 2`
- `end_of_line = lf`, `charset = utf-8`
- Trailing whitespace trimming (except markdown)

---

## Files Modified

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `backend/utils/gemini.js` | **Restored** | Recovered all AI functions from git history, added `add` intent |
| 2 | `backend/data/schedule.js` | Modified | Transaction-safe `saveSchedule` (BEGIN/COMMIT/ROLLBACK) |
| 3 | `backend/.env.example` | **New** | Environment variable documentation template |
| 4 | `.gitignore` | Modified | Cleaned up, added nested clone + uploads_tmp ignore |
| 5 | `backend/models/User.js` | Modified | Async `bcrypt.hash()` and `bcrypt.compare()` |
| 6 | `backend/routes/auth.js` | Modified | `await` for async `verifyPassword()` |
| 7 | `backend/middleware/auth.js` | Modified | DB user existence check after JWT verification |
| 8 | `backend/server.js` | Modified | Helmet, trust proxy, add-intent handler, `scheduleChanged` flag |
| 9 | `backend/database/database.js` | Modified | `path.join(__dirname, "astra.db")` |
| 10 | `backend/package.json` | Modified | Fixed `main`, added `start` script, added `helmet` dep |
| 11 | `package.json` (root) | Modified | npm workspaces configuration |
| 12 | `README.md` | **New content** | Full project documentation |
| 13 | `.editorconfig` | Modified | Web dev standards replacing C++ rules |

---

## Remaining Recommendations

These items were identified during the audit but not yet addressed:

| Priority | Item |
|----------|------|
| Medium | Split `Chatbot.jsx` (31KB, 896 lines) into sub-components |
| Medium | Split `ScheduleGrid.jsx` (30KB, 779 lines) into sub-components |
| Medium | Split `App.css` (37KB) into CSS Modules per component |
| Medium | Add `React.memo` / `useMemo` to prevent unnecessary re-renders |
| Medium | Persist API quota state in SQLite instead of in-memory |
| Low | Add React Error Boundaries to prevent white-screen crashes |
| Low | Accessibility pass — `aria-live` for chat, keyboard nav for schedule grid |
| Low | Add Vitest + React Testing Library test suites |
| Low | Add GitHub Actions CI/CD pipeline |
| Low | Migrate SQLite → PostgreSQL for production persistence on Render |
| Low | Delete nested `ASTRA-Lite/ASTRA-Lite/` duplicate clone directory |

