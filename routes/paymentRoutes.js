const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require("mongoose");

const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment');
const Notes = require('../models/notes'); // ✅ Notes model

const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// --------------------------------
// Razorpay instance
// --------------------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --------------------------------
// 1️⃣ CREATE ORDER
// --------------------------------
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const options = {
      amount: amount * 100, // rupees → paise
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to create order',
    });
  }
});

// -----------------------------------------
// 2️⃣ VERIFY PAYMENT
//    + UNLOCK NOTES
//    + INCREMENT COUPON
//    + SAVE PAYMENT HISTORY
// -----------------------------------------
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart,
      item, // 👈 Buy Now support
      appliedCouponCode,
    } = req.body;

    // ----------------------------
    // 1️⃣ Validate Razorpay signature
    // ----------------------------
    const signData = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signData)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // ----------------------------
    // 2️⃣ Normalize items (Cart OR Buy Now)
    // ----------------------------
    const itemsArray = Array.isArray(cart)
      ? cart
      : item
      ? [item]
      : [];

    // ----------------------------
    // 3️⃣ Extract VALID note ObjectIds
    // ----------------------------
    const noteIds = itemsArray
      .map(i => i._id || i.id || i.noteId)
      .filter(id => mongoose.isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(id));

    if (noteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid notes found',
      });
    }

    // ----------------------------
    // 4️⃣ Unlock notes for user
    // ----------------------------
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { purchasedNotes: { $each: noteIds } } }
    );

    // ----------------------------
    // 5️⃣ Coupon usage increment
    // ----------------------------
    let updatedCoupon = null;
    if (appliedCouponCode) {
      updatedCoupon = await Coupon.findOneAndUpdate(
        { code: String(appliedCouponCode).toUpperCase() },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
    }

    // ----------------------------
    // 6️⃣ Calculate amount from DB (SECURE)
    // ----------------------------
    const notes = await Notes.find({ _id: { $in: noteIds } });

    const totalAmount = notes.reduce(
      (sum, note) =>
        sum + Number(note.discountPrice || note.originalPrice || 0),
      0
    );

    // ----------------------------
    // 7️⃣ Save payment record
    // ----------------------------
    await Payment.create({
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: totalAmount,
      items: noteIds.map(id => ({ noteId: id })),
      couponCode: appliedCouponCode || null,
      status: 'success',
    });

    // ----------------------------
    // 8️⃣ Final response
    // ----------------------------
    return res.json({
      success: true,
      message: 'Payment verified successfully. Notes unlocked.',
      coupon: updatedCoupon,
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
});

// --------------------------------
// ✅ 3️⃣ GET ALL PAYMENTS (ADMIN)
// --------------------------------
router.get('/all', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'name email')
      .populate({
        path: 'items.noteId',
        select: 'title'
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
    });
  }
});

// --------------------------------
// ✅ 4️⃣ GET MY PAYMENTS (USER)
// --------------------------------
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate({
        path: "items.noteId",
        select: "title",
      })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      payments,
    });
  } catch (err) {
    console.error("My payments error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load receipts",
    });
  }
});



module.exports = router;
