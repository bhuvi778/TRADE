const User = require('../../models/User');
const Deposit = require('../../models/Deposit');
const Withdrawal = require('../../models/Withdrawal');
const Profit = require('../../models/Profit');
const Transaction = require('../../models/Transaction');
const { getMainKeyboard, getAdminKeyboard, getCancelKeyboard } = require('../keyboards/mainKeyboard');
const {
  getAdminDepositKeyboard,
  getAdminWithdrawalKeyboard,
  getPendingDepositsKeyboard,
  getPendingWithdrawalsKeyboard,
  getAdminUserKeyboard,
  getProfitTypeKeyboard
} = require('../keyboards/inlineKeyboards');
const {
  formatUSDT, formatDate, formatStatus, formatStats,
  formatDeposit, formatWithdrawal, formatAdminUserEntry, escapeMarkdown
} = require('../../utils/formatters');
const {
  notifyDepositApproved, notifyDepositRejected,
  notifyWithdrawalApproved, notifyWithdrawalRejected,
  notifyProfitAdded, broadcastMessage
} = require('../../services/notificationService');
const { logAdminAction } = require('../../middleware/adminAuth');
const { getPlatformStats, getTopUsersByBalance, getTopReferrers } = require('../../services/analyticsService');
const { processReferralBonus } = require('../../services/referralService');
const { allocateDepositToStaking } = require('../../services/stakingService');
const { validateProfitAmount, validateBalanceAdjustment, validateBroadcastMessage } = require('../../utils/validators');
const { formatAmount } = require('../../utils/helpers');
const { getState, setState, clearState, updateStateData, STATES } = require('../stateManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// ============================================================
// Admin Menu Navigation
// ============================================================

const handleAdminMenu = async (bot, msg) => {
  await bot.sendMessage(msg.chat.id,
    '🔐 *Growex Capital — Admin Panel*\nChoose an option from the menu below:',
    { parse_mode: 'Markdown', ...getAdminKeyboard() }
  );
};

// ============================================================
// Users Management
// ============================================================

const handleAdminUsers = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(20);
    const totalUsers = await User.countDocuments();

    const list = users.map((u, i) => formatAdminUserEntry(u, i + 1)).join('\n\n');
    await bot.sendMessage(msg.chat.id,
      `👥 *User Management*\nTotal: ${totalUsers} users (showing last 20)\n\n━━━━━━━━━━━━━━━━━━━━\n\n${list}\n\n━━━━━━━━━━━━━━━━━━━━\nTo manage a user, use:\n/manageuser (telegramId)`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in handleAdminUsers:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading users.');
  }
};

// ============================================================
// Deposits Management
// ============================================================

const handleAdminDeposits = async (bot, msg) => {
  try {
    const pending = await Deposit.find({ status: 'pending' })
      .populate('userId', 'fullName username telegramId')
      .sort({ createdAt: -1 })
      .limit(20);

    if (pending.length === 0) {
      return bot.sendMessage(msg.chat.id, '✅ No pending deposits.', getAdminKeyboard());
    }

    await bot.sendMessage(msg.chat.id,
      `💰 *Pending Deposits* (${pending.length})\n\nSelect a deposit to review:`,
      { parse_mode: 'Markdown', ...getPendingDepositsKeyboard(pending) }
    );
  } catch (error) {
    logger.error('Error in handleAdminDeposits:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading deposits.');
  }
};

const handleViewDeposit = async (bot, chatId, depositId, adminTelegramId) => {
  try {
    const deposit = await Deposit.findById(depositId).populate('userId', 'fullName username telegramId walletBalance');
    if (!deposit) return bot.sendMessage(chatId, '❌ Deposit not found.');

    const user = deposit.userId;
    const text = `
💰 *Deposit Details*
━━━━━━━━━━━━━━━━━━━━
👤 User: ${escapeMarkdown(user.fullName)} (@${user.username || 'N/A'})
🆔 ID: \`${user.telegramId}\`
💰 Amount: *${formatUSDT(deposit.amount)}*
📋 TxHash: \`${deposit.txHash}\`
📊 Status: ${formatStatus(deposit.status)}
📅 Date: ${formatDate(deposit.createdAt)}
━━━━━━━━━━━━━━━━━━━━
`.trim();

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...getAdminDepositKeyboard(depositId)
    });
  } catch (error) {
    logger.error('Error in handleViewDeposit:', error);
    await bot.sendMessage(chatId, '❌ Error loading deposit.');
  }
};

const handleApproveDeposit = async (bot, chatId, depositId, adminTelegramId) => {
  try {
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return bot.sendMessage(chatId, '❌ Deposit not found.');
    if (deposit.status !== 'pending') return bot.sendMessage(chatId, '⚠️ This deposit is already processed.');

    const user = await User.findById(deposit.userId);
    if (!user) return bot.sendMessage(chatId, '❌ User not found.');

    if (deposit.amount < config.deposit.minAmount) {
      return bot.sendMessage(chatId, `❌ Deposit below minimum staking amount ($${config.deposit.minAmount} USDT). Reject or ask user to deposit more.`);
    }

    const stakedBefore = user.stakedBalance || 0;

    // Update deposit status
    deposit.status = 'approved';
    deposit.approvedBy = adminTelegramId;
    deposit.approvedAt = new Date();
    await deposit.save();

    // Allocate to staking balance
    const updatedUser = await allocateDepositToStaking(user, deposit.amount);
    const stakedAfter = updatedUser.stakedBalance;

    // Create transaction record
    await Transaction.create({
      userId: user._id,
      telegramId: user.telegramId,
      type: 'deposit',
      amount: deposit.amount,
      direction: 'credit',
      balanceBefore: stakedBefore,
      balanceAfter: stakedAfter,
      description: `Deposit approved & staked - TxHash: ${deposit.txHash}`,
      referenceId: deposit._id,
      referenceModel: 'Deposit',
      status: 'completed'
    });

    // Process multi-level referral commissions
    await processReferralBonus(user._id, deposit.amount);

    // Notify user
    await notifyDepositApproved(user.telegramId, deposit, updatedUser);

    // Log admin action
    await logAdminAction(adminTelegramId, 'approve_deposit', user._id, { depositId, amount: deposit.amount });

    await bot.sendMessage(chatId,
      `✅ *Deposit Approved & Staked!*\n\nUser: ${escapeMarkdown(user.fullName)}\nAmount: *${formatUSDT(deposit.amount)}*\nStaked Balance: *${formatUSDT(stakedAfter)}*\n\nUser has been notified.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`Admin ${adminTelegramId} approved deposit ${depositId} for user ${user.telegramId}`);
  } catch (error) {
    logger.error('Error in handleApproveDeposit:', error);
    await bot.sendMessage(chatId, '❌ Error approving deposit.');
  }
};

const handleRejectDeposit = async (bot, chatId, depositId, adminTelegramId) => {
  try {
    const deposit = await Deposit.findById(depositId);
    if (!deposit) return bot.sendMessage(chatId, '❌ Deposit not found.');
    if (deposit.status !== 'pending') return bot.sendMessage(chatId, '⚠️ This deposit is already processed.');

    deposit.status = 'rejected';
    deposit.approvedBy = adminTelegramId;
    deposit.approvedAt = new Date();
    await deposit.save();

    const user = await User.findById(deposit.userId);
    if (user) await notifyDepositRejected(user.telegramId, deposit);

    await logAdminAction(adminTelegramId, 'reject_deposit', deposit.userId, { depositId, amount: deposit.amount });

    await bot.sendMessage(chatId,
      `❌ *Deposit Rejected*\n\nAmount: ${formatUSDT(deposit.amount)}\nUser has been notified.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in handleRejectDeposit:', error);
    await bot.sendMessage(chatId, '❌ Error rejecting deposit.');
  }
};

// ============================================================
// Withdrawals Management
// ============================================================

const handleAdminWithdrawals = async (bot, msg) => {
  try {
    const pending = await Withdrawal.find({ status: 'pending' })
      .populate('userId', 'fullName username telegramId')
      .sort({ createdAt: -1 })
      .limit(20);

    if (pending.length === 0) {
      return bot.sendMessage(msg.chat.id, '✅ No pending withdrawals.', getAdminKeyboard());
    }

    await bot.sendMessage(msg.chat.id,
      `💸 *Pending Withdrawals* (${pending.length})\n\nSelect a withdrawal to review:`,
      { parse_mode: 'Markdown', ...getPendingWithdrawalsKeyboard(pending) }
    );
  } catch (error) {
    logger.error('Error in handleAdminWithdrawals:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading withdrawals.');
  }
};

const handleViewWithdrawal = async (bot, chatId, withdrawalId) => {
  try {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate('userId', 'fullName username telegramId');
    if (!withdrawal) return bot.sendMessage(chatId, '❌ Withdrawal not found.');

    const user = withdrawal.userId;
    const text = `
💸 *Withdrawal Details*
━━━━━━━━━━━━━━━━━━━━
👤 User: ${escapeMarkdown(user.fullName)} (@${user.username || 'N/A'})
🆔 ID: \`${user.telegramId}\`
💸 Amount: *${formatUSDT(withdrawal.amount)}*
💳 Net Amount: *${formatUSDT(withdrawal.netAmount)}*
🏦 Wallet: \`${withdrawal.walletAddress}\`
📊 Status: ${formatStatus(withdrawal.status)}
📅 Date: ${formatDate(withdrawal.createdAt)}
━━━━━━━━━━━━━━━━━━━━
`.trim();

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...getAdminWithdrawalKeyboard(withdrawalId)
    });
  } catch (error) {
    logger.error('Error in handleViewWithdrawal:', error);
    await bot.sendMessage(chatId, '❌ Error loading withdrawal.');
  }
};

const handleApproveWithdrawal = async (bot, chatId, withdrawalId, adminTelegramId) => {
  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return bot.sendMessage(chatId, '❌ Withdrawal not found.');
    if (withdrawal.status !== 'pending') return bot.sendMessage(chatId, '⚠️ Already processed.');

    withdrawal.status = 'approved';
    withdrawal.approvedBy = adminTelegramId;
    withdrawal.approvedAt = new Date();
    await withdrawal.save();

    const user = await User.findById(withdrawal.userId);
    if (user) await notifyWithdrawalApproved(user.telegramId, withdrawal);

    await logAdminAction(adminTelegramId, 'approve_withdrawal', withdrawal.userId, { withdrawalId, amount: withdrawal.amount });

    await bot.sendMessage(chatId,
      `✅ *Withdrawal Approved!*\n\nAmount: *${formatUSDT(withdrawal.amount)}*\nWallet: \`${withdrawal.walletAddress}\`\nUser has been notified.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`Admin ${adminTelegramId} approved withdrawal ${withdrawalId}`);
  } catch (error) {
    logger.error('Error in handleApproveWithdrawal:', error);
    await bot.sendMessage(chatId, '❌ Error approving withdrawal.');
  }
};

const handleRejectWithdrawal = async (bot, chatId, withdrawalId, adminTelegramId) => {
  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) return bot.sendMessage(chatId, '❌ Withdrawal not found.');
    if (withdrawal.status !== 'pending') return bot.sendMessage(chatId, '⚠️ Already processed.');

    // Refund the user's balance
    withdrawal.status = 'rejected';
    withdrawal.approvedBy = adminTelegramId;
    withdrawal.approvedAt = new Date();
    await withdrawal.save();

    const user = await User.findById(withdrawal.userId);
    if (user) {
      // Refund balance
      await User.findByIdAndUpdate(user._id, {
        $inc: { walletBalance: withdrawal.amount, totalWithdrawals: -withdrawal.amount }
      });

      const updatedUser = await User.findById(user._id);

      // Create refund transaction
      await Transaction.create({
        userId: user._id,
        telegramId: user.telegramId,
        type: 'withdrawal',
        amount: withdrawal.amount,
        direction: 'credit',
        balanceBefore: updatedUser.walletBalance - withdrawal.amount,
        balanceAfter: updatedUser.walletBalance,
        description: `Withdrawal rejected - refunded`,
        referenceId: withdrawal._id,
        referenceModel: 'Withdrawal',
        status: 'failed'
      });

      await notifyWithdrawalRejected(user.telegramId, withdrawal);
    }

    await logAdminAction(adminTelegramId, 'reject_withdrawal', withdrawal.userId, { withdrawalId });

    await bot.sendMessage(chatId,
      `❌ *Withdrawal Rejected*\n\nAmount: ${formatUSDT(withdrawal.amount)} has been refunded to user's balance.\nUser has been notified.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in handleRejectWithdrawal:', error);
    await bot.sendMessage(chatId, '❌ Error rejecting withdrawal.');
  }
};

// ============================================================
// Profit Management
// ============================================================

const handleAdminAddProfit = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  setState(telegramId, STATES.ADMIN_AWAITING_USER_ID, { action: 'add_profit' });

  await bot.sendMessage(msg.chat.id,
    '📈 *Add Profit*\n\nEnter the Telegram ID of the user to add profit to:\n\n_(Type /cancel to cancel)_',
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

const handleAdminAddProfitUserId = async (bot, msg) => {
  const adminTelegramId = String(msg.from.id);
  const targetId = msg.text?.trim();

  const user = await User.findOne({ telegramId: targetId });
  if (!user) {
    return bot.sendMessage(msg.chat.id, '❌ User not found. Please check the Telegram ID.', getCancelKeyboard());
  }

  updateStateData(adminTelegramId, { targetUserId: user._id, targetTelegramId: targetId, targetName: user.fullName });
  setState(adminTelegramId, STATES.ADMIN_AWAITING_PROFIT_TYPE, { action: 'add_profit', targetUserId: user._id, targetTelegramId: targetId, targetName: user.fullName });

  await bot.sendMessage(msg.chat.id,
    `👤 User: *${escapeMarkdown(user.fullName)}*\nBalance: *${formatUSDT(user.walletBalance)}*\n\nSelect profit type:`,
    { parse_mode: 'Markdown', ...getProfitTypeKeyboard() }
  );
};

const handleAdminProfitAmount = async (bot, chatId, adminTelegramId, profitType) => {
  const { data } = getState(adminTelegramId);
  updateStateData(adminTelegramId, { profitType });
  setState(adminTelegramId, STATES.ADMIN_AWAITING_ADD_PROFIT_AMOUNT, { ...data, profitType });

  const prompt = profitType === 'percentage'
    ? '📊 Enter profit percentage (e.g., 5 for 5%):'
    : '💵 Enter fixed profit amount in USDT:';

  await bot.sendMessage(chatId, prompt, getCancelKeyboard());
};

const handleAdminProfitAmountInput = async (bot, msg) => {
  const adminTelegramId = String(msg.from.id);
  const { data } = getState(adminTelegramId);
  const input = msg.text?.trim();

  const validation = validateProfitAmount(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  try {
    const user = await User.findById(data.targetUserId);
    if (!user) {
      clearState(adminTelegramId);
      return bot.sendMessage(msg.chat.id, '❌ User not found.', getAdminKeyboard());
    }

    let profitAmount = validation.value;
    let percentage = null;

    if (data.profitType === 'percentage') {
      percentage = validation.value;
      profitAmount = formatAmount((user.walletBalance * percentage) / 100);
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = formatAmount(balanceBefore + profitAmount);

    // Update user balance
    await User.findByIdAndUpdate(user._id, {
      $inc: { walletBalance: profitAmount, totalProfits: profitAmount }
    });

    // Create profit record
    const profit = await Profit.create({
      userId: user._id,
      telegramId: user.telegramId,
      amount: profitAmount,
      type: data.profitType,
      percentage,
      description: data.profitType === 'percentage' ? `${percentage}% profit on balance` : 'Manual profit added by admin',
      balanceBefore,
      balanceAfter,
      addedBy: adminTelegramId
    });

    // Create transaction record
    await Transaction.create({
      userId: user._id,
      telegramId: user.telegramId,
      type: 'profit',
      amount: profitAmount,
      direction: 'credit',
      balanceBefore,
      balanceAfter,
      description: profit.description,
      referenceId: profit._id,
      referenceModel: 'Profit'
    });

    // Notify user
    await notifyProfitAdded(user.telegramId, profit);

    // Log action
    await logAdminAction(adminTelegramId, 'add_profit', user._id, { profitAmount, profitType: data.profitType, percentage });

    clearState(adminTelegramId);

    await bot.sendMessage(msg.chat.id,
      `✅ *Profit Added!*\n\nUser: *${escapeMarkdown(user.fullName)}*\nProfit: *${formatUSDT(profitAmount)}*${percentage ? ` (${percentage}%)` : ''}\nNew Balance: *${formatUSDT(balanceAfter)}*\n\nUser has been notified.`,
      { parse_mode: 'Markdown', ...getAdminKeyboard() }
    );

    logger.info(`Admin ${adminTelegramId} added profit ${profitAmount} to user ${user.telegramId}`);
  } catch (error) {
    logger.error('Error in handleAdminProfitAmountInput:', error);
    clearState(adminTelegramId);
    await bot.sendMessage(msg.chat.id, '❌ Error adding profit.', getAdminKeyboard());
  }
};

// ============================================================
// Balance Management
// ============================================================

const handleAdminManageBalance = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  setState(telegramId, STATES.ADMIN_AWAITING_USER_ID, { action: 'manage_balance' });

  await bot.sendMessage(msg.chat.id,
    '⚙️ *Manage Balance*\n\nEnter the Telegram ID of the user:',
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

const handleAdminBalanceUserId = async (bot, msg) => {
  const adminTelegramId = String(msg.from.id);
  const targetId = msg.text?.trim();

  const user = await User.findOne({ telegramId: targetId });
  if (!user) {
    return bot.sendMessage(msg.chat.id, '❌ User not found.', getCancelKeyboard());
  }

  updateStateData(adminTelegramId, { targetUserId: user._id, targetTelegramId: targetId, targetName: user.fullName, currentBalance: user.walletBalance });
  setState(adminTelegramId, STATES.ADMIN_AWAITING_ADD_BALANCE_AMOUNT, { targetUserId: user._id, targetTelegramId: targetId, targetName: user.fullName, currentBalance: user.walletBalance });

  await bot.sendMessage(msg.chat.id,
    `👤 User: *${escapeMarkdown(user.fullName)}*\nCurrent Balance: *${formatUSDT(user.walletBalance)}*\n\nEnter amount to add (positive) or deduct (negative, e.g., -50):`,
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

const handleAdminBalanceAmountInput = async (bot, msg) => {
  const adminTelegramId = String(msg.from.id);
  const { data } = getState(adminTelegramId);
  const input = msg.text?.trim();

  const validation = validateBalanceAdjustment(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  try {
    const user = await User.findById(data.targetUserId);
    if (!user) {
      clearState(adminTelegramId);
      return bot.sendMessage(msg.chat.id, '❌ User not found.', getAdminKeyboard());
    }

    const adjustment = validation.value;
    const balanceBefore = user.walletBalance;
    const balanceAfter = formatAmount(Math.max(0, balanceBefore + adjustment));

    await User.findByIdAndUpdate(user._id, { walletBalance: balanceAfter });

    // Create transaction record
    await Transaction.create({
      userId: user._id,
      telegramId: user.telegramId,
      type: 'balance_adjustment',
      amount: Math.abs(adjustment),
      direction: adjustment >= 0 ? 'credit' : 'debit',
      balanceBefore,
      balanceAfter,
      description: `Balance adjustment by admin ${adminTelegramId}`
    });

    await logAdminAction(adminTelegramId, 'add_balance', user._id, { adjustment, balanceBefore, balanceAfter });

    clearState(adminTelegramId);

    const action = adjustment >= 0 ? 'added to' : 'deducted from';
    await bot.sendMessage(msg.chat.id,
      `✅ *Balance Updated!*\n\nUser: *${escapeMarkdown(user.fullName)}*\n${formatUSDT(Math.abs(adjustment))} ${action} account\nNew Balance: *${formatUSDT(balanceAfter)}*`,
      { parse_mode: 'Markdown', ...getAdminKeyboard() }
    );
  } catch (error) {
    logger.error('Error in handleAdminBalanceAmountInput:', error);
    clearState(adminTelegramId);
    await bot.sendMessage(msg.chat.id, '❌ Error updating balance.', getAdminKeyboard());
  }
};

// ============================================================
// Statistics
// ============================================================

const handleAdminStats = async (bot, msg) => {
  try {
    const stats = await getPlatformStats();
    const topUsers = await getTopUsersByBalance(5);

    const topUsersText = topUsers.map((u, i) =>
      `${i + 1}\\. ${escapeMarkdown(u.fullName)} — ${formatUSDT(u.walletBalance)}`
    ).join('\n');

    const statsText = formatStats(stats);
    const full = `${statsText}\n\n🏆 *Top 5 Users by Balance*\n${topUsersText}`;

    await bot.sendMessage(msg.chat.id, full, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleAdminStats:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading stats.');
  }
};

// ============================================================
// Broadcast
// ============================================================

const handleAdminBroadcast = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  setState(telegramId, STATES.ADMIN_AWAITING_BROADCAST);

  await bot.sendMessage(msg.chat.id,
    '📢 *Broadcast Message*\n\nType the message you want to send to all users:\n\n_(Type /cancel to cancel)_',
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

const handleAdminBroadcastMessage = async (bot, msg) => {
  const adminTelegramId = String(msg.from.id);
  const input = msg.text;

  const validation = validateBroadcastMessage(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  try {
    const users = await User.find({ isBanned: false }).select('telegramId');
    const telegramIds = users.map(u => u.telegramId);

    await bot.sendMessage(msg.chat.id, `📤 Broadcasting to ${telegramIds.length} users... Please wait.`);

    const broadcastText = `📢 *Growex Capital Announcement*\n━━━━━━━━━━━━━━━━━━━━\n${validation.value}`;
    const result = await broadcastMessage(telegramIds, broadcastText);

    clearState(adminTelegramId);
    await logAdminAction(adminTelegramId, 'broadcast_message', null, { message: validation.value.substring(0, 100), sent: result.sent, failed: result.failed });

    await bot.sendMessage(msg.chat.id,
      `✅ *Broadcast Complete!*\n\n✅ Sent: ${result.sent}\n❌ Failed: ${result.failed}\nTotal: ${telegramIds.length}`,
      { parse_mode: 'Markdown', ...getAdminKeyboard() }
    );
  } catch (error) {
    logger.error('Error in handleAdminBroadcastMessage:', error);
    clearState(adminTelegramId);
    await bot.sendMessage(msg.chat.id, '❌ Error sending broadcast.', getAdminKeyboard());
  }
};

// ============================================================
// Ban / Unban
// ============================================================

const handleBanUser = async (bot, msg, targetTelegramId) => {
  const adminTelegramId = String(msg.from.id);

  try {
    const user = await User.findOneAndUpdate(
      { telegramId: targetTelegramId },
      { isBanned: true, bannedAt: new Date(), bannedReason: 'Banned by admin' },
      { new: true }
    );

    if (!user) return bot.sendMessage(msg.chat.id, '❌ User not found.');

    await logAdminAction(adminTelegramId, 'ban_user', user._id, { targetTelegramId });

    await bot.sendMessage(msg.chat.id,
      `🚫 *User Banned*\n\n${escapeMarkdown(user.fullName)} has been banned.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`Admin ${adminTelegramId} banned user ${targetTelegramId}`);
  } catch (error) {
    logger.error('Error banning user:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error banning user.');
  }
};

const handleUnbanUser = async (bot, msg, targetTelegramId) => {
  const adminTelegramId = String(msg.from.id);

  try {
    const user = await User.findOneAndUpdate(
      { telegramId: targetTelegramId },
      { isBanned: false, bannedAt: null, bannedReason: null },
      { new: true }
    );

    if (!user) return bot.sendMessage(msg.chat.id, '❌ User not found.');

    await logAdminAction(adminTelegramId, 'unban_user', user._id, { targetTelegramId });

    await bot.sendMessage(msg.chat.id,
      `✅ *User Unbanned*\n\n${escapeMarkdown(user.fullName)} has been unbanned.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error unbanning user:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error unbanning user.');
  }
};

// ============================================================
// Manage User (inline)
// ============================================================

const handleAdminViewUser = async (bot, chatId, targetTelegramId) => {
  try {
    const user = await User.findOne({ telegramId: targetTelegramId });
    if (!user) return bot.sendMessage(chatId, '❌ User not found.');

    const text = `
👤 *User Details*
━━━━━━━━━━━━━━━━━━━━
🆔 Telegram ID: \`${user.telegramId}\`
👤 Name: ${escapeMarkdown(user.fullName)}
🏷️ Username: @${user.username || 'N/A'}
💰 Balance: *${formatUSDT(user.walletBalance)}*
📥 Deposited: ${formatUSDT(user.totalDeposits)}
📤 Withdrawn: ${formatUSDT(user.totalWithdrawals)}
📈 Profits: ${formatUSDT(user.totalProfits)}
🏅 Rank: ${user.rank}
📅 Joined: ${formatDate(user.createdAt)}
🚫 Banned: ${user.isBanned ? 'Yes' : 'No'}
━━━━━━━━━━━━━━━━━━━━
`.trim();

    await bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      ...getAdminUserKeyboard(targetTelegramId, user.isBanned)
    });
  } catch (error) {
    logger.error('Error in handleAdminViewUser:', error);
    await bot.sendMessage(chatId, '❌ Error loading user.');
  }
};

module.exports = {
  handleAdminMenu,
  handleAdminUsers,
  handleAdminDeposits,
  handleViewDeposit,
  handleApproveDeposit,
  handleRejectDeposit,
  handleAdminWithdrawals,
  handleViewWithdrawal,
  handleApproveWithdrawal,
  handleRejectWithdrawal,
  handleAdminAddProfit,
  handleAdminAddProfitUserId,
  handleAdminProfitAmount,
  handleAdminProfitAmountInput,
  handleAdminManageBalance,
  handleAdminBalanceUserId,
  handleAdminBalanceAmountInput,
  handleAdminStats,
  handleAdminBroadcast,
  handleAdminBroadcastMessage,
  handleBanUser,
  handleUnbanUser,
  handleAdminViewUser
};
