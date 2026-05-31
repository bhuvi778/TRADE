require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/growex_capital',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    expire: process.env.JWT_EXPIRE || '7d'
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.BOT_USERNAME,
    adminIds: (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
    adminChatId: process.env.ADMIN_CHAT_ID
  },

  wallet: {
    trc20Address: process.env.TRC20_WALLET_ADDRESS || 'NOT_CONFIGURED',
    network: process.env.NETWORK || 'USDT BEP20'
  },

  deposit: {
    minAmount: parseFloat(process.env.MIN_DEPOSIT_AMOUNT) || 10
  },

  staking: {
    dailyRatePercent: parseFloat(process.env.STAKING_DAILY_RATE) || 0.6,
    minInvestment: parseFloat(process.env.MIN_STAKING_AMOUNT) || 10,
    payoutIntervalHours: parseInt(process.env.STAKING_PAYOUT_HOURS) || 24,
    minPeriodHours: parseInt(process.env.STAKING_MIN_PERIOD_HOURS) || 24,
    maxPeriodYears: parseInt(process.env.STAKING_MAX_PERIOD_YEARS) || 5
  },

  referral: {
    minDepositForBonus: parseFloat(process.env.MIN_DEPOSIT_FOR_REFERRAL) || 10,
    levelRates: [3, 2, 2, 1, 1, 0.5, 0.5],
    unlockRules: {
      1: 2,
      2: 3,
      3: 4,
      4: 5,
      5: 7
    }
  },

  withdrawal: {
    minAmount: parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 10,
    maxAmount: parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT) || 999999999,
    feePercentage: parseFloat(process.env.WITHDRAWAL_FEE_PERCENTAGE) || 1
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs'
  }
};

// Validate critical configuration
const validateConfig = () => {
  const required = ['TELEGRAM_BOT_TOKEN', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please copy .env.example to .env and fill in all required values.');
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = config;
