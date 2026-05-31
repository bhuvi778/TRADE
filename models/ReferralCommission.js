const mongoose = require('mongoose');

const referralCommissionSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0
    },
    eventType: {
      type: String,
      enum: ['deposit', 'staking_profit'],
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

referralCommissionSchema.index({ referrerId: 1, createdAt: -1 });
referralCommissionSchema.index({ sourceUserId: 1, eventType: 1, level: 1 });

const ReferralCommission = mongoose.model('ReferralCommission', referralCommissionSchema);
module.exports = ReferralCommission;
