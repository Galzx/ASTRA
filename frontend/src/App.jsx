import { useState, useEffect } from "react";
import Header from "./components/header";
import Sidebar from "./components/Sidebar";
import Chatbot from "./components/Chatbot";
import KnowledgeBase from "./components/KnowledgeBase";
import AdminKnowledgeBase from "./components/AdminKnowledgeBase";
import Login from "./components/Login";
import "./App.css";

const MOBILE_BREAKPOINT = 768;

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

  // Sidebar starts open on desktop, closed on mobile/narrow screens
  // (a translucent overlay sidebar left open on a small screen
  // visually merges with the content behind it).
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > MOBILE_BREAKPOINT;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

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

  // Track viewport width so we know when we're in "mobile" mode
  // (for the tap-to-close backdrop) and so resizing the window
  // (or rotating a device) re-evaluates sidebar default state.
  useEffect(() => {
    function handleResize() {
      const nowMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(nowMobile);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      <div className="app-bg" />

      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLogout={handleLogout}
      />

      <div className="layout">
        {/* Dark backdrop behind the sidebar on mobile, so an open
            overlay sidebar reads as a distinct layer instead of
            blending into the page behind it. Tapping it closes
            the sidebar. */}
        {isMobile && isSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            setActiveView(view);
            if (isMobile) setIsSidebarOpen(false);
          }}
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