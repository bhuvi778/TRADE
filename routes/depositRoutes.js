const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getUserDeposits } = require('../controllers/depositController');
const { defaultLimiter } = require('../middleware/rateLimiter');

router.use(defaultLimiter);
router.use(authMiddleware);

router.get('/', getUserDeposits);

module.exports = router;
