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
    const { username, password, full_name, role, admin_key } = req.body;

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ message: "All fields are required" });
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Student number and password are required" });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid student number or password" });
    }

    const passwordMatch = User.verifyPassword(password, user.password);
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