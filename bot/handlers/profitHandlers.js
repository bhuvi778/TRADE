const User = require('../../models/User');
const Profit = require('../../models/Profit');
const Transaction = require('../../models/Transaction');
const { getMainKeyboard } = require('../keyboards/mainKeyboard');
const { formatUSDT, formatDate } = require('../../utils/formatters');
const config = require('../../config/config');
const logger = require('../../utils/logger');

/**
 * Handle Profit History button
 */
const handleProfitHistory = async (bot, msg) => {
  const telegramId = String(msg.from.id);

  try {
    const user = await User.findOne({ telegramId });
    if (!user) return bot.sendMessage(msg.chat.id, '❌ Account not found.');

    const profits = await Profit.find({ telegramId })
      .sort({ createdAt: -1 })
      .limit(15);

    if (profits.length === 0) {
      return bot.sendMessage(msg.chat.id,
        `📈 *Profit History*\n\n📭 No profits recorded yet.\n\nMake a minimum $${config.staking.minInvestment} USDT deposit to start earning 0.60% daily staking profit!`,
        { parse_mode: 'Markdown', ...getMainKeyboard() }
      );
    }

    const profitLines = profits.map((p, i) => {
      const typeLabel = p.type === 'percentage' ? ` (${p.percentage}%)` : p.type === 'staking' ? ' (daily staking)' : '';
      return `*#${i + 1}* — +${formatUSDT(p.amount)}${typeLabel}\n   📝 ${p.description || 'Profit'}\n   📅 ${formatDate(p.createdAt)}`;
    }).join('\n\n');

    const text = `
📈 *Profit History*
━━━━━━━━━━━━━━━━━━━━
💰 Total Profits: *${formatUSDT(user.totalProfits)}*
━━━━━━━━━━━━━━━━━━━━

${profitLines}
`.trim();

    await bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in handleProfitHistory:', error);
    await bot.sendMessage(msg.chat.id, '❌ Error loading profit history.');
  }
};

module.exports = { handleProfitHistory };
