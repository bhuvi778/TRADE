const path = require('path');
const fs = require('fs');
const User = require('../../models/User');
const Deposit = require('../../models/Deposit');
const Transaction = require('../../models/Transaction');
const { getMainKeyboard, getCancelKeyboard } = require('../keyboards/mainKeyboard');
const { getAdminDepositKeyboard } = require('../keyboards/inlineKeyboards');
const { formatDeposit, formatDate } = require('../../utils/formatters');
const { validateDepositAmount, validateTxHash } = require('../../utils/validators');
const { notifyAdminNewDeposit } = require('../../services/notificationService');
const { setState, clearState, updateStateData, getState, STATES } = require('../stateManager');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * Handle Deposit button - start deposit flow
 */
const handleDepositStart = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found. Please use /start.');

    setState(telegramId, STATES.AWAITING_DEPOSIT_AMOUNT);

    const text = `
💰 *Deposit USDT*
━━━━━━━━━━━━━━━━━━━━
📌 *Deposit Address:*
\`${config.wallet.trc20Address}\`

🌐 Network: *${config.wallet.network}*

⚠️ *Important:*
• Only send USDT on BEP20 network (BSC)
• Minimum deposit/staking: $${config.deposit.minAmount} USDT
• No maximum limit

━━━━━━━━━━━━━━━━━━━━
Step 1: Enter the amount you are depositing:
`.trim();

    const qrPath = path.join(__dirname, '../../assets/deposit-qr.png');
    if (fs.existsSync(qrPath)) {
      await bot.sendPhoto(msg.chat.id, qrPath, {
        caption: `📱 *Scan to deposit USDT*\n\n🌐 Network: *${config.wallet.network}*\n📌 Address:\n\`${config.wallet.trc20Address}\``,
        parse_mode: 'Markdown'
      });
    }

    await bot.sendMessage(msg.chat.id, text, {
      parse_mode: 'Markdown',
      ...getCancelKeyboard()
    });
  } catch (error) {
    logger.error('Error in handleDepositStart:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error starting deposit flow.');
  }
};

/**
 * Handle deposit amount input
 */
const handleDepositAmount = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const input = msg.text?.trim();

  const validation = validateDepositAmount(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  updateStateData(telegramId, { amount: validation.value });
  setState(telegramId, STATES.AWAITING_DEPOSIT_TXHASH);

  await bot.sendMessage(msg.chat.id,
    `✅ Amount: *$${validation.value} USDT*\n\nStep 2: Please enter your *Transaction Hash (TxHash)* after sending the funds:\n\n_This is the 64-character hex code from your wallet/exchange._`,
    { parse_mode: 'Markdown', ...getCancelKeyboard() }
  );
};

/**
 * Handle deposit txhash input
 */
const handleDepositTxHash = async (bot, msg) => {
  const telegramId = String(msg.from.id);
  const input = msg.text?.trim();

  const validation = validateTxHash(input);
  if (!validation.valid) {
    return bot.sendMessage(msg.chat.id, validation.message, getCancelKeyboard());
  }

  const { data } = getState(telegramId);

  try {
    // Check for duplicate txHash
    const existing = await Deposit.findOne({ txHash: validation.value });
    if (existing) {
      clearState(telegramId);
      return bot.sendMessage(msg.chat.id,
        '❌ This transaction hash has already been submitted. If this is an error, contact support.',
        getMainKeyboard()
      );
    }

    const user = await User.findOne({ telegramId });

    const deposit = await Deposit.create({
      userId: user._id,
      telegramId,
      amount: data.amount,
      txHash: validation.value,
      network: config.wallet.network,
      status: 'pending'
    });

    clearState(telegramId);

    await bot.sendMessage(msg.chat.id,
      `✅ *Deposit Request Submitted!*\n\n💰 Amount: *$${data.amount} USDT*\n📋 TxHash: \`${validation.value.substring(0, 16)}...\`\n📊 Status: ⏳ Pending\n\nOur team will verify and approve your deposit shortly. You will receive a notification when processed.`,
      { parse_mode: 'Markdown', ...getMainKeyboard() }
    );

    // Notify all admins
    const adminIds = config.telegram.adminIds;
    for (const adminId of adminIds) {
      await notifyAdminNewDeposit(adminId, user, deposit);
    }

    logger.info(`Deposit request submitted: ${telegramId} - $${data.amount} - ${validation.value.substring(0, 16)}`);
  } catch (error) {
    if (error.code === 11000) {
      clearState(telegramId);
      return bot.sendMessage(msg.chat.id,
        '❌ This transaction hash has already been submitted.',
        getMainKeyboard()
      );
    }
    logger.error('Error creating deposit:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error submitting deposit. Please try again.');
  }
};

/**
 * Handle "My Deposits" / history view
 */
const handleDepositHistory = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    const deposits = await Deposit.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(10);

    if (deposits.length === 0) {
      return bot.sendMessage(msg.chat.id,
        '📭 *No deposits found.*\n\nMake your first deposit using the 💰 Deposit USDT button.',
        { parse_mode: 'Markdown', ...getMainKeyboard() }
      );
    }

    const list = deposits.map((d, i) => formatDeposit(d, i + 1)).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
    await bot.sendMessage(msg.chat.id,
      `📥 *Your Recent Deposits*\n\n━━━━━━━━━━━━━━━━━━━━\n\n${list}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Error in handleDepositHistory:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading deposit history.');
  }
};

module.exports = {
  handleDepositStart,
  handleDepositAmount,
  handleDepositTxHash,
  handleDepositHistory
};
