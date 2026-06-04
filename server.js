require('dotenv').config();
const https = require('https');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const { connectDatabase } = require('./database/connection');
const { initializeBot } = require('./bot');
const { startStakingScheduler } = require('./services/stakingService');
const logger = require('./utils/logger');
const config = require('./config/config');

// Import routes
const userRoutes = require('./routes/userRoutes');
const depositRoutes = require('./routes/depositRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const profitRoutes = require('./routes/profitRoutes');
const adminRoutes = require('./routes/adminRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));

app.use(cors({
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB injection protection
app.use(mongoSanitize());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Trust proxy (for rate limiting behind NGINX)
app.set('trust proxy', 1);

// ============================================================
// ROUTES
// ============================================================

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/profits', profitRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  logger.error(`Error ${statusCode}: ${err.message}`, { stack: err.stack, path: req.path });

  res.status(statusCode).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'An internal server error occurred' : err.message
  });
});

// ============================================================
// SERVER STARTUP
// ============================================================

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Initialize Telegram Bot
    initializeBot();

    // Start daily staking profit scheduler
    startStakingScheduler();

    // Start HTTP server
    const PORT = config.port;
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT} [${config.nodeEnv}]`);
      logger.info(`📡 Telegram bot active`);
    });

    // ============================================================
    // KEEP-ALIVE: Render free tier ko sleep hone se rokta hai
    // Har 10 minutes mein apne /health endpoint ko ping karta hai
    // ============================================================
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (RENDER_URL && config.nodeEnv === 'production') {
      const pingInterval = 10 * 60 * 1000; // 10 minutes
      setInterval(() => {
        const url = new URL(`${RENDER_URL}/health`);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.get(url.href, (res) => {
          logger.info(`[Keep-Alive] Ping sent → Status: ${res.statusCode}`);
        });
        req.on('error', (err) => {
          logger.warn(`[Keep-Alive] Ping failed: ${err.message}`);
        });
        req.end();
      }, pingInterval);
      logger.info(`[Keep-Alive] Self-ping active every 10 min → ${RENDER_URL}`);
    }

    // Handle unhandled promise rejections — DO NOT exit, just log
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection (bot will keep running):', reason);
    });

    // Handle uncaught exceptions — log and keep running
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception (bot will keep running):', err.message, err.stack);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down...');
      server.close(() => process.exit(0));
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
