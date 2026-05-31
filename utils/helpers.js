const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

/**
 * Generate a unique referral code
 */
const generateReferralCode = () => {
  return uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
};

/**
 * Generate a unique transaction ID
 */
const generateTransactionId = () => {
  return `TXN${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
};

/**
 * Format amount to 2 decimal places
 */
const formatAmount = (amount) => {
  return parseFloat(parseFloat(amount).toFixed(2));
};

/**
 * Calculate withdrawal fee
 */
const calculateWithdrawalFee = (amount) => {
  const feePercent = config.withdrawal.feePercentage;
  const fee = formatAmount((amount * feePercent) / 100);
  const netAmount = formatAmount(amount - fee);
  return { fee, netAmount };
};

/**
 * Calculate referral bonus
 */
const calculateReferralBonus = (depositAmount) => {
  const bonusPercent = config.referral.bonusPercentage;
  return formatAmount((depositAmount * bonusPercent) / 100);
};

/**
 * Check if a user is an admin
 */
const isAdmin = (telegramId) => {
  return config.telegram.adminIds.includes(String(telegramId));
};

/**
 * Truncate long strings for display
 */
const truncate = (str, maxLength = 20) => {
  if (!str) return '';
  const s = String(str);
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength - 3) + '...';
};

/**
 * Mask wallet address for display (show first 6 and last 4 chars)
 */
const maskWalletAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Sanitize user input to prevent injection
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>'"]/g, '').trim().substring(0, 500);
};

/**
 * Validate USDT TRC20 wallet address format
 */
const isValidTRC20Address = (address) => {
  if (!address || typeof address !== 'string') return false;
  // TRC20 addresses start with T and are 34 characters long
  return /^T[a-zA-Z0-9]{33}$/.test(address.trim());
};

/**
 * Validate transaction hash (basic check)
 */
const isValidTxHash = (hash) => {
  if (!hash || typeof hash !== 'string') return false;
  const trimmed = hash.trim();
  // TRC20 tx hash is 64 hex chars
  return /^[a-fA-F0-9]{64}$/.test(trimmed);
};

/**
 * Parse a float safely, return null on invalid input
 */
const safeParseFloat = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return null;
  return num;
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get rank emoji
 */
const getRankEmoji = (rank) => {
  const map = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Platinum: '💎',
    Diamond: '💠'
  };
  return map[rank] || '🥉';
};

module.exports = {
  generateReferralCode,
  generateTransactionId,
  formatAmount,
  calculateWithdrawalFee,
  calculateReferralBonus,
  isAdmin,
  truncate,
  maskWalletAddress,
  sanitizeInput,
  isValidTRC20Address,
  isValidTxHash,
  safeParseFloat,
  sleep,
  getRankEmoji
};
