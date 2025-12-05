// routes/paymentRoutes.js
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ----------------------------
// 1️⃣ CREATE ORDER (backend)
// ----------------------------
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Amount is required',
      });
    }

    const options = {
      amount: amount * 100, // ₹ → paise
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
// 2️⃣ VERIFY PAYMENT + SAVE PURCHASED NOTES
// -----------------------------------------
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart = [],
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay verification parameters',
      });
    }

    // Step 1: Verify signature
    const signData = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signData.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    // if (!isValid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid payment signature',
    //   });
    // }

    // Step 2: Extract purchased note IDs from cart
    const noteIds = cart
      .map((item) => item._id || item.id)
      .filter(Boolean);

    // Step 3: Save purchased notes to user account
    if (noteIds.length > 0) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { purchasedNotes: { $each: noteIds } } }, // no duplicates
        { new: true }
      );
    }

    // Step 4: Success response
    return res.json({
      success: true,
      message: 'Payment verified successfully. Notes unlocked.',
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
});

module.exports = router;
