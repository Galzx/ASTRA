import { useMemo, useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

const GRID_START_MIN = 6 * 60;
const GRID_END_MIN = 22 * 60;
const GRID_TOTAL_MIN = GRID_END_MIN - GRID_START_MIN;
const HOUR_HEIGHT = 56;
const GRID_HEIGHT = (GRID_TOTAL_MIN / 60) * HOUR_HEIGHT;

const PRESET_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6"
];

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}

function CloseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function timeToMinutes(label) {
  const match = label.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let [, h, m, period] = match;
  h = parseInt(h, 10); m = parseInt(m, 10); period = period.toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function parseRange(timeStr) {
  if (!timeStr || !timeStr.includes(" - ")) return null;
  const [startStr, endStr] = timeStr.split(" - ");
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  if (start == null || end == null) return null;
  return { start, end };
}

function formatHourLabel(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const period = h >= 12 ? "PM" : "AM";
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  return `${displayH} ${period}`;
}

function loadColors() {
  try {
    return JSON.parse(localStorage.getItem("astra_schedule_colors") || "{}");
  } catch { return {}; }
}

function saveColors(colors) {
  localStorage.setItem("astra_schedule_colors", JSON.stringify(colors));
}

// ── Edit Modal ─────────────────────────────────────────────

function EditModal({ entry, color, onSave, onDelete, onClose }) {
  const [subject, setSubject] = useState(entry.subject || "");
  const [day, setDay] = useState(entry.day || "Monday");
  const [time, setTime] = useState(entry.time || "");
  const [room, setRoom] = useState(entry.room || "");
  const [selectedColor, setSelectedColor] = useState(color || PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    if (!subject.trim() || !time.trim()) return;
    setSaving(true);
    await onSave({ subject: subject.trim(), day, time: time.trim(), room: room.trim() }, selectedColor);
    setSaving(false);
  }

  return (
    <div className="sched-modal-overlay" onClick={onClose}>
      <div className="sched-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sched-modal-header">
          <span className="sched-modal-title">Edit Class</span>
          <button className="sched-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="sched-modal-body">
          <label className="sched-field-label">Subject</label>
          <input
            className="sched-field-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Data Structures"
          />

          <label className="sched-field-label">Day</label>
          <select className="sched-field-input" value={day} onChange={(e) => setDay(e.target.value)}>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <label className="sched-field-label">Time (e.g. 8:00 AM - 9:30 AM)</label>
          <input
            className="sched-field-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="8:00 AM - 9:30 AM"
          />

          <label className="sched-field-label">Room</label>
          <input
            className="sched-field-input"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Room 301"
          />

          <label className="sched-field-label">Highlight Color</label>
          <div className="sched-color-row">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                className={"sched-color-swatch" + (selectedColor === c ? " selected" : "")}
                style={{ background: c }}
                onClick={() => setSelectedColor(c)}
                title={c}
              />
            ))}
            <input
              type="color"
              className="sched-color-custom"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              title="Custom color"
            />
          </div>
        </div>

        <div className="sched-modal-footer">
          {confirmDelete ? (
            <>
              <span className="sched-delete-confirm-text">Delete this class?</span>
              <button className="sched-btn sched-btn-danger" onClick={onDelete}>Yes, delete</button>
              <button className="sched-btn sched-btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="sched-btn sched-btn-ghost sched-btn-icon" onClick={() => setConfirmDelete(true)} title="Delete class">
                <TrashIcon />
              </button>
              <button className="sched-btn sched-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="sched-btn sched-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

function ScheduleGrid({ schedule, onClose, onScheduleChange, token }) {
  const [colors, setColors] = useState(loadColors);
  const [editingEntry, setEditingEntry] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    saveColors(colors);
  }, [colors]);

  const hourMarks = useMemo(() => {
    const marks = [];
    for (let t = GRID_START_MIN; t <= GRID_END_MIN; t += 60) marks.push(t);
    return marks;
  }, []);

  const entriesByDay = useMemo(() => {
    const map = {};
    DAYS.forEach((day) => { map[day] = []; });
    schedule.forEach((entry) => {
      if (!entry.day || !entry.time) return;
      const dayKey = DAYS.find((d) => d.toLowerCase() === entry.day.toLowerCase());
      if (!dayKey) return;
      const range = parseRange(entry.time);
      if (!range) return;
      map[dayKey].push({ ...entry, ...range });
    });
    return map;
  }, [schedule]);

  const hasAnySchedule = schedule.some((entry) => entry.day && entry.time);

  async function handleSaveEntry(entryId, fields, color) {
    try {
      await fetch(`${API_BASE_URL}/api/schedule/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(fields)
      });
      setColors((prev) => ({ ...prev, [entryId]: color }));
      setEditingEntry(null);
      onScheduleChange?.();
    } catch (err) {
      console.error("Failed to save entry:", err);
    }
  }

  async function handleDeleteEntry(entryId) {
    try {
      await fetch(`${API_BASE_URL}/api/schedule/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const newColors = { ...colors };
      delete newColors[entryId];
      setColors(newColors);
      setEditingEntry(null);
      onScheduleChange?.();
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await fetch(`${API_BASE_URL}/api/schedule/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setColors({});
      setConfirmClear(false);
      onScheduleChange?.();
    } catch (err) {
      console.error("Failed to clear schedule:", err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <aside className="schedule-panel">
      <div className="schedule-panel-header">
        <span className="schedule-panel-title">
          <CalendarIcon /> My Schedule
        </span>
        <div className="schedule-panel-header-actions">
          {hasAnySchedule && !confirmClear && (
            <button className="sched-clear-btn" onClick={() => setConfirmClear(true)} title="Clear all">
              <TrashIcon /> Clear
            </button>
          )}
          {confirmClear && (
            <>
              <span className="sched-clear-confirm-text">Clear all?</span>
              <button className="sched-btn sched-btn-danger sched-btn-sm" onClick={handleClearAll} disabled={clearing}>
                {clearing ? "Clearing…" : "Yes"}
              </button>
              <button className="sched-btn sched-btn-ghost sched-btn-sm" onClick={() => setConfirmClear(false)}>
                No
              </button>
            </>
          )}
          <button className="schedule-panel-close" onClick={onClose} title="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      {!hasAnySchedule ? (
        <div className="schedule-panel-empty">
          No schedule uploaded yet. Use "Upload my schedule" in the chat.
        </div>
      ) : (
        <div className="schedule-matrix">
          <div className="schedule-matrix-corner" />
          {DAYS.map((day) => (
            <div key={day} className="schedule-matrix-daylabel">{DAY_ABBR[day]}</div>
          ))}

          <div className="schedule-matrix-timecol" style={{ height: GRID_HEIGHT }}>
            {hourMarks.map((mark) => (
              <div
                key={mark}
                className="schedule-matrix-hourlabel"
                style={{ top: ((mark - GRID_START_MIN) / 60) * HOUR_HEIGHT }}
              >
                {formatHourLabel(mark)}
              </div>
            ))}
          </div>

          {DAYS.map((day) => (
            <div key={day} className="schedule-matrix-daycol" style={{ height: GRID_HEIGHT }}>
              {entriesByDay[day].map((entry) => {
                const top = ((entry.start - GRID_START_MIN) / 60) * HOUR_HEIGHT;
                const height = ((entry.end - entry.start) / 60) * HOUR_HEIGHT;
                const color = colors[entry.id] || PRESET_COLORS[0];
                return (
                  <div
                    key={entry.id}
                    className="schedule-matrix-block"
                    style={{
                      top,
                      height: Math.max(height, 20),
                      background: color + "26",
                      borderColor: color,
                      borderLeftColor: color,
                      cursor: "pointer"
                    }}
                    title={`${entry.subject}${entry.room ? " — " + entry.room : ""} — click to edit`}
                    onClick={() => setEditingEntry(entry)}
                  >
                    <span className="schedule-matrix-block-subject" style={{ color }}>{entry.subject}</span>
                    <span className="schedule-matrix-block-time">{entry.time}</span>
                    {entry.room && <span className="schedule-matrix-block-room">{entry.room}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          color={colors[editingEntry.id] || PRESET_COLORS[0]}
          onSave={(fields, color) => handleSaveEntry(editingEntry.id, fields, color)}
          onDelete={() => handleDeleteEntry(editingEntry.id)}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </aside>
  );
}

export default ScheduleGrid;