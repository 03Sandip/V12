const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Payment = require('../models/Payment'); // ✅ NEW

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

    if (!amount) {
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
//    + SAVE PAYMENT HISTORY ✅
// -----------------------------------------
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    console.log('[/payment/verify] BODY =', req.body);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cart = [],
      appliedCouponCode,
    } = req.body;

    // ----------------------------
    // Validation
    // ----------------------------
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay verification parameters',
      });
    }

    // ----------------------------
    // Step 1: Verify Razorpay signature
    // ----------------------------
    const signData = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signData)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    // ----------------------------
    // Step 2: Extract note IDs
    // ----------------------------
    const noteIds = cart
      .map(item => item._id || item.id)
      .filter(Boolean);

    // ----------------------------
    // Step 3: Unlock notes for user
    // ----------------------------
    if (noteIds.length > 0) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { purchasedNotes: { $each: noteIds } } },
        { new: true }
      );
    }

    // ----------------------------
    // Step 4: Coupon usage increment
    // ----------------------------
    let updatedCoupon = null;

    if (appliedCouponCode) {
      const upperCode = String(appliedCouponCode).toUpperCase();

      updatedCoupon = await Coupon.findOneAndUpdate(
        { code: upperCode },
        { $inc: { usedCount: 1 } },
        { new: true }
      );
    }

    // ----------------------------
    // ✅ Step 5: SAVE PAYMENT RECORD
    // ----------------------------
    const totalAmount = cart.reduce(
      (sum, item) =>
        sum + Number(item.discountPrice || item.originalPrice || 0),
      0
    );

    await Payment.create({
      user: req.user._id,

      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,

      amount: totalAmount,

      items: cart.map(item => ({
        noteId: item._id || item.id,
        title: item.title,
        price: Number(item.discountPrice || item.originalPrice || 0),
      })),

      couponCode: appliedCouponCode || null,
      status: 'success',
    });

    // ----------------------------
    // Step 6: Response
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

module.exports = router;
