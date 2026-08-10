const { GoogleGenAI } = require("@google/genai");
const quota = require("./quota");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.0-flash-lite";

const NO_MARKDOWN_RULE =
  "Do not use markdown formatting of any kind — no asterisks, no bold, no bullet points, no headers. " +
  "Write in plain sentences and paragraphs only, using line breaks between points if needed.";

// ── Quota error helper ─────────────────────────────────────

function extractRetryDelay(error) {
  try {
    const body = JSON.parse(error.message);
    const retryInfo = body?.error?.details?.find(
      (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
    );
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay.replace("s", ""), 10);
      return isNaN(seconds) ? 60 : seconds;
    }
  } catch {}
  return 60;
}

class QuotaError extends Error {
  constructor(retryAfterSeconds) {
    super("QUOTA_EXCEEDED");
    this.name = "QuotaError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ── Retry wrapper ──────────────────────────────────────────

async function withRetry(fn, maxRetries = 2) {
  let attempt = 0;
  while (true) {
    try {
      quota.recordRequest();
      return await fn();
    } catch (error) {
      const isQuota = error?.status === 429 ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("429");

      if (isQuota) {
        const delay = extractRetryDelay(error);

        if (attempt < maxRetries) {
          attempt++;
          console.log(`Quota hit — retrying in ${delay}s (attempt ${attempt}/${maxRetries})...`);
          await new Promise((res) => setTimeout(res, delay * 1000));
          continue;
        }

        // Out of retries — surface to the user
        throw new QuotaError(delay);
      }

      throw error;
    }
  }
}

// ── Gemini call wrappers ───────────────────────────────────

async function askGemini(question, knowledgeEntries) {
  const relevantEntries = knowledgeEntries.filter((entry) => entry.title !== "Greeting");
  const context = relevantEntries.map((e) => e.title + ": " + e.content).join("\n");

  const prompt =
    "You are ASTRA, a helpful assistant for ASIATECH students. " +
    "Answer the student's question using ONLY the information below. " +
    "If the answer isn't in the information provided, say you don't have that information yet. " +
    "Do not greet the student or introduce yourself — just answer the question directly. " +
    "Keep your answer short and friendly. " +
    NO_MARKDOWN_RULE + "\n\n" +
    "SCHOOL INFORMATION:\n" + context +
    "\n\nSTUDENT QUESTION: " + question;

  return withRetry(async () => {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    return response.text;
  });
}

async function askGeminiWithFile(question, filePath, mimeType) {
  return withRetry(async () => {
    const uploadedFile = await ai.files.upload({ file: filePath, config: { mimeType } });

    const prompt =
      "You are ASTRA, a helpful assistant for ASIATECH students. " +
      "The student has uploaded a file and asked a question about it. " +
      "Answer using the contents of the file. " +
      "Keep your answer short and friendly. " +
      NO_MARKDOWN_RULE + "\n\nSTUDENT QUESTION: " + question;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }
          ]
        }
      ]
    });

    return response.text;
  });
}

async function extractScheduleFromFile(filePath, mimeType) {
  return withRetry(async () => {
    const uploadedFile = await ai.files.upload({ file: filePath, config: { mimeType } });

    const prompt =
      "You are extracting a student's class schedule from the attached file. " +
      "Return ONLY a JSON array, with no markdown formatting, no code fences, and no explanation. " +
      "Each item must have exactly these keys: \"subject\", \"day\", \"time\", \"room\". " +
      "Every field must be filled in using the file's contents — do not leave day, time, or room blank " +
      "if that information appears anywhere in the file, even if it's on a different line or column from the subject name. " +
      "If a field truly isn't available anywhere in the file, use an empty string for that field. " +
      "Example of the exact format expected: " +
      "[{\"subject\":\"Data Structures\",\"day\":\"Monday\",\"time\":\"9:00 AM - 10:30 AM\",\"room\":\"301\"}]";

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }
          ]
        }
      ]
    });

    let text = response.text.trim();
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    return JSON.parse(text);
  });
}

async function answerScheduleQuestion(question, scheduleEntries) {
  const validEntries = scheduleEntries.filter((e) => e.subject && e.day && e.time);
  const context = validEntries
    .map((e) => `${e.subject} — ${e.day}, ${e.time}, Room ${e.room || "not specified"}`)
    .join("\n");

  const prompt =
    "You are ASTRA, a helpful assistant for ASIATECH students. " +
    "Below is the student's class schedule. Answer their question using ONLY this schedule. " +
    "If they ask about a specific day, only mention classes on that day. " +
    "If nothing matches their question, say they have no classes matching that. " +
    "Do not greet the student or introduce yourself — just answer directly. " +
    "Keep your answer short and friendly. " +
    NO_MARKDOWN_RULE + "\n\n" +
    "STUDENT SCHEDULE:\n" + context +
    "\n\nSTUDENT QUESTION: " + question;

  return withRetry(async () => {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    return response.text;
  });
}

async function parseScheduleEditRequest(message, scheduleEntries) {
  const validEntries = scheduleEntries.filter((e) => e.subject && e.day && e.time);
  const daysPresent = [...new Set(validEntries.map((e) => e.day))];
  const subjectsPresent = [...new Set(validEntries.map((e) => e.subject))];

  const prompt =
    "You are parsing a student's message to decide if they are asking to MOVE one or more classes " +
    "to a different day (and optionally a different time) on their schedule. Typos and casual phrasing " +
    "are common — interpret intent, don't require exact wording. " +
    "The days currently present in the student's schedule are: " + daysPresent.join(", ") + ". " +
    "The subjects currently present are: " + subjectsPresent.join(", ") + ". " +
    "Return ONLY a JSON object, with no markdown formatting, no code fences, and no explanation. " +
    "If the message is a request to move class(es), return exactly: " +
    "{\"action\":\"move\"," +
    "\"from_day\":<the source day from the schedule's day list, or null if the student named a specific " +
    "subject instead of a day and you don't know which day it falls on>," +
    "\"to_day\":\"<the destination day, normalized to a full day name like Sunday>\"," +
    "\"selector\":\"<one of: all, subject, first, last>\"," +
    "\"subject\":<the exact subject name from the subjects list if selector is subject, otherwise null>," +
    "\"new_time\":<a plain time string like \"5:00 AM\" if the student specified a new time for the class, otherwise null>}. " +
    "Use selector \"all\" if they mean every class on from_day (e.g. \"move all my monday classes\"). " +
    "Use selector \"subject\" if they name a specific class/subject — in this case from_day may be null " +
    "since the subject alone identifies the class regardless of which day it's on. " +
    "Use selector \"first\" if they refer to their first/earliest class on a stated day. " +
    "Use selector \"last\" if they refer to their last/latest class on a stated day. " +
    "Note: selector \"first\" or \"last\" REQUIRE a from_day since they depend on a specific day's ordering. " +
    "If the message is NOT a request to move classes (e.g. it's a question, or unrelated), return exactly: " +
    "{\"action\":\"none\"}. " +
    "If it looks like a move request but selector is \"all\", \"first\", or \"last\" and you cannot " +
    "confidently match from_day to one of the schedule's actual days, return exactly: {\"action\":\"unclear\"}.\n\n" +
    "STUDENT MESSAGE: " + message;

  return withRetry(async () => {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    let text = response.text.trim();
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    try {
      return JSON.parse(text);
    } catch {
      return { action: "none" };
    }
  });
}

module.exports = {
  askGemini,
  askGeminiWithFile,
  extractScheduleFromFile,
  answerScheduleQuestion,
  parseScheduleEditRequest,
  QuotaError
};