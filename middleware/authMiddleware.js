// middleware/authMiddleware.js
const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    // ✅ Allow CORS preflight
    if (req.method === "OPTIONS") {
      return next();
    }

    let token = null;

    // 1) Try Authorization header
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "").trim();
    }

    // 2) If no header token, try query param ?token=...
    if (!token && req.query && typeof req.query.token === "string") {
      token = req.query.token.trim();
    }

    // 3) If still no token → unauthorized
    if (!token) {
      return res.status(401).json({ message: "No token, unauthorized" });
    }

    // 4) Find user with this active session token
    const user = await User.findOne({ activeSessionToken: token }).exec();

    // If no matching session
    if (!user) {
      return res.status(401).json({
        message: "Session expired. You were logged in on another device.",
      });
    }

    // Attach user to request and continue
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
