const Transaction = require('../../models/Transaction');
const { getMainKeyboard } = require('../keyboards/mainKeyboard');
const { formatTransaction, formatUSDT } = require('../../utils/formatters');
const logger = require('../../utils/logger');

/**
 * Handle Transactions button
 */
const handleTransactions = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const transactions = await Transaction.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(15);

    if (transactions.length === 0) {
      return bot.sendMessage(msg.chat.id,
        '📜 *Transaction History*\n\n📭 No transactions yet.\n\nMake your first deposit to get started!',
        { parse_mode: 'Markdown', ...getMainKeyboard() }
      );
    }

    const txLines = transactions.map((tx, i) => formatTransaction(tx, i + 1)).join('\n\n');

    const creditTotal = transactions
      .filter(t => t.direction === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const debitTotal = transactions
      .filter(t => t.direction === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const text = `
📜 *Transaction History* (last 15)
━━━━━━━━━━━━━━━━━━━━
📥 Total In: +${formatUSDT(creditTotal)}
📤 Total Out: -${formatUSDT(debitTotal)}
━━━━━━━━━━━━━━━━━━━━

${txLines}
`.trim();

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleTransactions:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading transactions.');
  }
};

module.exports = { handleTransactions };
