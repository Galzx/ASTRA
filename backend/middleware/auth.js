const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Add it to backend/.env (local) or your host's environment variables (e.g. Render dashboard)."
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Verify the user still exists in the database
    try {
      const user = await User.findByUsername(decoded.username);
      if (!user) {
        return res.status(403).json({ error: "User account no longer exists" });
      }
      req.user = decoded;
      next();
    } catch (dbErr) {
      console.error("Auth middleware DB error:", dbErr);
      return res.status(500).json({ error: "Authentication check failed" });
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin };