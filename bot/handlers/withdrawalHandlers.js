const User = require('../../models/User');
const Withdrawal = require('../../models/Withdrawal');
const Transaction = require('../../models/Transaction');
const { getMainKeyboard, getCancelKeyboard } = require('../keyboards/mainKeyboard');
const { getAdminWithdrawalKeyboard } = require('../keyboards/inlineKeyboards');
const { formatWithdrawal, formatUSDT } = require('../../utils/formatters');
const { validateWithdrawalAmount, validateWalletAddress } = require('../../utils/validators');
const { calculateWithdrawalFee } = require('../../utils/helpers');
const { notifyAdminNewWithdrawal } = require('../../services/notificationService');
const { setState, clearState, updateStateData, getState, STATES } = require('../stateManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * Handle Withdraw button - start withdrawal flow
 */
const handleWithdrawStart = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found. Please use /start.');

    if (user.walletBalance < config.withdrawal.minAmount) {
      return bot.sendMessage(msg.chat.id,
        `❌ *Insufficient Balance*\n\nMinimum withdrawal is $${config.withdrawal.minAmount} USDT.\nYour balance: *${formatUSDT(user.walletBalance)}*`,
        { parse_mode: 'Markdown', ...getMainKeyboard() }
      );
    }

    setState(telegramId, STATES.AWAITING_WITHDRAW_AMOUNT, { balance: user.walletBalance });

    const feeInfo = config.withdrawal.feePercentage > 0
      ? `💸 Fee: ${config.withdrawal.feePercentage}% will be deducted`
      : '💸 No withdrawal fee';

    await bot.sendMessage(msg.chat.id,
      `💸 *Withdraw USDT*\n━━━━━━━━━━━━━━━━━━━━\n💵 Withdrawable Balance: *${formatUSDT(user.walletBalance)}*\n🔒 Staked (not withdrawable): *${formatUSDT(user.stakedBalance || 0)}*\n${feeInfo}\n📉 Minimum: $${config.withdrawal.minAmount}\n💡 Partial withdrawal anytime — no limit\n━━━━━━━━━━━━━━━━━━━━\nStep 1: Enter the amount you want to withdraw:`,
      { parse_mode: 'Markdown', ...getCancelKeyboard() }
    );
  } catch (error) {
    logger.error('Error in handleWithdrawStart:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error starting withdrawal flow.');
  }
};

/**
 * Handle withdrawal amount input
 */
const handleWithdrawAmount = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const { data } = getState(telegramId);
  const input = msg.text?.trim();

  const validation = validateWithdrawalAmount(input, data.balance);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  const { fee, netAmount } = calculateWithdrawalFee(validation.value);
  updateStateData(telegramId, { amount: validation.value, fee, netAmount });
  setState(telegramId, STATES.AWAITING_WITHDRAW_ADDRESS, { ...data, amount: validation.value, fee, netAmount });

  await bot.sendMessage(msg.chat.id,
    `✅ Amount: *${formatUSDT(validation.value)}*\n💸 Fee: ${formatUSDT(fee)} (${config.withdrawal.feePercentage}%)\n💵 You will receive: *${formatUSDT(netAmount)}*\n\nStep 2: Enter your *BEP20 USDT wallet address* to receive funds:`,
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

/**
 * Handle withdrawal wallet address input
 */
const handleWithdrawAddress = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const { data } = getState(telegramId);
  const input = msg.text?.trim();

  const validation = validateWalletAddress(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  try {
    // Re-check user balance before creating withdrawal
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    if (user.walletBalance < data.amount) {
      clearState(telegramId);
      return bot.sendMessage(msg.chat.id,
        `❌ Insufficient balance. Your current balance is ${formatUSDT(user.walletBalance)}.`,
        getMainKeyboard()
      );
    }

    // Deduct balance and create withdrawal
    const balanceBefore = user.walletBalance;
    const balanceAfter = parseFloat((balanceBefore - data.amount).toFixed(2));

    await User.findByIdAndUpdate(user._id, {
      $inc: {
        walletBalance: -data.amount,
        totalWithdrawals: data.amount
      }
    });

    const withdrawal = await Withdrawal.create({
      userId: user._id,
      telegramId,
      amount: data.amount,
      walletAddress: validation.value,
      fee: data.fee,
      netAmount: data.netAmount,
      status: 'pending'
    });

    // Create transaction record
    await Transaction.create({
      userId: user._id,
      telegramId,
      type: 'withdrawal',
      amount: data.amount,
      direction: 'debit',
      balanceBefore,
      balanceAfter,
      description: `Withdrawal to ${validation.value}`,
      referenceId: withdrawal._id,
      referenceModel: 'Withdrawal'
    });

    clearState(telegramId);

    await bot.sendMessage(msg.chat.id,
      `✅ *Withdrawal Request Submitted!*\n\n💸 Amount: *${formatUSDT(data.amount)}*\n💳 Net Amount: *${formatUSDT(data.netAmount)}*\n🏦 Wallet: \`${validation.value}\`\n📊 Status: ⏳ Pending\n\nOur team will process your withdrawal shortly.`,
      { parse_mode: 'Markdown', ...getMainKeyboard() }
    );

    // Notify admins
    for (const adminId of config.telegram.adminIds) {
      await notifyAdminNewWithdrawal(adminId, user, withdrawal);
    }

    logger.info(`Withdrawal request: ${telegramId} - ${formatUSDT(data.amount)} to ${validation.value}`);
  } catch (error) {
    logger.error('Error creating withdrawal:', error);
    clearState(telegramId);
    await bot.sendMessage(msg.chat.id, '❌ Error submitting withdrawal. Please try again.', getMainKeyboard());
  }
};

/**
 * Handle withdrawal history view
 */
const handleWithdrawalHistory = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const withdrawals = await Withdrawal.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(10);

    if (withdrawals.length === 0) {
      return bot.sendMessage(msg.chat.id,
        '📭 *No withdrawals found.*',
        { parse_mode: 'Markdown' }
      );
    }

    const list = withdrawals.map((w, i) => formatWithdrawal(w, i + 1)).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
    await bot.sendMessage(msg.chat.id,
      `📤 *Your Recent Withdrawals*\n\n━━━━━━━━━━━━━━━━━━━━\n\n${list}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in handleWithdrawalHistory:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading withdrawal history.');
  }
};

module.exports = {
  handleWithdrawStart,
  handleWithdrawAmount,
  handleWithdrawAddress,
  handleWithdrawalHistory
};
