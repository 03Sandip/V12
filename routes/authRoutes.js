// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * POST /api/auth/signup
 * Body: { name, email, phone, college, password }
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, college, password } = req.body;

    if (!name || !email || !phone || !college || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if email already used
    const existing = await User.findOne({ email }).exec();
    if (existing) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }

    const user = new User({
      name,
      email,
      phone,
      college,
      password, // will be hashed by pre('save')
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Signup successful. Please log in.",
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { success, token, user }
 * Single-device login enforced by activeSessionToken
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    // Create NEW login session — old one becomes invalid
    const sessionToken = crypto.randomBytes(48).toString("hex");
    user.activeSessionToken = sessionToken;
    await user.save();

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/logout
 * Header: Authorization: Bearer <token>
 * Clears activeSessionToken
 */
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    req.user.activeSessionToken = null;
    await req.user.save();

    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/auth/users
 * Header: Authorization: Bearer <token>
 * Returns list of all users (for admin dashboard)
 */
router.get("/users", authMiddleware, async (req, res) => {
  try {
    // If you later add roles, you can restrict like:
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Forbidden" });
    // }

    const users = await User.find({}, "name email phone college createdAt")
      .sort({ createdAt: -1 })
      .exec();

    return res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
