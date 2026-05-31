const Withdrawal = require('../models/Withdrawal');
const logger = require('../utils/logger');

/**
 * Get current user's withdrawals
 */
const getUserWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: withdrawals,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('getUserWithdrawals error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUserWithdrawals };
