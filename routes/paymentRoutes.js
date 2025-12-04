// routes/paymentRoutes.js
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

// ✅ Create Razorpay instance using env variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🧾 1) Create order route
// POST /api/payment/create-order
// Body: { amount: 500 }  // amount in rupees
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res
        .status(400)
        .json({ success: false, message: 'Amount is required' });
    }

    const options = {
      amount: amount * 100, // amount in paise (₹1 = 100 paise)
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

// ✅ 2) Verify payment route (optional but recommended)
// Razorpay will send: razorpay_order_id, razorpay_payment_id, razorpay_signature
// You should call this from frontend after successful payment
// POST /api/payment/verify
router.post('/verify', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const signData = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signData.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid payment signature' });
    }

    // 🟢 Payment is verified successfully
    // 👉 Here you can save payment details to DB if needed

    return res.json({
      success: true,
      message: 'Payment verified successfully',
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
