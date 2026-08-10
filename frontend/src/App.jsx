import { useState, useEffect } from "react";
import Header from "./components/header";
import Sidebar from "./components/Sidebar";
import Chatbot from "./components/Chatbot";
import KnowledgeBase from "./components/KnowledgeBase";
import AdminKnowledgeBase from "./components/AdminKnowledgeBase";
import Login from "./components/Login";
import "./App.css";

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (err) {
    console.error("Failed to decode token:", err);
    return null;
  }
}

function App() {
  const [token, setToken] = useState(() => {
    return localStorage.getItem("astra_token");
  });
  const [activeView, setActiveView] = useState("Chatbot");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("astra_dark_mode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("astra_dark_mode", isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const handleLogin = (receivedToken) => {
    setToken(receivedToken);
    localStorage.setItem("astra_token", receivedToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("astra_token");
    setActiveView("Chatbot");
  };

  if (!token) {
    return (
      <div className="app">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  const decoded = decodeToken(token);
  const role = decoded?.role;
  const username = decoded?.username;
  const isAdmin = role === "admin";

  return (
    <div className="app">
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLogout={handleLogout}
      />

      <div className="layout">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isOpen={isSidebarOpen}
          isAdmin={isAdmin}
        />

        <main>
          <div key={activeView} className="view-fade">
            {activeView === "Dashboard" && <p>Dashboard coming soon.</p>}
            {activeView === "Chatbot" && <Chatbot username={username} token={token} />}
            {activeView === "Knowledge Base" && <KnowledgeBase />}
            {activeView === "Manage Knowledge Base" && isAdmin && <AdminKnowledgeBase />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;