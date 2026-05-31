const User = require('../models/User');
const Profit = require('../models/Profit');
const Transaction = require('../models/Transaction');
const { distributeReferralCommissions } = require('./referralService');
const { notifyStakingProfit } = require('./notificationService');
const { formatAmount } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config/config');

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Calculate daily staking profit for a staked amount
 */
const calculateDailyProfit = (stakedAmount) => {
  const rate = config.staking.dailyRatePercent / 100;
  return formatAmount(stakedAmount * rate);
};

/**
 * Check if user is eligible for staking payout
 */
const isEligibleForPayout = (user) => {
  if (!user.stakedBalance || user.stakedBalance < config.staking.minInvestment) {
    return false;
  }

  const maxEndDate = user.stakingStartedAt
    ? new Date(user.stakingStartedAt.getTime() + config.staking.maxPeriodYears * 365 * MS_PER_DAY)
    : null;

  if (maxEndDate && new Date() > maxEndDate) {
    return false;
  }

  if (!user.lastStakingPayoutAt) {
    const minWait = config.staking.minPeriodHours * MS_PER_HOUR;
    const startedAt = user.stakingStartedAt || user.createdAt;
    return Date.now() - new Date(startedAt).getTime() >= minWait;
  }

  const interval = config.staking.payoutIntervalHours * MS_PER_HOUR;
  return Date.now() - new Date(user.lastStakingPayoutAt).getTime() >= interval;
};

/**
 * Process staking payout for a single user
 */
const processUserStakingPayout = async (user) => {
  const profitAmount = calculateDailyProfit(user.stakedBalance);
  if (profitAmount <= 0) return null;

  const balanceBefore = user.walletBalance;
  const balanceAfter = formatAmount(balanceBefore + profitAmount);

  await User.findByIdAndUpdate(user._id, {
    $inc: {
      walletBalance: profitAmount,
      totalProfits: profitAmount
    },
    lastStakingPayoutAt: new Date()
  });

  await Profit.create({
    userId: user._id,
    telegramId: user.telegramId,
    amount: profitAmount,
    type: 'staking',
    description: `${config.staking.dailyRatePercent}% daily staking profit on ${user.stakedBalance.toFixed(2)} USDT`,
    balanceBefore,
    balanceAfter,
    addedBy: 'system'
  });

  await Transaction.create({
    userId: user._id,
    telegramId: user.telegramId,
    type: 'staking_profit',
    amount: profitAmount,
    direction: 'credit',
    balanceBefore,
    balanceAfter,
    description: `Daily staking profit (${config.staking.dailyRatePercent}%)`
  });

  await distributeReferralCommissions(user._id, profitAmount, 'staking_profit');
  await notifyStakingProfit(user.telegramId, profitAmount, user.stakedBalance);

  logger.info(`Staking payout ${profitAmount} USDT to user ${user.telegramId}`);
  return profitAmount;
};

/**
 * Run daily staking payouts for all eligible users
 */
const runDailyStakingPayouts = async () => {
  try {
    const users = await User.find({
      stakedBalance: { $gte: config.staking.minInvestment },
      isBanned: false,
      isActive: true
    });

    let processed = 0;
    let totalPaid = 0;

    for (const user of users) {
      if (!isEligibleForPayout(user)) continue;

      const paid = await processUserStakingPayout(user);
      if (paid) {
        processed++;
        totalPaid += paid;
      }
    }

    if (processed > 0) {
      logger.info(`Staking run complete: ${processed} users paid, total ${totalPaid.toFixed(2)} USDT`);
    }

    return { processed, totalPaid };
  } catch (error) {
    logger.error('Error running daily staking payouts:', error);
    return { processed: 0, totalPaid: 0 };
  }
};

/**
 * Allocate approved deposit to staking balance
 */
const allocateDepositToStaking = async (user, depositAmount) => {
  const update = {
    $inc: {
      stakedBalance: depositAmount,
      totalDeposits: depositAmount
    }
  };

  const newStakedTotal = formatAmount((user.stakedBalance || 0) + depositAmount);
  if (!user.stakingStartedAt && newStakedTotal >= config.staking.minInvestment) {
    update.$set = { stakingStartedAt: new Date() };
  }

  const updated = await User.findByIdAndUpdate(user._id, update, { new: true });
  updated.updateRank();
  await updated.save();

  return updated;
};

/**
 * Unstake partial amount from staked balance to withdrawable wallet
 */
const unstakeAmount = async (user, amount) => {
  const unstakeAmountValue = formatAmount(amount);

  if (unstakeAmountValue <= 0) {
    return { success: false, message: '❌ Invalid unstake amount.' };
  }

  if (unstakeAmountValue > user.stakedBalance) {
    return { success: false, message: '❌ Unstake amount exceeds your staked balance.' };
  }

  const remainingStake = formatAmount(user.stakedBalance - unstakeAmountValue);
  if (remainingStake > 0 && remainingStake < config.staking.minInvestment) {
    return {
      success: false,
      message: `❌ After unstake, remaining stake must be at least $${config.staking.minInvestment} USDT or unstake full amount.`
    };
  }

  const walletBefore = user.walletBalance;
  const walletAfter = formatAmount(walletBefore + unstakeAmountValue);
  const stakedAfter = remainingStake;

  await User.findByIdAndUpdate(user._id, {
    $inc: {
      stakedBalance: -unstakeAmountValue,
      walletBalance: unstakeAmountValue
    },
    ...(stakedAfter === 0 ? { stakingStartedAt: null, lastStakingPayoutAt: null } : {})
  });

  await Transaction.create({
    userId: user._id,
    telegramId: user.telegramId,
    type: 'unstake',
    amount: unstakeAmountValue,
    direction: 'credit',
    balanceBefore: walletBefore,
    balanceAfter: walletAfter,
    description: `Unstaked ${unstakeAmountValue} USDT to withdrawable balance`
  });

  return {
    success: true,
    unstaked: unstakeAmountValue,
    stakedAfter,
    walletAfter
  };
};

/**
 * Start hourly scheduler to process staking payouts
 */
const startStakingScheduler = () => {
  const intervalMs = 60 * 60 * 1000;

  setTimeout(() => {
    runDailyStakingPayouts();
  }, 10000);

  setInterval(() => {
    runDailyStakingPayouts();
  }, intervalMs);

  logger.info(`Staking scheduler started (checks every hour, ${config.staking.dailyRatePercent}% daily rate)`);
};

module.exports = {
  calculateDailyProfit,
  runDailyStakingPayouts,
  allocateDepositToStaking,
  unstakeAmount,
  startStakingScheduler,
  isEligibleForPayout
};
