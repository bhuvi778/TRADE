const config = require('../config/config');

/**
 * Validate deposit input
 */
const validateDepositAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, message: '❌ Invalid amount. Please enter a valid number.' };
  }
  if (num <= 0) {
    return { valid: false, message: '❌ Amount must be greater than 0.' };
  }
  if (num < config.deposit.minAmount) {
    return {
      valid: false,
      message: `❌ Minimum deposit/staking is ${config.deposit.minAmount} USDT.`
    };
  }
  if (num > 1000000) {
    return { valid: false, message: '❌ Amount exceeds maximum limit.' };
  }
  return { valid: true, value: parseFloat(num.toFixed(2)) };
};

/**
 * Validate withdrawal amount
 */
const validateWithdrawalAmount = (amount, userBalance) => {
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, message: '❌ Invalid amount. Please enter a valid number.' };
  }
  if (num < config.withdrawal.minAmount) {
    return {
      valid: false,
      message: `❌ Minimum withdrawal is ${config.withdrawal.minAmount} USDT.`
    };
  }
  if (num > config.withdrawal.maxAmount) {
    return {
      valid: false,
      message: `❌ Maximum single withdrawal is ${config.withdrawal.maxAmount} USDT.`
    };
  }
  if (num > userBalance) {
    return {
      valid: false,
      message: `❌ Insufficient balance. Your balance is $${userBalance.toFixed(2)} USDT.`
    };
  }
  return { valid: true, value: parseFloat(num.toFixed(2)) };
};

/**
 * Validate BEP20 (BSC) wallet address
 */
const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, message: '❌ Invalid wallet address.' };
  }
  const trimmed = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return {
      valid: false,
      message: '❌ Invalid BEP20 wallet address. Address must start with 0x and be 42 characters long.'
    };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validate transaction hash
 */
const validateTxHash = (hash) => {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, message: '❌ Invalid transaction hash.' };
  }
  const trimmed = hash.trim();
  const normalized = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
    return {
      valid: false,
      message: '❌ Invalid transaction hash. Must be a 64-character hexadecimal string (with or without 0x).'
    };
  }
  return { valid: true, value: normalized };
};

/**
 * Validate profit amount for admin
 */
const validateProfitAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, message: '❌ Invalid amount.' };
  }
  if (num <= 0) {
    return { valid: false, message: '❌ Amount must be greater than 0.' };
  }
  return { valid: true, value: parseFloat(num.toFixed(2)) };
};

/**
 * Validate balance adjustment (can be negative for deduction)
 */
const validateBalanceAdjustment = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, message: '❌ Invalid amount.' };
  }
  return { valid: true, value: parseFloat(num.toFixed(2)) };
};

/**
 * Validate broadcast message
 */
const validateBroadcastMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, message: '❌ Message cannot be empty.' };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '❌ Message cannot be empty.' };
  }
  if (trimmed.length > 4096) {
    return { valid: false, message: '❌ Message exceeds Telegram limit (4096 chars).' };
  }
  return { valid: true, value: trimmed };
};

/**
 * Sanitize text input
 */
const sanitizeText = (text, maxLength = 500) => {
  if (!text) return '';
  return String(text)
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, maxLength);
};

module.exports = {
  validateDepositAmount,
  validateWithdrawalAmount,
  validateWalletAddress,
  validateTxHash,
  validateProfitAmount,
  validateBalanceAdjustment,
  validateBroadcastMessage,
  sanitizeText
};
