const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('getProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get user transaction history
 */
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('getTransactions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, getTransactions };
