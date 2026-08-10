const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Student = require("../models/Student");
const Admin = require("../models/Admin");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "astra_secret_key_change_in_production";
const ADMIN_KEY = process.env.ADMIN_KEY || "100307";

router.post("/signup", async (req, res) => {
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
      return res.status(400).json({ message: "Username already exists" });
    }

    let user;
    if (role === "admin") {
      user = new Admin(username, password, full_name);
    } else {
      user = new Student(username, password, full_name);
    }

    const savedUser = await user.save();

    const token = jwt.sign(
      { id: savedUser.id, username: savedUser.username, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, message: "Signup successful" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const passwordMatch = User.verifyPassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
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