// backend/server.js
const express = require("express");
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
const authenticateToken = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

app.use(cors());
app.use(express.json());

const upload = multer({ dest: path.join(__dirname, "uploads_tmp") });

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

app.get("/api/quota", (req, res) => {
  res.json(quota.getQuotaStatus());
});

app.get("/api/knowledge", async (req, res) => {
  try {
    const entries = await getAllEntries();
    res.json(entries);
  } catch (error) {
    console.error("Failed to load knowledge:", error);
    res.status(500).json({ error: "Failed to load knowledge base." });
  }
});

app.post("/api/knowledge", async (req, res) => {
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

app.put("/api/knowledge/:id", async (req, res) => {
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

app.delete("/api/knowledge/:id", async (req, res) => {
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
      /schedule|class(es)?|move|reschedul|change.*day|(do|am).*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message);

    if (isScheduleRelated) {
      const schedule = await getScheduleByUser(req.user.id);

      if (!schedule || schedule.length === 0) {
        return res.json({
          reply: "You haven't uploaded your schedule yet. Use the Upload my schedule button to add it."
        });
      }

      const editIntent = await parseScheduleEditRequest(message, schedule);

      if (editIntent.action === "move") {
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
          reply: `Done — moved ${whatMoved} from ${targets[0].day} to ${editIntent.to_day}${timeNote}.`
        });
      }

      if (editIntent.action === "unclear") {
        return res.json({
          reply: "I wasn't sure which day you meant to move from. Could you rephrase which day and which class?"
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

app.post("/api/chat/file", authenticateToken, upload.single("file"), async (req, res) => {
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

app.post("/api/schedule/upload", authenticateToken, upload.single("file"), async (req, res) => {
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