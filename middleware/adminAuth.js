const config = require('../config/config');
const AdminLog = require('../models/AdminLog');
const logger = require('../utils/logger');

/**
 * Middleware to check if the Telegram user is an admin
 * Used in bot handlers — checks config.telegram.adminIds
 */
const isAdminTelegramId = (telegramId) => {
  return config.telegram.adminIds.includes(String(telegramId));
};

/**
 * Express middleware for REST API admin routes
 * Expects req.user to be set by authMiddleware
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!req.user.isAdmin && !isAdminTelegramId(req.user.telegramId)) {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user.telegramId}`);
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
};

/**
 * Log admin actions to database
 */
const logAdminAction = async (adminId, action, targetUserId, details) => {
  try {
    await AdminLog.create({
      adminId: String(adminId),
      action,
      targetUserId: targetUserId || null,
      details: details || {}
    });
  } catch (error) {
    logger.error('Failed to log admin action:', error);
  }
};

module.exports = { isAdminTelegramId, adminMiddleware, logAdminAction };
