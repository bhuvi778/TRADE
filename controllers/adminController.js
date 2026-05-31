const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Profit = require('../models/Profit');
const Transaction = require('../models/Transaction');
const AdminLog = require('../models/AdminLog');
const { getPlatformStats, getTopUsersByBalance, getTopReferrers } = require('../services/analyticsService');
const { broadcastMessage } = require('../services/notificationService');
const logger = require('../utils/logger');

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { telegramId: search }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await User.countDocuments(query);
    res.status(200).json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    logger.error('Admin getUsers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPendingDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find({ status: 'pending' })
      .populate('userId', 'fullName username telegramId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: deposits });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .populate('userId', 'fullName username telegramId')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: withdrawals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await getPlatformStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await AdminLog.countDocuments();
    res.status(200).json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, getPendingDeposits, getPendingWithdrawals, getStats, getAdminLogs };
