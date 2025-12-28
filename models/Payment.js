const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,

    amount: {
      type: Number,
      required: true,
    },

    items: [
      {
        noteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Notes',
        },
        title: String,
        price: Number,
      },
    ],

    couponCode: String,

    status: {
      type: String,
      default: 'success',
    },
  },
  { timestamps: true } // ✅ date & time automatically
);

module.exports = mongoose.model('Payment', paymentSchema);
