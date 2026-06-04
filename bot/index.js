const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');
const logger = require('../utils/logger');
const { setBotInstance } = require('../services/notificationService');
const { isAdminTelegramId } = require('../middleware/adminAuth');
const { getState, clearState, STATES } = require('./stateManager');
const { getMainKeyboard, getAdminKeyboard } = require('./keyboards/mainKeyboard');

// Handlers
const { handleStart, handleProfile, handleBalance, handleReferral, handleSupport, handleContactSupport, handleSupportMessage, handleAboutUs } = require('./handlers/userHandlers');
const { handleDepositStart, handleDepositAmount, handleDepositTxHash, handleDepositHistory } = require('./handlers/depositHandlers');
const { handleWithdrawStart, handleWithdrawAmount, handleWithdrawAddress, handleWithdrawalHistory } = require('./handlers/withdrawalHandlers');
const { handleProfitHistory } = require('./handlers/profitHandlers');
const { handleTransactions } = require('./handlers/transactionHandlers');
const { handleStakingPlan, handleUnstakeStart, handleUnstakeAmount } = require('./handlers/stakingHandlers');
const {
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
} = require('./handlers/adminHandlers');

let bot = null;

const initializeBot = () => {
  if (!config.telegram.botToken) {
    logger.error('TELEGRAM_BOT_TOKEN is not set!');
    process.exit(1);
  }

  bot = new TelegramBot(config.telegram.botToken, { polling: true });
  setBotInstance(bot);

  logger.info('Telegram bot started with polling');

  // ============================================================
  // COMMANDS
  // ============================================================

  bot.onText(/\/start(.*)/, (msg) => handleStart(bot, msg));
  bot.onText(/\/about/, (msg) => handleAboutUs(bot, msg));

  bot.onText(/\/help/, async (msg) => {
    const isAdmin = isAdminTelegramId(msg.from.id);
    const helpText = `
📖 *Help Guide*
━━━━━━━━━━━━━━━━━━━━
Available Commands:
/start — Start the bot
/help — Show this help
/profile — View your profile
/balance — Check balance
/deposit — Make a deposit
/withdraw — Request withdrawal
/transactions — View history
/referral — Referral system
/support — Contact support
${isAdmin ? '\n🔐 *Admin Commands*\n/users — Manage users\n/deposits — View deposits\n/withdrawals — View withdrawals\n/profits — Add profits\n/stats — Platform stats\n/broadcast — Send broadcast\n/banuser [id] — Ban a user\n/unbanuser [id] — Unban a user\n/manageuser [id] — Manage specific user' : ''}
━━━━━━━━━━━━━━━━━━━━
`.trim();

    await bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/cancel/, async (msg) => {
    const telegramId = String(msg.from.id);
    clearState(telegramId);
    const keyboard = isAdminTelegramId(telegramId) ? getAdminKeyboard() : getMainKeyboard();
    await bot.sendMessage(msg.chat.id, '❌ Cancelled. Back to main menu.', keyboard);
  });

  // Admin commands
  bot.onText(/\/users/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminUsers(bot, msg);
  });

  bot.onText(/\/deposits/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminDeposits(bot, msg);
  });

  bot.onText(/\/withdrawals/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminWithdrawals(bot, msg);
  });

  bot.onText(/\/profits/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminAddProfit(bot, msg);
  });

  bot.onText(/\/stats/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminStats(bot, msg);
  });

  bot.onText(/\/broadcast/, (msg) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    handleAdminBroadcast(bot, msg);
  });

  bot.onText(/\/banuser (.+)/, async (msg, match) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    await handleBanUser(bot, msg, match[1].trim());
  });

  bot.onText(/\/unbanuser (.+)/, async (msg, match) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    await handleUnbanUser(bot, msg, match[1].trim());
  });

  bot.onText(/\/manageuser (.+)/, async (msg, match) => {
    if (!isAdminTelegramId(msg.from.id)) return;
    await handleAdminViewUser(bot, msg.chat.id, match[1].trim());
  });

  // ============================================================
  // TEXT MESSAGE HANDLER (Menu Buttons + State Machine)
  // ============================================================

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const telegramId = String(msg.from.id);
    const text = msg.text.trim();
    const { state, data } = getState(telegramId);
    const adminUser = isAdminTelegramId(telegramId);

    // ---- Cancel ----
    if (text === '❌ Cancel') {
      clearState(telegramId);
      const keyboard = adminUser ? getAdminKeyboard() : getMainKeyboard();
      return bot.sendMessage(msg.chat.id, '❌ Cancelled. Back to main menu.', keyboard);
    }

    // ---- State-based routing ----
    if (state) {
      switch (state) {
        // User deposit flow
        case STATES.AWAITING_DEPOSIT_AMOUNT:
          return handleDepositAmount(bot, msg);
        case STATES.AWAITING_DEPOSIT_TXHASH:
          return handleDepositTxHash(bot, msg);

        // User withdrawal flow
        case STATES.AWAITING_WITHDRAW_AMOUNT:
          return handleWithdrawAmount(bot, msg);
        case STATES.AWAITING_WITHDRAW_ADDRESS:
          return handleWithdrawAddress(bot, msg);

        case STATES.AWAITING_UNSTAKE_AMOUNT:
          return handleUnstakeAmount(bot, msg);

        // Support
        case STATES.AWAITING_SUPPORT_MESSAGE:
          return handleSupportMessage(bot, msg);

        // Admin flows
        case STATES.ADMIN_AWAITING_BROADCAST:
          return handleAdminBroadcastMessage(bot, msg);
        case STATES.ADMIN_AWAITING_USER_ID:
          if (data.action === 'add_profit') return handleAdminAddProfitUserId(bot, msg);
          if (data.action === 'manage_balance') return handleAdminBalanceUserId(bot, msg);
          break;
        case STATES.ADMIN_AWAITING_ADD_PROFIT_AMOUNT:
          return handleAdminProfitAmountInput(bot, msg);
        case STATES.ADMIN_AWAITING_ADD_BALANCE_AMOUNT:
          return handleAdminBalanceAmountInput(bot, msg);

        default:
          break;
      }
    }

    // ---- Menu button routing (no active state) ----
    switch (text) {
      // User Menu
      case '💰 Deposit USDT':
        return handleDepositStart(bot, msg);
      case '📊 My Balance':
        return handleBalance(bot, msg);
      case '🔒 Staking Plan':
        return handleStakingPlan(bot, msg);
      case '📈 Profit History':
        return handleProfitHistory(bot, msg);
      case '💸 Withdraw':
        return handleWithdrawStart(bot, msg);
      case '🔓 Unstake':
        return handleUnstakeStart(bot, msg);
      case '📜 Transactions':
        return handleTransactions(bot, msg);
      case '👥 Referral System':
        return handleReferral(bot, msg);
      case '📞 Support':
        return handleSupport(bot, msg);
      case 'ℹ️ About Us':
        return handleAboutUs(bot, msg);
      case '⚙️ Profile':
        return handleProfile(bot, msg);

      // Admin Menu (only for admins)
      case '👥 Users':
        if (adminUser) return handleAdminUsers(bot, msg);
        break;
      case '💰 Deposits':
        if (adminUser) return handleAdminDeposits(bot, msg);
        break;
      case '💸 Withdrawals':
        if (adminUser) return handleAdminWithdrawals(bot, msg);
        break;
      case '📈 Add Profit':
        if (adminUser) return handleAdminAddProfit(bot, msg);
        break;
      case '📊 Statistics':
        if (adminUser) return handleAdminStats(bot, msg);
        break;
      case '📢 Broadcast':
        if (adminUser) return handleAdminBroadcast(bot, msg);
        break;
      case '⚙️ Manage Balance':
        if (adminUser) return handleAdminManageBalance(bot, msg);
        break;
      case '🔙 User Mode':
        if (adminUser) {
          return bot.sendMessage(msg.chat.id, '👤 Switched to user mode.', getMainKeyboard());
        }
        break;

      default:
        // Silently ignore unknown messages while in IDLE state
        break;
    }
  });

  // ============================================================
  // CALLBACK QUERY HANDLER (Inline keyboard buttons)
  // ============================================================

  bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const telegramId = String(callbackQuery.from.id);
    const data = callbackQuery.data;

    // Always answer callback to remove loading state
    await bot.answerCallbackQuery(callbackQuery.id).catch(() => {});

    const adminUser = isAdminTelegramId(telegramId);

    try {
      if (data === 'main_menu') {
        const keyboard = adminUser ? getAdminKeyboard() : getMainKeyboard();
        return bot.sendMessage(chatId, '🏠 Main menu:', keyboard);
      }

      if (data === 'admin_back') {
        return bot.sendMessage(chatId, '🔙 Back:', getAdminKeyboard());
      }

      if (data === 'contact_support') {
        return handleContactSupport(bot, chatId, telegramId);
      }

      if (data === 'about_read_more') {
        const { getAboutUsKeyboard } = require('./keyboards/inlineKeyboards');
        const { ABOUT_TEXT_FULL } = require('./handlers/userHandlers');
        await bot.editMessageText(ABOUT_TEXT_FULL, {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          ...getAboutUsKeyboard(true)
        }).catch(err => logger.error('Error expanding About text:', err));
        return;
      }

      if (data === 'about_show_less') {
        const { getAboutUsKeyboard } = require('./keyboards/inlineKeyboards');
        const { ABOUT_TEXT_SHORT } = require('./handlers/userHandlers');
        await bot.editMessageText(ABOUT_TEXT_SHORT, {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          ...getAboutUsKeyboard(false)
        }).catch(err => logger.error('Error collapsing About text:', err));
        return;
      }

      if (data === 'referral_stats') {
        // Just re-show referral
        return handleReferral(bot, { chat: { id: chatId }, from: callbackQuery.from, text: '👥 Referral System' });
      }

      if (data === 'cancel_deposit' || data === 'cancel_withdrawal' || data === 'cancel_profit') {
        clearState(telegramId);
        const keyboard = adminUser ? getAdminKeyboard() : getMainKeyboard();
        return bot.sendMessage(chatId, '❌ Cancelled.', keyboard);
      }

      // Admin: view specific deposit
      if (data.startsWith('view_deposit:')) {
        if (!adminUser) return;
        const depositId = data.split(':')[1];
        return handleViewDeposit(bot, chatId, depositId, telegramId);
      }

      // Admin: approve deposit
      if (data.startsWith('admin_approve_deposit:')) {
        if (!adminUser) return;
        const depositId = data.split(':')[1];
        return handleApproveDeposit(bot, chatId, depositId, telegramId);
      }

      // Admin: reject deposit
      if (data.startsWith('admin_reject_deposit:')) {
        if (!adminUser) return;
        const depositId = data.split(':')[1];
        return handleRejectDeposit(bot, chatId, depositId, telegramId);
      }

      // Admin: view withdrawal
      if (data.startsWith('view_withdrawal:')) {
        if (!adminUser) return;
        const withdrawalId = data.split(':')[1];
        return handleViewWithdrawal(bot, chatId, withdrawalId);
      }

      // Admin: approve withdrawal
      if (data.startsWith('admin_approve_withdrawal:')) {
        if (!adminUser) return;
        const withdrawalId = data.split(':')[1];
        return handleApproveWithdrawal(bot, chatId, withdrawalId, telegramId);
      }

      // Admin: reject withdrawal
      if (data.startsWith('admin_reject_withdrawal:')) {
        if (!adminUser) return;
        const withdrawalId = data.split(':')[1];
        return handleRejectWithdrawal(bot, chatId, withdrawalId, telegramId);
      }

      // Admin: profit type selection
      if (data.startsWith('profit_type:')) {
        if (!adminUser) return;
        const profitType = data.split(':')[1];
        return handleAdminProfitAmount(bot, chatId, telegramId, profitType);
      }

      // Admin: ban user
      if (data.startsWith('admin_ban:')) {
        if (!adminUser) return;
        const targetId = data.split(':')[1];
        return handleBanUser(bot, { chat: { id: chatId }, from: callbackQuery.from }, targetId);
      }

      // Admin: unban user
      if (data.startsWith('admin_unban:')) {
        if (!adminUser) return;
        const targetId = data.split(':')[1];
        return handleUnbanUser(bot, { chat: { id: chatId }, from: callbackQuery.from }, targetId);
      }

      // Admin: add balance from user keyboard
      if (data.startsWith('admin_add_balance:')) {
        if (!adminUser) return;
        const targetId = data.split(':')[1];
        // Pre-fill targetUserId context and go straight to balance amount
        const { setState, updateStateData } = require('./stateManager');
        const User = require('../models/User');
        const user = await User.findOne({ telegramId: targetId });
        if (!user) return bot.sendMessage(chatId, '❌ User not found.');

        const { setState: ss } = require('./stateManager');
        ss(telegramId, STATES.ADMIN_AWAITING_ADD_BALANCE_AMOUNT, {
          targetUserId: user._id,
          targetTelegramId: targetId,
          targetName: user.fullName,
          currentBalance: user.walletBalance
        });

        return bot.sendMessage(chatId,
          `👤 User: *${user.fullName}*\nBalance: *${user.walletBalance.toFixed(2)} USDT*\n\nEnter amount (positive to add, negative to deduct):`,
          { parse_mode: 'Markdown' }
        );
      }

      // Admin: add profit from user keyboard
      if (data.startsWith('admin_add_profit:')) {
        if (!adminUser) return;
        const targetId = data.split(':')[1];
        const User = require('../models/User');
        const { setState: ss } = require('./stateManager');
        const user = await User.findOne({ telegramId: targetId });
        if (!user) return bot.sendMessage(chatId, '❌ User not found.');

        ss(telegramId, STATES.ADMIN_AWAITING_PROFIT_TYPE, {
          action: 'add_profit',
          targetUserId: user._id,
          targetTelegramId: targetId,
          targetName: user.fullName
        });

        const { getProfitTypeKeyboard: ptk } = require('./keyboards/inlineKeyboards');
        return bot.sendMessage(chatId,
          `👤 User: *${user.fullName}*\nBalance: *${user.walletBalance.toFixed(2)} USDT*\n\nSelect profit type:`,
          { parse_mode: 'Markdown', ...ptk() }
        );
      }

    } catch (error) {
      logger.error(`Callback query error [${data}]:`, error);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again.');
    }
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  bot.on('polling_error', (error) => {
    logger.error('Telegram polling error:', error.message);
  });

  bot.on('webhook_error', (error) => {
    logger.error('Telegram webhook error:', error.message);
  });

  logger.info('Bot event handlers registered successfully');
  return bot;
};

const getBotInstance = () => bot;

module.exports = { initializeBot, getBotInstance };
