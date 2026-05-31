const Deposit = require('../models/Deposit');
const logger = require('../utils/logger');

/**
 * Get current user's deposits
 */
const getUserDeposits = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const deposits = await Deposit.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Deposit.countDocuments(query);

    res.status(200).json({
      success: true,
      data: deposits,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    logger.error('getUserDeposits error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUserDeposits };
