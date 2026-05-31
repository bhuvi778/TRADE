const User = require('../../models/User');
const config = require('../../config/config');
const { getMainKeyboard, getCancelKeyboard } = require('../keyboards/mainKeyboard');
const { formatUSDT, formatDate, escapeMarkdown } = require('../../utils/formatters');
const { unstakeAmount, calculateDailyProfit } = require('../../services/stakingService');
const { setState, clearState, getState, STATES } = require('../stateManager');
const { formatAmount } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * Show staking plan details
 */
const handleStakingPlan = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found. Please use /start.');

    const dailyProfit = calculateDailyProfit(user.stakedBalance || 0);
    const withdrawable = user.walletBalance || 0;
    const staked = user.stakedBalance || 0;

    const text = `
🔒 *USDT Staking Plan*
━━━━━━━━━━━━━━━━━━━━
🌐 Network: *${config.wallet.network}*
📈 Daily Profit: *0.60% per day*
🎯 Double in ~4 months
💵 Min Investment: *$${config.staking.minInvestment} USDT*
💸 Withdraw: *Anytime (partial allowed)*
📊 Max Investment: *No limit*
⏱ Staking Period: *24 hours to 5 years*
🗓 Payouts: *Every day — no holiday*
━━━━━━━━━━━━━━━━━━━━
👤 Your Telegram ID: \`${user.telegramId}\`
🔗 Join by sharing your User ID or referral link
━━━━━━━━━━━━━━━━━━━━
📊 *Your Staking*
🔒 Staked: *${formatUSDT(staked)}*
💵 Withdrawable: *${formatUSDT(withdrawable)}*
📈 Est. Daily Profit: *${formatUSDT(dailyProfit)}*
${user.stakingStartedAt ? `📅 Started: ${formatDate(user.stakingStartedAt)}` : '_No active stake yet — deposit to start_'}
━━━━━━━━━━━━━━━━━━━━
💡 Profits go to withdrawable balance. Use 💸 Withdraw anytime.
To unstake principal, send: \`unstake AMOUNT\`
`.trim();

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown', ...getMainKeyboard() });
  } catch (error) {
    logger.error('Error in handleStakingPlan:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading staking plan.');
  }
};

/**
 * Start unstake flow
 */
const handleUnstakeStart = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    if (!user.stakedBalance || user.stakedBalance <= 0) {
      return bot.sendMessage(msg.chat.id, '❌ You have no staked balance to unstake.', getMainKeyboard());
    }

    setState(telegramId, STATES.AWAITING_UNSTAKE_AMOUNT, { stakedBalance: user.stakedBalance });

    await bot.sendMessage(msg.chat.id,
      `🔓 *Unstake USDT*\n━━━━━━━━━━━━━━━━━━━━\n🔒 Staked: *${formatUSDT(user.stakedBalance)}*\n💵 Withdrawable: *${formatUSDT(user.walletBalance)}*\n━━━━━━━━━━━━━━━━━━━━\nEnter amount to move to withdrawable balance:\n\n_(Min remaining stake: $${config.staking.minInvestment} or unstake all)_`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  } catch (error) {
    logger.error('Error in handleUnstakeStart:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error starting unstake.');
  }
};

/**
 * Handle unstake amount input
 */
const handleUnstakeAmount = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const input = msg.text?.trim();
  const amount = formatAmount(parseFloat(input));

  if (isNaN(amount) || amount <= 0) {
    return bot.sendMessage(msg.chat.id, '❌ Enter a valid amount.', getCancelKeyboard());
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    const result = await unstakeAmount(user, amount);
    clearState(telegramId);

    if (!result.success) {
      return bot.sendMessage(msg.chat.id, result.message, getCancelKeyboard());
    }

    await bot.sendMessage(msg.chat.id,
      `✅ *Unstaked Successfully!*\n\n🔓 Unstaked: *${formatUSDT(result.unstaked)}*\n🔒 Remaining Staked: *${formatUSDT(result.stakedAfter)}*\n💵 Withdrawable: *${formatUSDT(result.walletAfter)}*\n\nUse 💸 Withdraw to withdraw anytime.`,
      { parse_mode: 'Markdown', ...getMainKeyboard() }
    );
  } catch (error) {
    logger.error('Error in handleUnstakeAmount:', error);
    clearState(telegramId);
    await bot.sendMessage(msg.chat.id, '❌ Error processing unstake.', getMainKeyboard());
  }
};

module.exports = {
  handleStakingPlan,
  handleUnstakeStart,
  handleUnstakeAmount
};
