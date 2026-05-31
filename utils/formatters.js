const { getRankEmoji, maskWalletAddress } = require('./helpers');

/**
 * Format a date to readable string
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC';
};

/**
 * Format amount with $ sign
 */
const formatUSDT = (amount) => {
  return `$${parseFloat(amount || 0).toFixed(2)} USDT`;
};

/**
 * Format status with emoji
 */
const formatStatus = (status) => {
  const map = {
    pending: '⏳ Pending',
    approved: '✅ Approved',
    rejected: '❌ Rejected',
    processing: '🔄 Processing'
  };
  return map[status] || status;
};

/**
 * Format transaction type with emoji
 */
const formatTxType = (type) => {
  const map = {
    deposit: '⬆️ Deposit',
    withdrawal: '⬇️ Withdrawal',
    profit: '📈 Profit',
    referral_bonus: '👥 Referral Bonus',
    referral_commission: '👥 Referral Income',
    staking_profit: '📈 Staking Profit',
    unstake: '🔓 Unstake',
    balance_adjustment: '⚙️ Admin Adjustment'
  };
  return map[type] || type;
};

/**
 * Format user profile message
 */
const formatUserProfile = (user) => {
  return `
👤 *Your Profile*
━━━━━━━━━━━━━━━━━━━━
🆔 ID: \`${user.telegramId}\`
👤 Name: ${escapeMarkdown(user.fullName)}
🏅 Rank: ${getRankEmoji(user.rank)} ${user.rank}
━━━━━━━━━━━━━━━━━━━━
💰 Balance: *${formatUSDT(user.walletBalance)}*
🔒 Staked: *${formatUSDT(user.stakedBalance || 0)}*
📥 Total Deposited: ${formatUSDT(user.totalDeposits)}
📤 Total Withdrawn: ${formatUSDT(user.totalWithdrawals)}
📈 Total Profits: ${formatUSDT(user.totalProfits)}
👥 Referral Earnings: ${formatUSDT(user.totalReferralEarnings)}
━━━━━━━━━━━━━━━━━━━━
🔗 Referral Code: \`${user.referralCode}\`
👥 Referrals: ${user.referralCount}
📅 Joined: ${formatDate(user.createdAt)}
━━━━━━━━━━━━━━━━━━━━
`.trim();
};

/**
 * Format balance message
 */
const formatBalance = (user) => {
  const staked = user.stakedBalance || 0;
  const withdrawable = user.walletBalance || 0;
  const dailyProfit = staked > 0 ? (staked * 0.006).toFixed(2) : '0.00';

  return `
💰 *Wallet & Staking Balance*
━━━━━━━━━━━━━━━━━━━━
🔒 Staked (earning 0.60%/day): *${formatUSDT(staked)}*
💵 Withdrawable: *${formatUSDT(withdrawable)}*
📈 Est. Daily Profit: *$${dailyProfit} USDT*
━━━━━━━━━━━━━━━━━━━━
📊 Summary
📥 Total Deposited: ${formatUSDT(user.totalDeposits)}
📤 Total Withdrawn: ${formatUSDT(user.totalWithdrawals)}
📈 Total Profits: ${formatUSDT(user.totalProfits)}
👥 Referral Earnings: ${formatUSDT(user.totalReferralEarnings)}
━━━━━━━━━━━━━━━━━━━━
🏅 Rank: ${getRankEmoji(user.rank)} *${user.rank}*
🆔 Your ID: \`${user.telegramId}\`
`.trim();
};

/**
 * Format deposit record
 */
const formatDeposit = (deposit, index) => {
  return `
${index ? `*#${index}*` : ''}
💰 Amount: *${formatUSDT(deposit.amount)}*
📋 TxHash: \`${deposit.txHash ? deposit.txHash.substring(0, 16) + '...' : 'N/A'}\`
📊 Status: ${formatStatus(deposit.status)}
📅 Date: ${formatDate(deposit.createdAt)}`.trim();
};

/**
 * Format withdrawal record
 */
const formatWithdrawal = (withdrawal, index) => {
  return `
${index ? `*#${index}*` : ''}
💸 Amount: *${formatUSDT(withdrawal.amount)}*
🏦 Wallet: \`${maskWalletAddress(withdrawal.walletAddress)}\`
💳 Net Amount: ${formatUSDT(withdrawal.netAmount)}
📊 Status: ${formatStatus(withdrawal.status)}
📅 Date: ${formatDate(withdrawal.createdAt)}`.trim();
};

/**
 * Format transaction record
 */
const formatTransaction = (tx, index) => {
  const arrow = tx.direction === 'credit' ? '📥' : '📤';
  const sign = tx.direction === 'credit' ? '+' : '-';
  return `${index}\\. ${arrow} ${formatTxType(tx.type)}\n   ${sign}${formatUSDT(tx.amount)} • ${formatDate(tx.createdAt)}`;
};

/**
 * Format admin user list entry
 */
const formatAdminUserEntry = (user, index) => {
  const status = user.isBanned ? '🚫 Banned' : '✅ Active';
  return `${index}. *${user.fullName}*\n   ID: ${user.telegramId} • ${status}\n   Balance: ${formatUSDT(user.walletBalance)} • Rank: ${user.rank}`;
};

/**
 * Escape markdown special characters for Telegram MarkdownV2
 */
const escapeMarkdown = (text) => {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
};

/**
 * Format analytics/stats message
 */
const formatStats = (stats) => {
  return `
📊 *Growex Capital Analytics*
━━━━━━━━━━━━━━━━━━━━
👥 Total Users: *${stats.totalUsers}*
✅ Active Users: ${stats.activeUsers}
🚫 Banned Users: ${stats.bannedUsers}
━━━━━━━━━━━━━━━━━━━━
💰 Total Deposited: *${formatUSDT(stats.totalDeposited)}*
💸 Total Withdrawn: *${formatUSDT(stats.totalWithdrawn)}*
📈 Total Profits Paid: *${formatUSDT(stats.totalProfits)}*
━━━━━━━━━━━━━━━━━━━━
⏳ Pending Deposits: ${stats.pendingDeposits}
⏳ Pending Withdrawals: ${stats.pendingWithdrawals}
━━━━━━━━━━━━━━━━━━━━
📅 As of: ${formatDate(new Date())}
`.trim();
};

module.exports = {
  formatDate,
  formatUSDT,
  formatStatus,
  formatTxType,
  formatUserProfile,
  formatBalance,
  formatDeposit,
  formatWithdrawal,
  formatTransaction,
  formatAdminUserEntry,
  escapeMarkdown,
  formatStats
};
