// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Notes = require("../models/notes");
const auth = require("../middleware/authMiddleware"); // kept for future use

// ⚠️ OPTIONAL: In future you can protect this with auth + admin role.
// For now it's OPEN so the admin dashboard can load without login.

/**
 * GET /api/admin/purchases
 * Returns every user + full note details they purchased
 */
router.get("/purchases", async (req, res) => {
  try {
    const users = await User.find({})
      // ✅ include phone here
      .select("name email phone purchasedNotes")
      .populate({
        path: "purchasedNotes",
        select:
          "title originalPrice discountPrice semester department createdAt",
        populate: {
          path: "department",
          select: "name",
        },
      })
      .lean();

    return res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("Admin purchase fetch error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
