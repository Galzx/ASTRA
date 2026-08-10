function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ChatbotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function KnowledgeBaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function AdminKnowledgeBaseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function Sidebar({ activeView, setActiveView, isOpen, isAdmin }) {
  const items = [
    { label: "Dashboard", icon: <DashboardIcon /> },
    { label: "Chatbot", icon: <ChatbotIcon /> },
    { label: "Knowledge Base", icon: <KnowledgeBaseIcon /> },
  ];

  if (isAdmin) {
    items.push({ label: "Manage Knowledge Base", icon: <AdminKnowledgeBaseIcon /> });
  }

  return (
    <aside className={"sidebar" + (isOpen ? "" : " collapsed")}>
      {isOpen && <h2>Menu</h2>}

      <ul>
        {items.map((item) => (
          <li
            key={item.label}
            className={item.label === activeView ? "active" : ""}
            onClick={() => setActiveView(item.label)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {isOpen && <span className="sidebar-label">{item.label}</span>}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;