// middleware/authMiddleware.js
const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ message: "No token, unauthorized" });
    }

    const user = await User.findOne({ activeSessionToken: token }).exec();

    // If no matching session = logged out or logged in from another device
    if (!user) {
      return res.status(401).json({
        message: "Session expired. You were logged in on another device.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
