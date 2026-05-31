const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const Profit = require('../models/Profit');
const logger = require('../utils/logger');

router.use(defaultLimiter);
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const profits = await Profit.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Profit.countDocuments({ userId: req.user._id });
    res.status(200).json({ success: true, data: profits, pagination: { page: parseInt(page), total } });
  } catch (error) {
    logger.error('Profits route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
