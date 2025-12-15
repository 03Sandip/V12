const express = require("express");
const Coupon = require("../models/Coupon");

const router = express.Router();

/* =========================================================
   1) ADMIN CRUD ROUTES
   URL: /api/admin/coupons
   ========================================================= */

/**
 * GET /api/admin/coupons
 */
router.get("/admin/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
});

/**
 * POST /api/admin/coupons
 */
router.post("/admin/coupons", async (req, res) => {
  try {
    let { code, discountType, discountValue, maxUses, isActive, expiresAt } =
      req.body;

    if (!code || discountValue === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Code & discount required" });
    }

    code = code.trim().toUpperCase();

    const exists = await Coupon.findOne({ code });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon already exists" });
    }

    const coupon = await Coupon.create({
      code,
      discountType: discountType || "PERCENT",
      discountValue: Number(discountValue),
      maxUses: Number(maxUses || 0),
      isActive: isActive !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.json({ success: true, message: "Coupon created", coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Create failed" });
  }
});

/**
 * PUT /api/admin/coupons/:id
 */
router.put("/admin/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon updated", coupon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

/**
 * DELETE /api/admin/coupons/:id
 */
router.delete("/admin/coupons/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

/* =========================================================
   2) BUY-NOW VALIDATION
   URL: /api/coupons/validate
   ========================================================= */

router.post("/coupons/validate", async (req, res) => {
  try {
    let { code, subtotal } = req.body;

    code = String(code || "").trim().toUpperCase();
    subtotal = Number(subtotal || 0);

    if (!code || subtotal <= 0) {
      return res.json({ success: false, message: "Invalid request" });
    }

    const coupon = await Coupon.findOne({ code });

    if (!coupon || !coupon.isActive) {
      return res.json({ success: false, message: "Invalid coupon" });
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.json({ success: false, message: "Coupon expired" });
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.json({ success: false, message: "Usage limit reached" });
    }

    let discount =
      coupon.discountType === "PERCENT"
        ? (subtotal * coupon.discountValue) / 100
        : coupon.discountValue;

    discount = Math.min(discount, subtotal);

    res.json({
      success: true,
      code: coupon.code,
      discountAmount: discount,
      payable: subtotal - discount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Validation failed" });
  }
});

/* =========================================================
   3) MARK COUPON AS USED
   URL: /api/coupons/mark-used
   ========================================================= */

router.post("/coupons/mark-used", async (req, res) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();

    if (!code) {
      return res.json({ success: false, message: "Code required" });
    }

    await Coupon.updateOne({ code }, { $inc: { usedCount: 1 } });

    res.json({ success: true, message: "Usage recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

module.exports = router;
