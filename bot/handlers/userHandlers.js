const User = require('../../models/User');
const { getMainKeyboard, getAdminKeyboard } = require('../keyboards/mainKeyboard');
const { getReferralKeyboard, getSupportKeyboard } = require('../keyboards/inlineKeyboards');
const { formatUserProfile, formatBalance, escapeMarkdown } = require('../../utils/formatters');
const { processReferralRegistration, getReferralStats, getReferralUnlockInfo } = require('../../services/referralService');
const { isAdminTelegramId } = require('../../middleware/adminAuth');
const { clearState, setState, STATES } = require('../stateManager');
const { sendNotification } = require('../../services/notificationService');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * Handle /start command
 */
const handleStart = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'User';
  const username = msg.from.username || null;

  // Extract referral code or referrer Telegram ID from /start PARAM
  let referralCode = null;
  const startParam = msg.text?.split(' ')[1];
  if (startParam) {
    referralCode = startParam.trim();
  }

  try {
    let user = await User.findOne({ telegramId });
    let isNew = false;

    if (!user) {
      user = await User.create({
        telegramId,
        username,
        fullName
      });
      isNew = true;

      // Process referral if code provided
      if (referralCode) {
        await processReferralRegistration(user, referralCode);
      }

      logger.info(`New user registered: ${telegramId} (${fullName})`);
    } else {
      // Update username/fullName if changed
      await User.findByIdAndUpdate(user._id, {
        username,
        fullName,
        lastActivity: new Date()
      });
    }

    if (user.isBanned) {
      await bot.sendMessage(msg.chat.id, '🚫 Your account has been suspended. Contact support for assistance.');
      return;
    }

    const isAdmin = isAdminTelegramId(telegramId);
    const keyboard = isAdmin ? getAdminKeyboard() : getMainKeyboard();

    const welcomeMsg = isNew
      ? `🎉 *Welcome to Growex Capital!*\n\nHello *${fullName}*!\n\n🔒 *USDT BEP20 Staking Plan*\n• 0.60% profit per day\n• Min investment: $10 USDT\n• Withdraw anytime (partial allowed)\n• No income limit • No holiday\n\n🆔 Your ID: \`${user.telegramId}\`\nShare your ID or referral link to invite others.\n\nYour referral code: \`${user.referralCode}\``
      : `👋 *Welcome back, ${fullName}!*\n\n🔒 Staked: *$${(user.stakedBalance || 0).toFixed(2)} USDT*\n💵 Withdrawable: *$${user.walletBalance.toFixed(2)} USDT*\n\nUse the menu below to manage your account.`;

    await bot.sendMessage(msg.chat.id, welcomeMsg, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    if (isNew && isAdmin) {
      await bot.sendMessage(msg.chat.id, '🔐 *Growex Capital — Admin Access Detected*\nYou have administrator privileges.', {
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    logger.error(`Error in handleStart for ${telegramId}:`, error);
    await bot.sendMessage(msg.chat.id, '❌ An error occurred. Please try again.', getMainKeyboard());
  }
};

/**
 * Handle Profile button
 */
const handleProfile = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found. Please use /start.');

    const profileText = formatUserProfile(user);
    await bot.sendMessage(msg.chat.id, profileText, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleProfile:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading profile.');
  }
};

/**
 * Handle My Balance button
 */
const handleBalance = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found. Please use /start.');

    const balanceText = formatBalance(user);
    await bot.sendMessage(msg.chat.id, balanceText, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleBalance:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading balance.');
  }
};

/**
 * Handle Referral System button
 */
const handleReferral = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    const botUsername = config.telegram.botUsername;
    const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

    const stats = await getReferralStats(user._id);
    const unlockInfo = getReferralUnlockInfo();

    const levelLines = stats.levelRates.map((rate, i) => {
      const earned = stats.earningsByLevel[i] || 0;
      const unlocked = (i + 1) <= stats.maxUnlockedLevel ? '✅' : '🔒';
      return `${unlocked} L${i + 1}: *${rate}%* — Earned: $${earned.toFixed(2)}`;
    }).join('\n');

    const unlockLines = unlockInfo.map((u) =>
      `• ${u.directs} direct${u.directs > 1 ? 's' : ''} → Level ${u.levels} (${u.rates})`
    ).join('\n');

    const text = `
👥 *Referral Income System*
━━━━━━━━━━━━━━━━━━━━
🔗 Referral Link:
\`${referralLink}\`
🆔 Or share your User ID: \`${user.telegramId}\`
━━━━━━━━━━━━━━━━━━━━
📊 *Your Stats*
👥 Total Referrals: *${user.referralCount}*
✅ Active Directs: *${stats.activeDirectReferrals}*
🔓 Unlocked Levels: *${stats.maxUnlockedLevel}/7*
💰 Total Earnings: *$${user.totalReferralEarnings.toFixed(2)} USDT*
━━━━━━━━━━━━━━━━━━━━
📈 *Level Income (Total 10%)*
${levelLines}
━━━━━━━━━━━━━━━━━━━━
🔐 *Level Unlock Rules*
${unlockLines}
━━━━━━━━━━━━━━━━━━━━
💡 Earn on team deposits & daily staking profits!
`.trim();

    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'Markdown',
      ...getReferralKeyboard(botUsername, user.referralCode)
    });
  } catch (error) {
    logger.error('Error in handleReferral:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading referral system.');
  }
};

/**
 * Handle Support button
 */
const handleSupport = async (bot, msg) => {
  const text = `
📞 *Growex Capital Support*
━━━━━━━━━━━━━━━━━━━━
We are here to help you 24/7!

You can:
• Send us a message below
• Expect a reply within a few hours

Click the button below to send a message to our support team.
`.trim();

  await bot.sendMessage(msg.chat.id, text, {
    parse_mode: 'Markdown',
    ...getSupportKeyboard()
  });
};

/**
 * Handle contact support callback
 */
const handleContactSupport = async (bot, chatId, telegramId) => {
  setState(telegramId, STATES.AWAITING_SUPPORT_MESSAGE);
  await bot.sendMessage(chatId, '✉️ *Send Support Message*\n\nPlease type your message and we will get back to you shortly:\n\n_(Type /cancel to cancel)_', {
    parse_mode: 'Markdown'
  });
};

/**
 * Handle support message submission
 */
const handleSupportMessage = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const message = msg.text;

  const adminIds = config.telegram.adminIds;
  const user = await User.findOne({ telegramId });

  const adminMsg = `
📩 *New Support Message*
━━━━━━━━━━━━━━━━━━━━
👤 From: ${escapeMarkdown(user?.fullName || 'Unknown')}
🆔 ID: \`${telegramId}\`
@${user?.username || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
📝 Message:
${escapeMarkdown(message)}
━━━━━━━━━━━━━━━━━━━━
  `.trim();

  let sent = 0;
  for (const adminId of adminIds) {
    const success = await sendNotification(adminId, adminMsg);
    if (success) sent++;
  }

  clearState(telegramId);
  await bot.sendMessage(msg.chat.id,
    '✅ *Message Sent!*\n\nYour support request has been submitted. Our team will contact you soon.',
    { parse_mode: 'Markdown', ...getMainKeyboard() }
  );
};

module.exports = {
  handleStart,
  handleProfile,
  handleBalance,
  handleReferral,
  handleSupport,
  handleContactSupport,
  handleSupportMessage
};
