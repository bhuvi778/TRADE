const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema(
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
      min: [1, 'Minimum withdrawal amount is $1']
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true
    },
    network: {
      type: String,
      default: 'TRC20'
    },
    fee: {
      type: Number,
      default: 0,
      min: 0
    },
    netAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing'],
      default: 'pending',
      index: true
    },
    txHash: {
      type: String,
      default: null,
      trim: true
    },
    approvedBy: {
      type: String,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    rejectedReason: {
      type: String,
      default: null
    },
    adminNote: {
      type: String,
      default: null
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

withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;
