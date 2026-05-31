const logger = require('../utils/logger');
const { formatUSDT, formatDate, formatStatus } = require('../utils/formatters');

let botInstance = null;

/**
 * Set the bot instance for sending notifications
 */
const setBotInstance = (bot) => {
  botInstance = bot;
};

/**
 * Send a safe message to a Telegram user
 */
const sendNotification = async (telegramId, message, options = {}) => {
  if (!botInstance) {
    logger.warn('Bot instance not set in notificationService');
    return false;
  }

  try {
    await botInstance.sendMessage(String(telegramId), message, {
      parse_mode: 'Markdown',
      ...options
    });
    return true;
  } catch (error) {
    logger.error(`Failed to send notification to ${telegramId}: ${error.message}`);
    return false;
  }
};

/**
 * Notify user: deposit approved and staked
 */
const notifyDepositApproved = async (telegramId, deposit, user) => {
  const message = `
✅ *Deposit Approved & Staked!*
━━━━━━━━━━━━━━━━━━━━
💰 Amount: *${formatUSDT(deposit.amount)}*
🔒 Staked Balance: *${formatUSDT(user?.stakedBalance || deposit.amount)}*
📈 Daily Profit: *0.60% per day*
📋 TxHash: \`${deposit.txHash ? deposit.txHash.substring(0, 16) + '...' : 'N/A'}\`
📅 Date: ${formatDate(deposit.approvedAt || new Date())}
━━━━━━━━━━━━━━━━━━━━
Your funds are now earning daily staking profit. Withdraw profits anytime!
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: deposit rejected
 */
const notifyDepositRejected = async (telegramId, deposit) => {
  const message = `
❌ *Deposit Rejected*
━━━━━━━━━━━━━━━━━━━━
💰 Amount: $${deposit.amount} USDT
📋 TxHash: \`${deposit.txHash ? deposit.txHash.substring(0, 16) + '...' : 'N/A'}\`
${deposit.rejectedReason ? `📝 Reason: ${deposit.rejectedReason}` : ''}
━━━━━━━━━━━━━━━━━━━━
If you believe this is an error, please contact support.
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: withdrawal approved
 */
const notifyWithdrawalApproved = async (telegramId, withdrawal) => {
  const message = `
✅ *Withdrawal Approved!*
━━━━━━━━━━━━━━━━━━━━
💸 Amount: *${formatUSDT(withdrawal.amount)}*
💳 Net Amount: *${formatUSDT(withdrawal.netAmount)}*
🏦 Wallet: \`${withdrawal.walletAddress}\`
${withdrawal.txHash ? `📋 TxHash: \`${withdrawal.txHash.substring(0, 16)}...\`` : ''}
📅 Date: ${formatDate(withdrawal.approvedAt || new Date())}
━━━━━━━━━━━━━━━━━━━━
Your withdrawal is being processed. ✈️
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: withdrawal rejected
 */
const notifyWithdrawalRejected = async (telegramId, withdrawal) => {
  const message = `
❌ *Withdrawal Rejected*
━━━━━━━━━━━━━━━━━━━━
💸 Amount: $${withdrawal.amount} USDT
🏦 Wallet: \`${withdrawal.walletAddress}\`
${withdrawal.rejectedReason ? `📝 Reason: ${withdrawal.rejectedReason}` : ''}
━━━━━━━━━━━━━━━━━━━━
Your balance has been restored.
If you have questions, contact support.
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: profit added
 */
const notifyProfitAdded = async (telegramId, profit) => {
  const message = `
📈 *Profit Added to Your Account!*
━━━━━━━━━━━━━━━━━━━━
💰 Profit Amount: *${formatUSDT(profit.amount)}*
${profit.description ? `📝 Note: ${profit.description}` : ''}
💵 New Balance: *${formatUSDT(profit.balanceAfter)}*
📅 Date: ${formatDate(new Date())}
━━━━━━━━━━━━━━━━━━━━
Keep growing with Growex Capital! 🚀
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: referral commission earned (multi-level)
 */
const notifyReferralCommission = async (telegramId, amount, level, rate, sourceName, eventType) => {
  const eventLabel = eventType === 'deposit' ? 'deposit' : 'staking profit';
  const message = `
👥 *Referral Income — Level ${level}*
━━━━━━━━━━━━━━━━━━━━
👤 From: *${sourceName}*
📊 Level ${level} Commission: *${rate}%*
💰 Earned: *${formatUSDT(amount)}*
📝 Source: ${eventLabel}
━━━━━━━━━━━━━━━━━━━━
Keep growing your team to unlock more levels!
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: daily staking profit credited
 */
const notifyStakingProfit = async (telegramId, profitAmount, stakedBalance) => {
  const message = `
📈 *Daily Staking Profit Credited!*
━━━━━━━━━━━━━━━━━━━━
🔒 Staked: *${formatUSDT(stakedBalance)}*
💰 Profit: *${formatUSDT(profitAmount)}* (0.60%/day)
💵 Added to withdrawable balance
━━━━━━━━━━━━━━━━━━━━
Withdraw anytime — no holiday, no limit!
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify user: referral bonus earned
 */
const notifyReferralBonus = async (telegramId, bonus, referredName) => {
  const message = `
👥 *Referral Bonus Earned!*
━━━━━━━━━━━━━━━━━━━━
🎉 *${referredName}* joined using your referral link!
💰 Bonus: *${formatUSDT(bonus)}*
━━━━━━━━━━━━━━━━━━━━
Keep referring to earn more! 💪
`.trim();

  return sendNotification(telegramId, message);
};

/**
 * Notify admin about new deposit
 */
const notifyAdminNewDeposit = async (adminId, user, deposit) => {
  const message = `
🔔 *New Deposit Request*
━━━━━━━━━━━━━━━━━━━━
👤 User: ${user.fullName} (@${user.username || 'N/A'})
🆔 Telegram ID: \`${user.telegramId}\`
💰 Amount: *${formatUSDT(deposit.amount)}*
📋 TxHash: \`${deposit.txHash}\`
📅 Date: ${formatDate(deposit.createdAt)}
━━━━━━━━━━━━━━━━━━━━
Use /deposits to manage.
`.trim();

  return sendNotification(adminId, message);
};

/**
 * Notify admin about new withdrawal
 */
const notifyAdminNewWithdrawal = async (adminId, user, withdrawal) => {
  const message = `
🔔 *New Withdrawal Request*
━━━━━━━━━━━━━━━━━━━━
👤 User: ${user.fullName} (@${user.username || 'N/A'})
🆔 Telegram ID: \`${user.telegramId}\`
💸 Amount: *${formatUSDT(withdrawal.amount)}*
💳 Net: ${formatUSDT(withdrawal.netAmount)}
🏦 Wallet: \`${withdrawal.walletAddress}\`
📅 Date: ${formatDate(withdrawal.createdAt)}
━━━━━━━━━━━━━━━━━━━━
Use /withdrawals to manage.
`.trim();

  return sendNotification(adminId, message);
};

/**
 * Broadcast message to multiple users
 */
const broadcastMessage = async (userIds, message) => {
  let sent = 0;
  let failed = 0;

  for (const telegramId of userIds) {
    const success = await sendNotification(telegramId, message);
    if (success) sent++;
    else failed++;
    // Respect Telegram rate limits: 30 messages/second
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return { sent, failed };
};

module.exports = {
  setBotInstance,
  sendNotification,
  notifyDepositApproved,
  notifyDepositRejected,
  notifyWithdrawalApproved,
  notifyWithdrawalRejected,
  notifyProfitAdded,
  notifyReferralBonus,
  notifyReferralCommission,
  notifyStakingProfit,
  notifyAdminNewDeposit,
  notifyAdminNewWithdrawal,
  broadcastMessage
};
