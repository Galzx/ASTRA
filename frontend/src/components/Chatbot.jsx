import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "../models/ChatMessage";
import ScheduleGrid from "./ScheduleGrid";
import { API_BASE_URL } from "../config";

const EXAMPLE_PROMPTS = [
  "what's the passing grade?",
  "how many absences am I allowed?",
  "what do I need to enroll?",
  "can I get a refund if I drop a subject?",
  "where's the library?",
  "am I eligible for the SHS voucher?"
];

const GREETINGS = {
  morning: ["Good morning", "Morning", "Rise and shine"],
  afternoon: ["Good afternoon", "Afternoon"],
  evening: ["Good evening", "Evening"],
  night: ["Working late", "Good evening"]
};

const MOBILE_BREAKPOINT = 768;

function getRandomPrompt() {
  return EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
}

function getGreeting(fullName) {
  const hour = new Date().getHours();
  let pool;
  if (hour >= 5 && hour < 12) pool = GREETINGS.morning;
  else if (hour >= 12 && hour < 18) pool = GREETINGS.afternoon;
  else if (hour >= 18 && hour < 22) pool = GREETINGS.evening;
  else pool = GREETINGS.night;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  return fullName ? `${phrase}, ${fullName}` : phrase;
}

// ── Offline / error copy ────────────────────────────────────

const OFFLINE_BANNER_MESSAGE =
  "Having trouble reaching ASTRA's server. If this just started, it may still be waking up — try again in a few seconds.";

const OFFLINE_CHAT_MESSAGE =
  "I couldn't reach the server just now. It may still be starting up — please try sending that again in a moment.";

// ── Session persistence helpers ─────────────────────────────

function reviveMessages(rawMessages) {
  return (rawMessages || []).map((item) => {
    const msg = new ChatMessage(item.sender, item.text);
    if (item.timestamp) msg.timestamp = new Date(item.timestamp);
    return msg;
  });
}

function loadSavedSessions() {
  const saved = sessionStorage.getItem("astra_chat_sessions");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((s) => ({ ...s, messages: reviveMessages(s.messages) }));
  } catch (err) {
    console.error("Failed to parse saved chat sessions:", err);
    return [];
  }
}

function loadInitialMessages() {
  const sessions = loadSavedSessions();
  const sid = sessionStorage.getItem("astra_current_session_id");
  const found = sessions.find((s) => s.id === sid);
  return found ? found.messages : [];
}

function generateSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages) {
  const first = messages.find((m) => m.sender === "student");
  if (!first) return "New chat";
  return first.text.length > 40 ? `${first.text.slice(0, 40)}…` : first.text;
}

function formatSessionMeta(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday ? `Today · ${time}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

// ── Icons ──────────────────────────────────────────────────

function SidebarToggleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function CalendarToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.64 17.32a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20a8 8 0 1 1 8-8" />
      <path d="M12 12l4-4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Quota Meter (header) ─────────────────────────────────────

function QuotaMeter({ percent }) {
  if (percent === null || percent === undefined) return null;

  const level = percent >= 90 ? "critical" : percent >= 70 ? "warning" : "ok";

  return (
    <div className={`quota-meter quota-meter-${level}`} title={`Daily AI quota used: ${percent}%`}>
      <GaugeIcon />
      <div className="quota-meter-track">
        <div className="quota-meter-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="quota-meter-label">{percent}%</span>
    </div>
  );
}

// ── Quota Banner (rate-limited state) ────────────────────────

function QuotaBanner({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onDone]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0
    ? `${mins}m ${secs.toString().padStart(2, "0")}s`
    : `${secs}s`;

  return (
    <div className="quota-banner">
      <WarningIcon />
      <span>
        AI request limit reached. Try again in <strong>{timeStr}</strong>.
      </span>
    </div>
  );
}

// ── Thinking Indicator (elapsed-time, replaces plain dots) ──

function ThinkingIndicator() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="astra-message typing-indicator">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="thinking-elapsed">Thinking… {seconds}s</span>
    </div>
  );
}

// ── Chatbot ────────────────────────────────────────────────

function Chatbot({ username, fullName, token }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(() => loadInitialMessages());
  const [chatSessions, setChatSessions] = useState(() => loadSavedSessions());
  const [currentSessionId, setCurrentSessionId] = useState(
    () => sessionStorage.getItem("astra_current_session_id") || null
  );
  const [isTyping, setIsTyping] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [quotaSeconds, setQuotaSeconds] = useState(null);
  const [quotaPercent, setQuotaPercent] = useState(null);
  const [examplePrompt, setExamplePrompt] = useState(() => getRandomPrompt());
  const [greeting] = useState(() => getGreeting(fullName || username));
  const [attachedFile, setAttachedFile] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [schedule, setSchedule] = useState([]);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Mobile detection — used to show a tap-to-close backdrop
  // behind the history sidebar / schedule panel when they're
  // rendered as full overlays instead of inline flex siblings.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const scheduleInputRef = useRef(null);
  const attachMenuRef = useRef(null);

  // Keep the active session in sync with whatever is on screen.
  // Creates a new session on the first message of a fresh chat,
  // and updates the existing one on every message after that.
  useEffect(() => {
    if (messages.length === 0) return;

    setChatSessions((prev) => {
      if (currentSessionId) {
        return prev.map((s) => {
          if (s.id !== currentSessionId) return s;
          if (s.messages === messages) return s; // just viewing, not a real change
          return { ...s, messages, title: deriveTitle(messages), updatedAt: Date.now() };
        });
      }
      const newId = generateSessionId();
      setCurrentSessionId(newId);
      return [
        { id: newId, title: deriveTitle(messages), messages, updatedAt: Date.now() },
        ...prev
      ];
    });
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem("astra_chat_sessions", JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    if (currentSessionId) sessionStorage.setItem("astra_current_session_id", currentSessionId);
    else sessionStorage.removeItem("astra_current_session_id");
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) inputRef.current?.focus();
  }, [isTyping]);

  // Close the attach menu when clicking outside of it
  useEffect(() => {
    if (!isAttachMenuOpen) return;
    function handleClickOutside(e) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setIsAttachMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAttachMenuOpen]);

  const fetchQuota = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quota`);
      const data = await response.json();
      setQuotaPercent(typeof data.percent === "number" ? data.percent : null);
    } catch (error) {
      console.error("Failed to fetch quota:", error);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setSchedule(data.schedule || []);
    } catch (error) {
      console.error("Failed to fetch schedule:", error);
    }
  }, [token]);

  const toggleSchedulePanel = () => {
    if (!isScheduleOpen) fetchSchedule();
    setIsScheduleOpen((prev) => !prev);
  };

  const toggleHistorySidebar = () => {
    setIsHistorySidebarOpen((prev) => !prev);
  };

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setAttachedFile(file);
    e.target.value = "";
  }

  function removeAttachedFile() {
    setAttachedFile(null);
  }

  function handleQuotaResponse(data) {
    if (data.error === "quota_exceeded") {
      setQuotaSeconds(data.retryAfterSeconds || 60);
      return true;
    }
    return false;
  }

  async function sendMessage() {
    if (!message.trim() && !attachedFile) return;

    const studentText = message || `(Sent a file: ${attachedFile.name})`;
    const fileToSend = attachedFile;

    setMessages((prev) => [...prev, new ChatMessage("student", studentText)]);
    setMessage("");
    setAttachedFile(null);
    setIsTyping(true);
    setIsOffline(false);

    try {
      let response;

      if (fileToSend) {
        const formData = new FormData();
        formData.append("file", fileToSend);
        formData.append("message", message || "What can you tell me about this file?");
        response = await fetch(`${API_BASE_URL}/api/chat/file`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: studentText })
        });
      }

      const data = await response.json();

      if (handleQuotaResponse(data)) return;
      if (!response.ok) throw new Error("Server error");

      setMessages((prev) => [...prev, new ChatMessage("astra", data.reply)]);

      if (data.scheduleCleared || (/schedule/i.test(studentText) && isScheduleOpen)) {
        fetchSchedule();
      }
    } catch (error) {
      console.error("Connection error:", error);
      setIsOffline(true);
      setMessages((prev) => [
        ...prev,
        new ChatMessage("astra", OFFLINE_CHAT_MESSAGE)
      ]);
    } finally {
      setIsTyping(false);
      fetchQuota();
    }
  }

  async function handleScheduleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMessages((prev) => [...prev, new ChatMessage("student", `(Uploaded schedule file: ${file.name})`)]);
    setIsTyping(true);
    setIsOffline(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/schedule/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (handleQuotaResponse(data)) return;
      if (!response.ok) throw new Error("Server error");

      const count = data.schedule?.length || 0;
      setMessages((prev) => [
        ...prev,
        new ChatMessage(
          "astra",
          count > 0
            ? `Got it! I saved ${count} class${count === 1 ? "" : "es"} from your schedule. Ask me "what's my schedule" anytime.`
            : "I couldn't find any schedule details in that file. Try uploading a clearer copy."
        )
      ]);

      if (isScheduleOpen) fetchSchedule();
    } catch (error) {
      console.error("Schedule upload error:", error);
      setIsOffline(true);
      setMessages((prev) => [
        ...prev,
        new ChatMessage("astra", OFFLINE_CHAT_MESSAGE)
      ]);
    } finally {
      setIsTyping(false);
      fetchQuota();
    }
  }

  function startNewChat() {
    setMessages([]);
    setCurrentSessionId(null);
    setIsOffline(false);
    setQuotaSeconds(null);
    setExamplePrompt(getRandomPrompt());
    inputRef.current?.focus();
  }

  function loadSession(session) {
    if (session.id === currentSessionId) return;
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setIsOffline(false);
    setQuotaSeconds(null);
    inputRef.current?.focus();
    if (isMobile) setIsHistorySidebarOpen(false);
  }

  function deleteSession(id) {
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === currentSessionId) {
      setMessages([]);
      setCurrentSessionId(null);
    }
    setConfirmDeleteId(null);
  }

  function clearAllHistory() {
    setChatSessions([]);
    setMessages([]);
    setCurrentSessionId(null);
    setConfirmClearAll(false);
  }

  const sortedSessions = [...chatSessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="chatbot-layout" style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>

      {/* Backdrop for the chat history sidebar on mobile — tap
          outside the panel to close it, same pattern as the main
          app sidebar in App.jsx. */}
      {isMobile && isHistorySidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsHistorySidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar: Recent Chats ────────────────────────── */}
      <div className={`chat-history-sidebar${isHistorySidebarOpen ? "" : " closed"}`}>
        <div className="chat-history-header">
          <h3>Recent Chats</h3>

          {chatSessions.length > 0 && (
            confirmClearAll ? (
              <div className="history-clear-confirm">
                <span>Clear all?</span>
                <button className="history-confirm-yes-text" onClick={clearAllHistory}>
                  Yes
                </button>
                <button className="history-confirm-no-text" onClick={() => setConfirmClearAll(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="history-clear-all-btn" onClick={() => setConfirmClearAll(true)}>
                Clear all
              </button>
            )
          )}
        </div>

        <div className="chat-history-list">
          {sortedSessions.length === 0 ? (
            <p className="chat-history-empty">No chat history yet.</p>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                className={`chat-history-item${session.id === currentSessionId ? " active" : ""}`}
                onClick={() => loadSession(session)}
              >
                <div className="chat-history-item-row">
                  <div className="chat-history-item-text">
                    <div className="chat-history-item-title">{session.title}</div>
                    <div className="chat-history-item-meta">{formatSessionMeta(session.updatedAt)}</div>
                  </div>

                  {confirmDeleteId === session.id ? (
                    <div className="history-item-confirm" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="history-confirm-yes"
                        onClick={() => deleteSession(session.id)}
                        title="Confirm delete"
                      >
                        <CheckIcon />
                      </button>
                      <button
                        className="history-confirm-no"
                        onClick={() => setConfirmDeleteId(null)}
                        title="Cancel"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="chat-history-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(session.id);
                      }}
                      title="Delete chat"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────────────── */}
      <div className="chatbox" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={toggleHistorySidebar}
              title="Toggle sidebar"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-h)",
                display: "flex",
                alignItems: "center",
                padding: "4px"
              }}
            >
              <SidebarToggleIcon />
            </button>
            <div>
              <h2>ASTRA Chatbot</h2>
              <p>Hello! I am ASTRA. How can I help you?</p>
            </div>
          </div>

          <div className="chat-header-actions">
            <QuotaMeter percent={quotaPercent} />

            <button
              className="schedule-toggle-btn"
              onClick={toggleSchedulePanel}
              title="Toggle schedule panel"
            >
              <CalendarToggleIcon />
            </button>

            {messages.length > 0 && (
              <button className="clear-chat-btn" onClick={startNewChat}>
                Clear chat
              </button>
            )}
          </div>
        </div>

        {isOffline && (
          <div className="offline-banner">
            <WarningIcon /> {OFFLINE_BANNER_MESSAGE}
          </div>
        )}

        {quotaSeconds && (
          <QuotaBanner
            seconds={quotaSeconds}
            onDone={() => setQuotaSeconds(null)}
          />
        )}

        <div className="chat-window">
          {messages.length === 0 && !isTyping && (
            <div className="chat-empty">
              <h3 className="chat-greeting">{greeting}</h3>
              <p>Ask ASTRA anything about ASIATECH — try "{examplePrompt}"</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={msg.sender === "student" ? "message-wrapper student-wrapper" : "message-wrapper astra-wrapper"}
            >
              <p className={msg.sender === "student" ? "student-message" : "astra-message"}>
                {msg.text}
              </p>
              <span className="message-time">{msg.getFormattedTime()}</span>
            </div>
          ))}

          {isTyping && <ThinkingIndicator />}

          <div ref={chatEndRef} />
        </div>

        {attachedFile && (
          <div className="attached-file-preview">
            <PaperclipIcon /> {attachedFile.name}
            <button onClick={removeAttachedFile} aria-label="Remove attached file">
              <CloseIcon />
            </button>
          </div>
        )}

        <div className="chat-input">
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileSelect} />
          <input type="file" ref={scheduleInputRef} style={{ display: "none" }} onChange={handleScheduleFileSelect} />

          <div className="attach-menu-wrapper" ref={attachMenuRef}>
            <button
              type="button"
              className="attach-btn"
              onClick={() => setIsAttachMenuOpen((prev) => !prev)}
              disabled={isTyping}
              title="Attach"
            >
              <PaperclipIcon />
            </button>

            {isAttachMenuOpen && (
              <div className="attach-menu">
                <button
                  type="button"
                  className="attach-menu-item"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <DocumentIcon />
                  Attach a file
                </button>
                <button
                  type="button"
                  className="attach-menu-item"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    scheduleInputRef.current?.click();
                  }}
                >
                  <CalendarToggleIcon />
                  Upload my schedule
                </button>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
            placeholder="Type a message..."
            disabled={isTyping}
          />

          <button onClick={sendMessage} disabled={isTyping}>
            Send
          </button>
        </div>

        <p className="chat-disclaimer">ASTRA can make mistakes. Verify important academic information.</p>
      </div>

      {/* Backdrop for the schedule panel on mobile */}
      {isMobile && isScheduleOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsScheduleOpen(false)}
        />
      )}

      {isScheduleOpen && (
        <ScheduleGrid
          schedule={schedule}
          onClose={() => setIsScheduleOpen(false)}
          token={token}
          onScheduleChange={fetchSchedule}
        />
      )}
    </div>
  );
}

export default Chatbot;