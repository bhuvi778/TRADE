const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    referralCode: {
      type: String,
      required: true,
      index: true
    },
    bonusAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    bonusPaid: {
      type: Boolean,
      default: false
    },
    bonusPaidAt: {
      type: Date,
      default: null
    },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    hasQualifiedDeposit: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['registered', 'deposited', 'bonus_paid'],
      default: 'registered'
    }
  },
  {
    timestamps: true
  }
);

referralSchema.index({ referrerId: 1, createdAt: -1 });

const Referral = mongoose.model('Referral', referralSchema);
module.exports = Referral;
