import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

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
      <h2>Manage Knowledge Base</h2>

      <form className="kb-admin-form" onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />

        <input
          type="text"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <input
          type="text"
          placeholder="Keywords (comma-separated)"
          value={form.keywords}
          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
        />

        <textarea
          placeholder="Content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />

        <div className="kb-admin-form-actions">
          <button type="submit">{editingId ? "Update Entry" : "Add Entry"}</button>
          {editingId && (
            <button type="button" onClick={resetForm}>Cancel</button>
          )}
        </div>

      </form>

      {loading && (
        <div className="kb-state">
          <span className="spinner"></span>
          Loading knowledge base...
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="kb-state">
          No entries yet.
        </div>
      )}

      <div className="kb-list">
        {entries.map((entry) => (
          <div key={entry.id} className="kb-entry">
            <span className="kb-category">{entry.category}</span>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
            <div className="kb-entry-actions">
              <button onClick={() => handleEdit(entry)}>Edit</button>
              <button onClick={() => handleDelete(entry.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}

export default AdminKnowledgeBase;