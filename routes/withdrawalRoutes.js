const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getUserWithdrawals } = require('../controllers/withdrawalController');
const { defaultLimiter } = require('../middleware/rateLimiter');

router.use(defaultLimiter);
router.use(authMiddleware);

router.get('/', getUserWithdrawals);

module.exports = router;
