// frontend/src/components/ScheduleGrid.jsx
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

function SlidersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
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

// ── Edit Modal (single entry, opened from a grid block or the list) ──

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

// ── Customize Modal (list / add / bulk move) ──────────────────

function CustomizeModal({ schedule, colors, onEditRequest, onDeleteRequest, onAdd, onBulkMove, onClose }) {
  const [tab, setTab] = useState("list");

  // Add tab state
  const [addSubject, setAddSubject] = useState("");
  const [addDay, setAddDay] = useState("Monday");
  const [addTime, setAddTime] = useState("");
  const [addRoom, setAddRoom] = useState("");
  const [addColor, setAddColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");

  // Bulk move tab state
  const [fromDay, setFromDay] = useState("Monday");
  const [toDay, setToDay] = useState("Tuesday");
  const [bulkTime, setBulkTime] = useState("");
  const [moving, setMoving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  // List tab state
  const [rowDeleteConfirm, setRowDeleteConfirm] = useState(null);

  const groupedEntries = useMemo(() => {
    const map = {};
    DAYS.forEach((d) => { map[d] = []; });
    schedule.forEach((entry) => {
      const dayKey = DAYS.find((d) => entry.day && d.toLowerCase() === entry.day.toLowerCase());
      if (dayKey) map[dayKey].push(entry);
    });
    return map;
  }, [schedule]);

  async function handleAddSubmit() {
    if (!addSubject.trim() || !addTime.trim()) return;
    setAdding(true);
    setAddMessage("");
    const ok = await onAdd(
      { subject: addSubject.trim(), day: addDay, time: addTime.trim(), room: addRoom.trim() },
      addColor
    );
    setAdding(false);
    if (ok) {
      setAddMessage(`Added ${addSubject.trim()} on ${addDay}.`);
      setAddSubject(""); setAddTime(""); setAddRoom("");
    } else {
      setAddMessage("Couldn't add that class — try again.");
    }
  }

  async function handleBulkSubmit() {
    setMoving(true);
    setBulkMessage("");
    const result = await onBulkMove(fromDay, toDay, bulkTime.trim() || null);
    setMoving(false);
    setBulkMessage(result?.message || "Couldn't move those classes — try again.");
  }

  return (
    <div className="sched-modal-overlay" onClick={onClose}>
      <div className="sched-modal sched-customize-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sched-modal-header">
          <span className="sched-modal-title"><SlidersIcon /> Customize Schedule</span>
          <button className="sched-modal-close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="sched-customize-tabs">
          <button className={"sched-tab" + (tab === "list" ? " active" : "")} onClick={() => setTab("list")}>All Classes</button>
          <button className={"sched-tab" + (tab === "add" ? " active" : "")} onClick={() => setTab("add")}>Add Class</button>
          <button className={"sched-tab" + (tab === "bulk" ? " active" : "")} onClick={() => setTab("bulk")}>Bulk Move</button>
        </div>

        <div className="sched-modal-body sched-customize-body">
          {tab === "list" && (
            <div className="sched-customize-list">
              {DAYS.map((day) => (
                groupedEntries[day].length === 0 ? null : (
                  <div key={day} className="sched-list-daygroup">
                    <div className="sched-list-daylabel">{day}</div>
                    {groupedEntries[day].map((entry) => (
                      <div key={entry.id} className="sched-list-row">
                        <span
                          className="sched-list-dot"
                          style={{ background: colors[entry.id] || PRESET_COLORS[0] }}
                        />
                        <div className="sched-list-info">
                          <span className="sched-list-subject">{entry.subject}</span>
                          <span className="sched-list-meta">{entry.time}{entry.room ? ` · ${entry.room}` : ""}</span>
                        </div>
                        {rowDeleteConfirm === entry.id ? (
                          <div className="sched-list-actions">
                            <button className="sched-btn sched-btn-danger sched-btn-sm" onClick={() => { onDeleteRequest(entry.id); setRowDeleteConfirm(null); }}>Yes</button>
                            <button className="sched-btn sched-btn-ghost sched-btn-sm" onClick={() => setRowDeleteConfirm(null)}>No</button>
                          </div>
                        ) : (
                          <div className="sched-list-actions">
                            <button className="sched-btn sched-btn-ghost sched-btn-icon" onClick={() => onEditRequest(entry)} title="Edit">
                              <EditIcon />
                            </button>
                            <button className="sched-btn sched-btn-ghost sched-btn-icon" onClick={() => setRowDeleteConfirm(entry.id)} title="Delete">
                              <TrashIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ))}
              {schedule.length === 0 && (
                <div className="sched-customize-empty">No classes yet — add one from the Add Class tab.</div>
              )}
            </div>
          )}

          {tab === "add" && (
            <div className="sched-customize-add">
              <label className="sched-field-label">Subject</label>
              <input
                className="sched-field-input"
                value={addSubject}
                onChange={(e) => setAddSubject(e.target.value)}
                placeholder="e.g. Data Structures"
              />

              <label className="sched-field-label">Day</label>
              <select className="sched-field-input" value={addDay} onChange={(e) => setAddDay(e.target.value)}>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <label className="sched-field-label">Time (e.g. 8:00 AM - 9:30 AM)</label>
              <input
                className="sched-field-input"
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                placeholder="8:00 AM - 9:30 AM"
              />

              <label className="sched-field-label">Room</label>
              <input
                className="sched-field-input"
                value={addRoom}
                onChange={(e) => setAddRoom(e.target.value)}
                placeholder="e.g. Room 301"
              />

              <label className="sched-field-label">Highlight Color</label>
              <div className="sched-color-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={"sched-color-swatch" + (addColor === c ? " selected" : "")}
                    style={{ background: c }}
                    onClick={() => setAddColor(c)}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  className="sched-color-custom"
                  value={addColor}
                  onChange={(e) => setAddColor(e.target.value)}
                  title="Custom color"
                />
              </div>

              {addMessage && <div className="sched-customize-message">{addMessage}</div>}

              <button className="sched-btn sched-btn-primary sched-btn-full" onClick={handleAddSubmit} disabled={adding}>
                <PlusIcon /> {adding ? "Adding…" : "Add Class"}
              </button>
            </div>
          )}

          {tab === "bulk" && (
            <div className="sched-customize-bulk">
              <label className="sched-field-label">Move all classes from</label>
              <div className="sched-bulk-dayrow">
                <select className="sched-field-input" value={fromDay} onChange={(e) => setFromDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ArrowRightIcon />
                <select className="sched-field-input" value={toDay} onChange={(e) => setToDay(e.target.value)}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <label className="sched-field-label">New start time (optional — leave blank to keep existing times)</label>
              <input
                className="sched-field-input"
                value={bulkTime}
                onChange={(e) => setBulkTime(e.target.value)}
                placeholder="e.g. 9:00 AM"
              />

              {bulkMessage && <div className="sched-customize-message">{bulkMessage}</div>}

              <button className="sched-btn sched-btn-primary sched-btn-full" onClick={handleBulkSubmit} disabled={moving || fromDay === toDay}>
                {moving ? "Moving…" : `Move ${fromDay} classes to ${toDay}`}
              </button>
              {fromDay === toDay && <div className="sched-customize-hint">Pick two different days.</div>}
            </div>
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
  const [customizeOpen, setCustomizeOpen] = useState(false);

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

  async function handleAddEntry(fields, color) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(fields)
      });
      if (!res.ok) return false;
      const entry = await res.json();
      if (entry?.id) setColors((prev) => ({ ...prev, [entry.id]: color }));
      onScheduleChange?.();
      return true;
    } catch (err) {
      console.error("Failed to add entry:", err);
      return false;
    }
  }

  async function handleBulkMove(fromDay, toDay, newTime) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/schedule/bulk-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fromDay, toDay, newTime })
      });
      const data = await res.json();
      onScheduleChange?.();
      return data;
    } catch (err) {
      console.error("Failed bulk move:", err);
      return null;
    }
  }

  return (
    <aside className="schedule-panel">
      <div className="schedule-panel-header">
        <span className="schedule-panel-title">
          <CalendarIcon /> My Schedule
        </span>
        <div className="schedule-panel-header-actions">
          <button className="sched-customize-btn" onClick={() => setCustomizeOpen(true)} title="Customize schedule">
            <SlidersIcon /> Customize
          </button>
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
          No schedule uploaded yet. Use "Upload my schedule" in the chat, or add classes via Customize.
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

      {customizeOpen && (
        <CustomizeModal
          schedule={schedule}
          colors={colors}
          onEditRequest={(entry) => setEditingEntry(entry)}
          onDeleteRequest={(id) => handleDeleteEntry(id)}
          onAdd={handleAddEntry}
          onBulkMove={handleBulkMove}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </aside>
  );
}

export default ScheduleGrid;