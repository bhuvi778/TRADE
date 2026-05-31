const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'profit', 'referral_bonus', 'balance_adjustment', 'staking_profit', 'unstake', 'referral_commission'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    direction: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      default: '',
      maxlength: 500
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    referenceModel: {
      type: String,
      enum: ['Deposit', 'Withdrawal', 'Profit', null],
      default: null
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed'
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
