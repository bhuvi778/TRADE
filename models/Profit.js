const mongoose = require('mongoose');

const profitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    telegramId: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['fixed', 'percentage', 'referral_bonus', 'manual', 'staking'],
      default: 'manual'
    },
    percentage: {
      type: Number,
      default: null
    },
    description: {
      type: String,
      default: 'Profit added by admin',
      maxlength: 500
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    addedBy: {
      type: String,
      default: 'system'
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

profitSchema.index({ createdAt: -1 });
profitSchema.index({ userId: 1, createdAt: -1 });

const Profit = mongoose.model('Profit', profitSchema);
module.exports = Profit;
