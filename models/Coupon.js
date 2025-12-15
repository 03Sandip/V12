// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENT', 'FLAT'],
      default: 'PERCENT',
    },
    discountValue: {
      type: Number,
      required: true, // e.g. 10 for 10%
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
