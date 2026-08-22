// backend/server.js
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { getAllEntries, searchAnswer, createEntry, updateEntry, deleteEntry } = require("./data/knowledge");
const { askGeminiWithFile, extractScheduleFromFile, answerScheduleQuestion, parseScheduleEditRequest, QuotaError } = require("./utils/gemini");
const quota = require("./utils/quota");
const {
  saveSchedule,
  getScheduleByUser,
  addScheduleEntry,
  moveClassesByIds,
  clearSchedule,
  updateScheduleEntry,
  deleteScheduleEntry
} = require("./data/schedule");
const authRoutes = require("./routes/auth");
const { authenticateToken, requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── CORS ───────────────────────────────────────────────────
// Comma-separated list of allowed origins, e.g.:
// CORS_ORIGINS=https://astra-lite-frontend.onrender.com,http://localhost:5173
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, some mobile clients)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.set("trust proxy", 1);
app.use(helmet());

// ── Upload validation ─────────────────────────────────────
// Only images and PDFs are accepted — that's all Gemini's file-based
// endpoints (chat-with-file, schedule extraction) actually need.
// 15MB cap covers a scanned schedule/photo without leaving the free-tier
// instance exposed to a large-body DoS.
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

const upload = multer({
  dest: path.join(__dirname, "uploads_tmp"),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
  }
});

// Wraps upload.single("file") so multer's own errors (bad type, too large)
// come back as a clean 400 instead of falling through to a 500.
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File is too large. Max size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` });
    }
    if (err.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({ error: "Unsupported file type. Please upload an image or PDF." });
    }
    console.error("Upload error:", err);
    return res.status(400).json({ error: "Failed to process upload." });
  });
}

function parseStartMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function canonicalDay(day) {
  if (!day) return null;
  return DAYS.find((d) => d.toLowerCase() === day.toLowerCase()) || null;
}

// A valid h:MM AM/PM string, e.g. "7:00 AM". Used to sanity-check
// Gemini's add-intent output before trusting it enough to write to the DB.
function isValidTimeString(timeStr) {
  return typeof timeStr === "string" && /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(timeStr.trim());
}

function resolveTargetEntries(schedule, editIntent) {
  if (editIntent.selector === "subject" && editIntent.subject) {
    return schedule.filter(
      (entry) => entry.subject && entry.subject.toLowerCase() === editIntent.subject.toLowerCase() &&
        (!editIntent.from_day || (entry.day || "").toLowerCase() === editIntent.from_day.toLowerCase())
    );
  }

  if (!editIntent.from_day) return [];

  const dayMatches = schedule.filter(
    (entry) => entry.day && entry.day.toLowerCase() === editIntent.from_day.toLowerCase()
  );

  if (editIntent.selector === "first" || editIntent.selector === "last") {
    const withTimes = dayMatches
      .map((entry) => ({ entry, minutes: parseStartMinutes(entry.time) }))
      .filter((item) => item.minutes !== null)
      .sort((a, b) => a.minutes - b.minutes);

    if (withTimes.length === 0) return [];
    const chosen = editIntent.selector === "first" ? withTimes[0] : withTimes[withTimes.length - 1];
    return [chosen.entry];
  }

  return dayMatches;
}

app.get("/", (req, res) => {
  res.json({ status: "ASTRA Backend Running" });
});

app.use("/api/auth", authRoutes);

// ── Quota ──────────────────────────────────────────────────

app.get("/api/quota", async (req, res) => {
  try {
    const status = await quota.getQuotaStatus();
    res.json(status);
  } catch (error) {
    console.error("Failed to load quota status:", error);
    res.status(500).json({ error: "Failed to load quota status." });
  }
});

// ── Knowledge base ─────────────────────────────────────────
// GET stays public (read-only, used by chat/search). Writes require an
// authenticated admin — previously these had no backend check at all.

app.get("/api/knowledge", async (req, res) => {
  try {
    const entries = await getAllEntries();
    res.json(entries);
  } catch (error) {
    console.error("Failed to load knowledge:", error);
    res.status(500).json({ error: "Failed to load knowledge base." });
  }
});

app.post("/api/knowledge", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, title, keywords, content } = req.body || {};
    if (!category || !title || !keywords || !content) {
      return res.status(400).json({ error: "category, title, keywords, and content are required" });
    }
    const entry = await createEntry(category, title, keywords, content);
    res.status(201).json(entry);
  } catch (error) {
    console.error("Failed to create entry:", error);
    res.status(500).json({ error: "Failed to create entry." });
  }
});

app.put("/api/knowledge/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category, title, keywords, content } = req.body || {};
    if (!category || !title || !keywords || !content) {
      return res.status(400).json({ error: "category, title, keywords, and content are required" });
    }
    const entry = await updateEntry(req.params.id, category, title, keywords, content);
    res.json(entry);
  } catch (error) {
    console.error("Failed to update entry:", error);
    res.status(500).json({ error: "Failed to update entry." });
  }
});

app.delete("/api/knowledge/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await deleteEntry(req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Failed to delete entry:", error);
    res.status(500).json({ error: "Failed to delete entry." });
  }
});

// ── Schedule CRUD ──────────────────────────────────────────

app.get("/api/schedule/me", authenticateToken, async (req, res) => {
  try {
    const schedule = await getScheduleByUser(req.user.id);
    res.json({ schedule });
  } catch (error) {
    console.error("Failed to load schedule:", error);
    res.status(500).json({ error: "Failed to load schedule." });
  }
});

app.post("/api/schedule", authenticateToken, async (req, res) => {
  try {
    const { subject, day, time, room } = req.body || {};
    if (!subject || !day || !time) {
      return res.status(400).json({ error: "subject, day, and time are required" });
    }
    const validDay = canonicalDay(day);
    if (!validDay) {
      return res.status(400).json({ error: "Invalid day" });
    }
    const entry = await addScheduleEntry(req.user.id, subject.trim(), validDay, time.trim(), (room || "").trim());
    res.status(201).json(entry);
  } catch (error) {
    console.error("Failed to add schedule entry:", error);
    res.status(500).json({ error: "Failed to add entry." });
  }
});

app.post("/api/schedule/bulk-move", authenticateToken, async (req, res) => {
  try {
    const { fromDay, toDay, newTime } = req.body || {};
    const validFrom = canonicalDay(fromDay);
    const validTo = canonicalDay(toDay);
    if (!validFrom || !validTo) {
      return res.status(400).json({ error: "fromDay and toDay must both be valid days" });
    }

    const schedule = await getScheduleByUser(req.user.id);
    const targets = schedule.filter((entry) => entry.day && entry.day.toLowerCase() === validFrom.toLowerCase());

    if (targets.length === 0) {
      return res.json({ movedCount: 0, message: `No classes found on ${validFrom}.` });
    }

    const ids = targets.map((entry) => entry.id);
    const result = await moveClassesByIds(req.user.id, ids, validTo, newTime || null);
    res.json({
      movedCount: result.movedCount,
      message: `Moved ${result.movedCount} class${result.movedCount > 1 ? "es" : ""} from ${validFrom} to ${validTo}.`
    });
  } catch (error) {
    console.error("Failed bulk move:", error);
    res.status(500).json({ error: "Failed to move classes." });
  }
});

app.delete("/api/schedule/me", authenticateToken, async (req, res) => {
  try {
    const result = await clearSchedule(req.user.id);
    res.json({ message: "Schedule cleared.", ...result });
  } catch (error) {
    console.error("Failed to clear schedule:", error);
    res.status(500).json({ error: "Failed to clear schedule." });
  }
});

app.put("/api/schedule/:id", authenticateToken, async (req, res) => {
  try {
    const { subject, day, time, room } = req.body || {};
    if (!subject || !day || !time) {
      return res.status(400).json({ error: "subject, day, and time are required" });
    }
    const result = await updateScheduleEntry(req.user.id, req.params.id, subject, day, time, room || "");
    res.json(result);
  } catch (error) {
    console.error("Failed to update schedule entry:", error);
    res.status(500).json({ error: "Failed to update entry." });
  }
});

app.delete("/api/schedule/:id", authenticateToken, async (req, res) => {
  try {
    const result = await deleteScheduleEntry(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    console.error("Failed to delete schedule entry:", error);
    res.status(500).json({ error: "Failed to delete entry." });
  }
});

// ── Chat ───────────────────────────────────────────────────

app.post("/api/chat", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body || {};
    console.log("Incoming message:", message);

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const isClearIntent = /clear\s+(my\s+)?schedule/i.test(message);
    if (isClearIntent) {
      await clearSchedule(req.user.id);
      return res.json({ reply: "Done — your schedule has been cleared.", scheduleCleared: true });
    }

    const isScheduleRelated =
      /schedule|class(es)?|move|reschedul|add|create|change.*day|(do|am).*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message);

    if (isScheduleRelated) {
      const schedule = await getScheduleByUser(req.user.id);

      // Note: an ADD request is valid even with an empty schedule, so this
      // early return only applies when there's nothing to move/query — the
      // add branch below runs regardless of whether schedule is empty.
      const editIntent = await parseScheduleEditRequest(message, schedule);

      if (editIntent.action === "move") {
        if (!schedule || schedule.length === 0) {
          return res.json({
            reply: "You haven't uploaded your schedule yet. Use the Upload my schedule button to add it."
          });
        }

        const validToDay = canonicalDay(editIntent.to_day);
        if (!validToDay) {
          return res.json({
            reply: "I wasn't sure which day you wanted to move the class to. Could you specify the destination day?"
          });
        }
        editIntent.to_day = validToDay;
        if (editIntent.from_day) editIntent.from_day = canonicalDay(editIntent.from_day) || editIntent.from_day;

        const targets = resolveTargetEntries(schedule, editIntent);

        if (targets.length === 0) {
          const dayNote = editIntent.from_day ? ` on ${editIntent.from_day}` : "";
          return res.json({ reply: `I couldn't find a matching class${dayNote} to move.` });
        }

        const ids = targets.map((entry) => entry.id);
        const result = await moveClassesByIds(req.user.id, ids, editIntent.to_day, editIntent.new_time || null);

        const whatMoved = targets.length === 1
          ? targets[0].subject
          : `all ${result.movedCount} class${result.movedCount > 1 ? "es" : ""}`;
        const timeNote = editIntent.new_time ? ` at ${editIntent.new_time}` : "";

        return res.json({
          reply: `Done — moved ${whatMoved} from ${targets[0].day} to ${editIntent.to_day}${timeNote}.`,
          scheduleChanged: true
        });
      }

      if (editIntent.action === "add") {
        const validDay = canonicalDay(editIntent.day);
        const startOk = isValidTimeString(editIntent.start_time);
        const endOk = isValidTimeString(editIntent.end_time);

        if (!validDay || !editIntent.subject || !startOk || !endOk) {
          return res.json({
            reply: "I wasn't able to tell exactly which class, day, and time to add. Could you rephrase it like: \"add Data Structures on Monday, 7:00 AM to 8:30 AM, Room 202\"?"
          });
        }

        const time = `${editIntent.start_time} - ${editIntent.end_time}`;
        const entry = await addScheduleEntry(
          req.user.id,
          editIntent.subject.trim(),
          validDay,
          time,
          (editIntent.room || "").trim()
        );

        const roomNote = entry.room ? ` in ${entry.room}` : "";
        return res.json({
          reply: `Done — added ${entry.subject} on ${entry.day} at ${entry.time}${roomNote}.`,
          scheduleChanged: true
        });
      }

      if (editIntent.action === "unclear") {
        return res.json({
          reply: "I wasn't sure exactly what you meant. Could you rephrase which class, day, and time?"
        });
      }

      // action === "none" — treat as a question about the existing schedule.
      if (!schedule || schedule.length === 0) {
        return res.json({
          reply: "You haven't uploaded your schedule yet. Use the Upload my schedule button to add it."
        });
      }

      const reply = await answerScheduleQuestion(message, schedule);
      return res.json({ reply });
    }

    const reply = await searchAnswer(message);
    return res.json({ reply });

  } catch (error) {
    if (error instanceof QuotaError) {
      return res.status(429).json({
        error: "quota_exceeded",
        retryAfterSeconds: error.retryAfterSeconds
      });
    }
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/chat/file", authenticateToken, handleUpload, async (req, res) => {
  const uploadedFile = req.file;
  try {
    const { message } = req.body || {};
    if (!uploadedFile) return res.status(400).json({ error: "File is required" });
    if (!message) return res.status(400).json({ error: "Message is required" });

    const reply = await askGeminiWithFile(message, uploadedFile.path, uploadedFile.mimetype);
    return res.json({ reply });
  } catch (error) {
    if (error instanceof QuotaError) {
      return res.status(429).json({
        error: "quota_exceeded",
        retryAfterSeconds: error.retryAfterSeconds
      });
    }
    console.error("File chat error:", error);
    return res.status(500).json({ error: "Failed to process file." });
  } finally {
    if (uploadedFile) {
      fs.unlink(uploadedFile.path, (err) => { if (err) console.error("Failed to delete temp file:", err); });
    }
  }
});

app.post("/api/schedule/upload", authenticateToken, handleUpload, async (req, res) => {
  const uploadedFile = req.file;
  try {
    if (!uploadedFile) return res.status(400).json({ error: "File is required" });

    const extracted = await extractScheduleFromFile(uploadedFile.path, uploadedFile.mimetype);
    const saved = await saveSchedule(req.user.id, extracted);
    res.json({ schedule: saved });
  } catch (error) {
    if (error instanceof QuotaError) {
      return res.status(429).json({
        error: "quota_exceeded",
        retryAfterSeconds: error.retryAfterSeconds
      });
    }
    console.error("Schedule upload error:", error);
    res.status(500).json({ error: "Failed to process schedule file." });
  } finally {
    if (uploadedFile) {
      fs.unlink(uploadedFile.path, (err) => { if (err) console.error("Failed to delete temp file:", err); });
    }
  }
});

app.listen(PORT, () => {
  console.log(`ASTRA Backend running at http://localhost:${PORT}`);
});