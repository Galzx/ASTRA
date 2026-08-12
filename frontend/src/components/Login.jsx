import { useState, useRef, useLayoutEffect, useEffect } from "react";
import logo from "../assets/astra-logo.svg";
import { API_BASE_URL } from "../config";
import "./Login.css";

// Student numbers look like 1-250614f: a leading "1-", six digits, then a
// single letter. Case-insensitive so 1-250614F and 1-250614f both pass.
const STUDENT_NUMBER_PATTERN = /^1-\d{6}[a-zA-Z]$/;

function getStudentNumberStatus(value) {
  if (!value) return { touched: false, valid: false, message: "" };
  if (STUDENT_NUMBER_PATTERN.test(value)) {
    return { touched: true, valid: true, message: "Looks good" };
  }
  return {
    touched: true,
    valid: false,
    message: "Format: 1-XXXXXXf (1-, six digits, one letter)",
  };
}

// Password strength: checks length, case mix, digits, symbols.
// Score 0-4 drives the label/color; signup blocks below "Fair".
function getPasswordStrength(value) {
  if (!value) return { score: 0, label: "", percent: 0 };

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const longEnough = value.length >= 8;

  let score = 0;
  if (longEnough) score++;
  if (hasLower && hasUpper) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const label = longEnough ? labels[score] : "Too short";

  return { score: longEnough ? score : 0, label, percent: (score / 4) * 100 };
}

// Fixed full-viewport canvas: a slow drifting particle network behind the
// login card. Colors switch light/dark by watching for the app's existing
// "dark-mode" class, so no separate prop wiring is needed from App.jsx.
function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame;
    let isDark =
      document.documentElement.classList.contains("dark-mode") ||
      document.body.classList.contains("dark-mode");

    const colors = () =>
      isDark
        ? { dot: "165, 180, 255", line: "129, 140, 248" }
        : { dot: "79, 70, 229", line: "99, 102, 241" };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rebuild particles so density scales with viewport size.
      const count = Math.min(90, Math.max(30, Math.floor((width * height) / 16000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.6,
      }));
    };

    const drawFrame = () => {
      const { dot, line } = colors();
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(${line}, ${(1 - dist / 130) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = `rgba(${dot}, 0.75)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrame = requestAnimationFrame(drawFrame);
      }
    };

    resize();
    drawFrame();

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    const observer = new MutationObserver(() => {
      isDark =
        document.documentElement.classList.contains("dark-mode") ||
        document.body.classList.contains("dark-mode");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="login-starfield" aria-hidden="true" />;
}

// Small check/x icon used in the live student-number feedback line.
function StatusIcon({ valid }) {
  return valid ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cardHeight, setCardHeight] = useState(null);

  const loginSlotRef = useRef(null);
  const signupSlotRef = useRef(null);

  const studentNumberStatus = getStudentNumberStatus(username);
  const passwordStrength = getPasswordStrength(password);

  useLayoutEffect(() => {
    const loginEl = loginSlotRef.current;
    const signupEl = signupSlotRef.current;
    if (!loginEl || !signupEl) return;

    const prevLoginHeight = loginEl.style.height;
    const prevSignupHeight = signupEl.style.height;
    loginEl.style.height = "auto";
    signupEl.style.height = "auto";
    const loginH = loginEl.scrollHeight;
    const signupH = signupEl.scrollHeight;
    loginEl.style.height = prevLoginHeight;
    signupEl.style.height = prevSignupHeight;

    const target = Math.max(loginH, signupH);

    const frame = requestAnimationFrame(() => {
      setCardHeight(target);
    });

    return () => cancelAnimationFrame(frame);
  }, [role, error, isSignup, username, password]);

  const switchTo = (signup) => {
    setIsSignup(signup);
    setError("");
    setAdminKey("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isSignup) {
      if (!studentNumberStatus.valid) {
        setError("Student number must look like 1-xxxxxxf");
        return;
      }
      if (passwordStrength.score < 2) {
        setError("Password is too weak. Add a number, symbol, or uppercase letter.");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const body = isSignup
        ? { username, password, full_name: fullName, role, admin_key: role === "admin" ? adminKey : undefined }
        : { username, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Authentication failed");
        setLoading(false);
        return;
      }

      onLogin(data.token);
    } catch (err) {
      setError("Error connecting to server. Make sure the backend is running.");
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }) =>
    open ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
        <path d="M6.6 6.6C4.5 8 3 10 2 12c1.7 3.6 5.5 7 10 7 1.6 0 3.1-.4 4.4-1.1M9.9 4.2A10.9 10.9 0 0112 4c4.5 0 8.3 3.4 10 7-.5 1.1-1.2 2.2-2.1 3.2" />
      </svg>
    ) : (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.7-3.6 5.5-7 10-7s8.3 3.4 10 7c-1.7 3.6-5.5 7-10 7s-8.3-3.4-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  const strengthClass = passwordStrength.score <= 1
    ? "weak"
    : passwordStrength.score <= 2
    ? "fair"
    : passwordStrength.score <= 3
    ? "good"
    : "strong";

  return (
    <div className="login-container">
      <div className="login-page-bg" aria-hidden="true" />
      <StarField />

      <div
        className="login-split-card"
        style={cardHeight ? { height: `${cardHeight}px` } : undefined}
      >
        {/* LOGIN SLOT — fixed on the left. Never moves. */}
        <div
          ref={loginSlotRef}
          className={`slot slot-left ${isSignup ? "slot-covered" : ""}`}
          {...(isSignup ? { inert: "" } : {})}
        >
          <div className="panel-form-inner">
            <div className="login-brand">
              <img src={logo} alt="ASTRA logo" className="login-brand-logo" />
              <span className="login-brand-name">ASTRA</span>
            </div>

            <h1 className="panel-heading">Welcome back</h1>
            <p className="panel-subtext">Sign in to continue to your dashboard.</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username-login">Student Number</label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
                  </svg>
                  <input
                    id="username-login"
                    type="text"
                    placeholder="1-xxxxxxf"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    tabIndex={isSignup ? -1 : 0}
                    required
                  />
                </div>
                {!isSignup && studentNumberStatus.touched && (
                  <p className={`field-feedback ${studentNumberStatus.valid ? "valid" : "invalid"}`}>
                    <StatusIcon valid={studentNumberStatus.valid} />
                    {studentNumberStatus.message}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password-login">Password</label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="15" r="4" />
                    <path d="M10.5 12.5L20 3M16 5l2.5 2.5M13 8l2 2" />
                  </svg>
                  <input
                    id="password-login"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    tabIndex={isSignup ? -1 : 0}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={isSignup ? -1 : 0}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {!isSignup && error && (
                <div className="error-message">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="13" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading} tabIndex={isSignup ? -1 : 0}>
                {loading && !isSignup ? "Loading..." : "Log in →"}
              </button>
            </form>
          </div>
        </div>

        {/* SIGNUP SLOT — fixed on the right. Never moves. */}
        <div
          ref={signupSlotRef}
          className={`slot slot-right ${!isSignup ? "slot-covered" : ""}`}
          {...(!isSignup ? { inert: "" } : {})}
        >
          <div className="panel-form-inner">
            <h1 className="panel-heading">Create your account</h1>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username-signup">Student Number</label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
                  </svg>
                  <input
                    id="username-signup"
                    type="text"
                    placeholder="1-xxxxxxf"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    tabIndex={!isSignup ? -1 : 0}
                    required
                  />
                </div>
                {isSignup && studentNumberStatus.touched && (
                  <p className={`field-feedback ${studentNumberStatus.valid ? "valid" : "invalid"}`}>
                    <StatusIcon valid={studentNumberStatus.valid} />
                    {studentNumberStatus.message}
                  </p>
                )}
                {isSignup && !studentNumberStatus.touched && (
                  <p className="field-hint">Format: 1-XXXXXXf, e.g. 1-xxxxxxf</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full name</label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
                  </svg>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Ada Lovelace"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    tabIndex={!isSignup ? -1 : 0}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password-signup">Password</label>
                <div className="input-icon-wrap">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="15" r="4" />
                    <path d="M10.5 12.5L20 3M16 5l2.5 2.5M13 8l2 2" />
                  </svg>
                  <input
                    id="password-signup"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    tabIndex={!isSignup ? -1 : 0}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={!isSignup ? -1 : 0}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {isSignup && password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className={`strength-bar-fill strength-${strengthClass}`}
                        style={{ width: `${Math.max(passwordStrength.percent, 8)}%` }}
                      />
                    </div>
                    <span className={`strength-label strength-${strengthClass}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
                {isSignup && !password && (
                  <p className="field-hint">Use 8+ characters with a number or symbol.</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="role-select">
                  <button
                    type="button"
                    className={`role-option ${role === "student" ? "active" : ""}`}
                    onClick={() => setRole("student")}
                    tabIndex={!isSignup ? -1 : 0}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10L12 5 2 10l10 5 10-5z" />
                      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
                    </svg>
                    Student
                  </button>
                  <button
                    type="button"
                    className={`role-option ${role === "admin" ? "active" : ""}`}
                    onClick={() => setRole("admin")}
                    tabIndex={!isSignup ? -1 : 0}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
                    </svg>
                    Admin
                  </button>
                </div>
              </div>

              {role === "admin" && (
                <div className="form-group">
                  <label htmlFor="adminKey">Admin key</label>
                  <input
                    id="adminKey"
                    type="password"
                    placeholder="Enter admin key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    tabIndex={!isSignup ? -1 : 0}
                    required
                  />
                </div>
              )}

              {isSignup && error && (
                <div className="error-message">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="13" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="submit-btn" disabled={loading} tabIndex={!isSignup ? -1 : 0}>
                {loading && isSignup ? "Loading..." : "Create account"}
              </button>
            </form>
          </div>
        </div>

        {/* BANNER MASK — the only thing that actually slides */}
        <div className={`banner-mask ${isSignup ? "at-left" : "at-right"}`}>
          <div
            className="panel-banner-inner"
            key={isSignup ? "signup" : "login"}
          >
            <div className="banner-graphic">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
              </svg>
            </div>

            <h2 className="banner-heading">
              {isSignup ? "Already have an account?" : "New here?"}
            </h2>

            <p className="banner-body">
              {isSignup
                ? "Your notes, chats, and schedule are right where you left them. Sign in and pick up the thread."
                : "Create an account, save your chats, and keep your schedule within reach."}
            </p>

            <button
              type="button"
              className="banner-switch-btn"
              onClick={() => switchTo(!isSignup)}
            >
              {isSignup ? "← Back to log in" : "Create account →"}
            </button>

            {!isSignup && (
              <p className="banner-footer-note">For ASIATECH students &amp; staff</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;