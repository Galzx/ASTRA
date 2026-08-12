import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

function KnowledgeBase() {

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("title");

  useEffect(() => {

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

  }, []);

  const categories = ["All", ...new Set(entries.map((entry) => entry.category))];

  const filteredEntries = entries.filter((entry) => {

    const matchesCategory =
      categoryFilter === "All" || entry.category === categoryFilter;

    const search = searchTerm.toLowerCase();
    const matchesSearch =
      entry.title.toLowerCase().includes(search) ||
      entry.content.toLowerCase().includes(search);

    return matchesCategory && matchesSearch;

  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else {
      return a.category.localeCompare(b.category);
    }
  });

  return (
    <section className="knowledge-base">
      <h2>Knowledge Base</h2>

      <div className="kb-controls">

        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="title">Sort: Title (A-Z)</option>
          <option value="category">Sort: Category</option>
        </select>

      </div>

      {loading && (
        <div className="kb-state">
          <span className="spinner"></span>
          Loading knowledge base...
        </div>
      )}

      {!loading && sortedEntries.length === 0 && (
        <div className="kb-state">
          No entries match your search.
        </div>
      )}

      <div className="kb-list">
        {sortedEntries.map((entry) => (
          <div key={entry.id} className="kb-entry">
            <span className="kb-category">{entry.category}</span>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
          </div>
        ))}
      </div>

    </section>
  );
}

export default KnowledgeBase;