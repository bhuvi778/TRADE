const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      default: null,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    stakedBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    activeDirectReferrals: {
      type: Number,
      default: 0,
      min: 0
    },
    stakingStartedAt: {
      type: Date,
      default: null
    },
    lastStakingPayoutAt: {
      type: Date,
      default: null
    },
    referralCode: {
      type: String,
      unique: true,
      index: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    totalDeposits: {
      type: Number,
      default: 0,
      min: 0
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
      min: 0
    },
    totalProfits: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReferralEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    referralCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    bannedReason: {
      type: String,
      default: null
    },
    bannedAt: {
      type: Date,
      default: null
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    rank: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
      default: 'Bronze'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate referral code
userSchema.pre('save', function (next) {
  if (!this.referralCode) {
    this.referralCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  }
  next();
});

// Method to update user rank based on total deposits
userSchema.methods.updateRank = function () {
  const totalDeposited = this.totalDeposits;
  if (totalDeposited >= 50000) this.rank = 'Diamond';
  else if (totalDeposited >= 10000) this.rank = 'Platinum';
  else if (totalDeposited >= 5000) this.rank = 'Gold';
  else if (totalDeposited >= 1000) this.rank = 'Silver';
  else this.rank = 'Bronze';
};

// Virtual for formatted balance
userSchema.virtual('formattedBalance').get(function () {
  return `$${this.walletBalance.toFixed(2)} USDT`;
});

userSchema.index({ createdAt: -1 });
userSchema.index({ walletBalance: -1 });
userSchema.index({ totalDeposits: -1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
