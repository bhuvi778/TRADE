const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/adminAuth');
const { getUsers, getPendingDeposits, getPendingWithdrawals, getStats, getAdminLogs } = require('../controllers/adminController');
const { adminLimiter } = require('../middleware/rateLimiter');

router.use(adminLimiter);
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', getUsers);
router.get('/deposits/pending', getPendingDeposits);
router.get('/withdrawals/pending', getPendingWithdrawals);
router.get('/stats', getStats);
router.get('/logs', getAdminLogs);

module.exports = router;
