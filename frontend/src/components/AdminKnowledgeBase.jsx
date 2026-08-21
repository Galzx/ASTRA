import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import "./AdminKnowledgeBase.css";

function AdminKnowledgeBase() {

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "", title: "", keywords: "", content: "" });
  const [editingId, setEditingId] = useState(null);

  const loadEntries = () => {

    fetch(`${API_BASE_URL}/api/knowledge`)
      .then((response) => response.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load knowledge base:", error);
        setLoading(false);
      });

  };

  useEffect(() => {
    loadEntries();
  }, []);

  const resetForm = () => {
    setForm({ category: "", title: "", keywords: "", content: "" });
    setEditingId(null);
  };

  const handleSubmit = (e) => {

    e.preventDefault();

    const url = editingId
      ? `${API_BASE_URL}/api/knowledge/${editingId}`
      : `${API_BASE_URL}/api/knowledge`;

    const method = editingId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((response) => response.json())
      .then(() => {
        resetForm();
        loadEntries();
      })
      .catch((error) => {
        console.error("Failed to save entry:", error);
      });

  };

  const handleEdit = (entry) => {

    setForm({
      category: entry.category,
      title: entry.title,
      keywords: Array.isArray(entry.keywords) ? entry.keywords.join(",") : entry.keywords,
      content: entry.content,
    });

    setEditingId(entry.id);

  };

  const handleDelete = (id) => {

    fetch(`${API_BASE_URL}/api/knowledge/${id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then(() => {
        loadEntries();
      })
      .catch((error) => {
        console.error("Failed to delete entry:", error);
      });

  };

  return (
    <section className="admin-knowledge-base">
      <div className="akb-header">
        <h2>Manage Knowledge Base</h2>
        <span className="akb-count">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
      </div>

      <form className="akb-form" onSubmit={handleSubmit}>

        <div className="akb-form-row">
          <div className="akb-field">
            <label htmlFor="kb-category">Category</label>
            <input
              id="kb-category"
              type="text"
              placeholder="e.g. Enrollment"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>

          <div className="akb-field">
            <label htmlFor="kb-title">Title</label>
            <input
              id="kb-title"
              type="text"
              placeholder="e.g. Dropping a Subject"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
        </div>

        <div className="akb-field">
          <label htmlFor="kb-keywords">Keywords</label>
          <input
            id="kb-keywords"
            type="text"
            placeholder="comma, separated, keywords"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          />
        </div>

        <div className="akb-field">
          <label htmlFor="kb-content">Content</label>
          <textarea
            id="kb-content"
            placeholder="Answer text shown to students"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>

        <div className="akb-form-actions">
          <button type="submit" className="akb-btn-primary">
            {editingId ? "Update Entry" : "Add Entry"}
          </button>
          {editingId && (
            <button type="button" className="akb-btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

      </form>

      {loading && (
        <div className="akb-state">
          <span className="akb-spinner"></span>
          Loading knowledge base...
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="akb-state akb-state-empty">
          No entries yet — add your first one above.
        </div>
      )}

      <div className="akb-list">
        {entries.map((entry) => (
          <div key={entry.id} className="akb-entry">
            <div className="akb-entry-top">
              <span className="akb-category">{entry.category}</span>
              <div className="akb-entry-actions">
                <button className="akb-icon-btn" onClick={() => handleEdit(entry)} aria-label="Edit entry">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button className="akb-icon-btn akb-icon-btn-danger" onClick={() => handleDelete(entry.id)} aria-label="Delete entry">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

export default AdminKnowledgeBase;