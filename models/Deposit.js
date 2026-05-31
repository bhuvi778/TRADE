const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
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
      min: [1, 'Minimum deposit amount is $1']
    },
    txHash: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    network: {
      type: String,
      default: 'TRC20'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
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

depositSchema.index({ createdAt: -1 });
depositSchema.index({ status: 1, createdAt: -1 });

const Deposit = mongoose.model('Deposit', depositSchema);
module.exports = Deposit;
