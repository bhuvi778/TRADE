const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Profit = require('../models/Profit');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Get platform-wide analytics
 */
const getPlatformStats = async () => {
  try {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      depositStats,
      withdrawalStats,
      profitStats,
      pendingDeposits,
      pendingWithdrawals
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: false }),
      User.countDocuments({ isBanned: true }),
      Deposit.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Profit.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' })
    ]);

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      totalDeposited: depositStats[0]?.total || 0,
      totalDepositCount: depositStats[0]?.count || 0,
      totalWithdrawn: withdrawalStats[0]?.total || 0,
      totalWithdrawalCount: withdrawalStats[0]?.count || 0,
      totalProfits: profitStats[0]?.total || 0,
      totalProfitCount: profitStats[0]?.count || 0,
      pendingDeposits,
      pendingWithdrawals
    };
  } catch (error) {
    logger.error('Error getting platform stats:', error);
    throw error;
  }
};

/**
 * Get top users by balance
 */
const getTopUsersByBalance = async (limit = 10) => {
  try {
    return await User.find({ isBanned: false })
      .sort({ walletBalance: -1 })
      .limit(limit)
      .select('fullName username telegramId walletBalance rank totalDeposits');
  } catch (error) {
    logger.error('Error getting top users:', error);
    return [];
  }
};

/**
 * Get top referrers
 */
const getTopReferrers = async (limit = 10) => {
  try {
    return await User.find({ referralCount: { $gt: 0 } })
      .sort({ referralCount: -1 })
      .limit(limit)
      .select('fullName username telegramId referralCount totalReferralEarnings');
  } catch (error) {
    logger.error('Error getting top referrers:', error);
    return [];
  }
};

/**
 * Get recent transactions
 */
const getRecentTransactions = async (limit = 10) => {
  try {
    return await Transaction.find()
      .populate('userId', 'fullName username')
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    logger.error('Error getting recent transactions:', error);
    return [];
  }
};

module.exports = {
  getPlatformStats,
  getTopUsersByBalance,
  getTopReferrers,
  getRecentTransactions
};
