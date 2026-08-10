import logo from "../assets/astra-logo.svg";

function Header({ isSidebarOpen, onToggleSidebar, isDarkMode, onToggleDarkMode, onLogout }) {
  return (
    <header className="topbar">
      <button
        className="hamburger-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="topbar-brand">
        <img src={logo} alt="ASTRA logo" className="topbar-logo" />
        <h1>ASTRA</h1>
      </div>

      <div className="header-actions">
        <button
          className={`theme-switch ${isDarkMode ? "dark" : ""}`}
          onClick={onToggleDarkMode}
          role="switch"
          aria-checked={isDarkMode}
          aria-label="Toggle dark mode"
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-switch-track">
            <span className="theme-switch-thumb">
              <span className="theme-switch-sun">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"></circle>
                  <line x1="12" y1="2" x2="12" y2="4"></line>
                  <line x1="12" y1="20" x2="12" y2="22"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="2" y1="12" x2="4" y2="12"></line>
                  <line x1="20" y1="12" x2="22" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </span>
              <span className="theme-switch-moon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              </span>
            </span>
          </span>
        </button>

        <button
          className="logout-btn"
          onClick={onLogout}
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;