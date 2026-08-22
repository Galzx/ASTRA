const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Student = require("../models/Student");
const Admin = require("../models/Admin");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Add it to backend/.env (local) or your host's environment variables (e.g. Render dashboard)."
  );
}
if (!ADMIN_KEY) {
  throw new Error(
    "ADMIN_KEY is not set. Add it to backend/.env (local) or your host's environment variables (e.g. Render dashboard)."
  );
}

const STUDENT_NUMBER_PATTERN = /^1-\d{6}[a-zA-Z]$/;
const MIN_PASSWORD_LENGTH = 8;
const VALID_ROLES = ["student", "admin"];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a few minutes." }
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many signup attempts. Please try again in a few minutes." }
});

router.post("/signup", signupLimiter, async (req, res) => {
  try {
    let { username, password, full_name, role, admin_key } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    username = String(username).trim();
    full_name = String(full_name).trim();

    if (!STUDENT_NUMBER_PATTERN.test(username)) {
      return res.status(400).json({ message: "Student number must be in the format 1-XXXXXXf (six digits, one letter)" });
    }

    if (!full_name) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "admin" && admin_key !== ADMIN_KEY) {
      return res.status(403).json({ message: "Invalid admin key" });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Student number already exists" });
    }

    let user;
    if (role === "admin") {
      user = new Admin(username, password, full_name);
    } else {
      user = new Student(username, password, full_name);
    }

    const savedUser = await user.save();

    const token = jwt.sign(
      { id: savedUser.id, username: savedUser.username, full_name: savedUser.full_name, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, message: "Signup successful" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Student number and password are required" });
    }

    username = String(username).trim();

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const passwordMatch = await User.verifyPassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;