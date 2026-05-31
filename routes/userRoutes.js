const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getProfile, getTransactions } = require('../controllers/userController');
const { defaultLimiter } = require('../middleware/rateLimiter');

router.use(defaultLimiter);
router.use(authMiddleware);

router.get('/profile', getProfile);
router.get('/transactions', getTransactions);

module.exports = router;
