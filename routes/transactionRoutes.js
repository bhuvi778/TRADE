const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { defaultLimiter } = require('../middleware/rateLimiter');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

router.use(defaultLimiter);
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);
    res.status(200).json({ success: true, data: transactions, pagination: { page: parseInt(page), total } });
  } catch (error) {
    logger.error('Transactions route error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
