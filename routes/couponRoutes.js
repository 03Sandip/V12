// routes/couponRoutes.js
const express = require("express");
const Coupon = require("../models/Coupon");

const router = express.Router();

/* =========================================================
   1) ADMIN CRUD ROUTES (NO AUTH IN THIS VERSION)
   ========================================================= */

/**
 * GET /api/coupons
 * Get all coupons
 */
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    console.error("Get coupons error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
    });
  }
});

/**
 * POST /api/coupons
 * Create coupon
 */
router.post("/", async (req, res) => {
  try {
    let { code, discountType, discountValue, maxUses, isActive, expiresAt } =
      req.body;

    if (!code || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code and discount value are required",
      });
    }

    code = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const coupon = await Coupon.create({
      code,
      discountType: discountType || "PERCENT",
      discountValue: Number(discountValue),
      maxUses: Number(maxUses || 0),
      isActive: isActive === undefined ? true : Boolean(isActive),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.json({
      success: true,
      message: "Coupon created",
      coupon,
    });
  } catch (err) {
    console.error("Create coupon error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
    });
  }
});

/**
 * PUT /api/coupons/:id
 * Update coupon
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      code,
      discountType,
      discountValue,
      maxUses,
      isActive,
      expiresAt,
    } = req.body;

    const update = {};

    if (code) update.code = code.trim().toUpperCase();
    if (discountType) update.discountType = discountType;
    if (discountValue !== undefined) update.discountValue = Number(discountValue);
    if (maxUses !== undefined) update.maxUses = Number(maxUses);
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (expiresAt !== undefined) {
      update.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      message: "Coupon updated",
      coupon,
    });
  } catch (err) {
    console.error("Update coupon error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
});

/**
 * DELETE /api/coupons/:id
 * Delete coupon
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      message: "Coupon deleted",
    });
  } catch (err) {
    console.error("Delete coupon error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
    });
  }
});

/* =========================================================
   2) VALIDATE ROUTE (USED BY BUY-NOW PAGE)
   ========================================================= */

/**
 * POST /api/coupons/validate
 * Body: { code, subtotal }
 */
router.post("/validate", async (req, res) => {
  try {
    let { code, subtotal } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    code = code.trim().toUpperCase();
    subtotal = Number(subtotal || 0);

    if (subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid subtotal amount",
      });
    }

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    if (!coupon.isActive) {
      return res.json({ success: false, message: "Coupon is deactivated" });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.json({ success: false, message: "Coupon expired" });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.json({ success: false, message: "Max usage reached" });
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENT") {
      discountAmount = (subtotal * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, subtotal);
    const payable = subtotal - discountAmount;

    res.json({
      success: true,
      message: "Coupon applied",
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      payable,
    });
  } catch (err) {
    console.error("Validate coupon error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to validate coupon",
    });
  }
});

/* =========================================================
   3) MARK-USED ROUTE (CALLED AFTER SUCCESSFUL PAYMENT)
   ========================================================= */

/**
 * POST /api/coupons/mark-used
 * Body: { code }
 * Increments usedCount by 1
 */
router.post("/mark-used", async (req, res) => {
  try {
    let { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    code = code.trim().toUpperCase();

    const coupon = await Coupon.findOneAndUpdate(
      { code },
      { $inc: { usedCount: 1 } },
      { new: true }
    );

    if (!coupon) {
      return res.json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.json({
      success: true,
      message: "Coupon usage recorded",
      coupon,
    });
  } catch (err) {
    console.error("mark-used error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update usage",
    });
  }
});

module.exports = router;
