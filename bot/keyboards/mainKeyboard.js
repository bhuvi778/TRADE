/**
 * Main reply keyboard for regular users
 */
const getMainKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '💰 Deposit USDT' }, { text: '📊 My Balance' }],
      [{ text: '🔒 Staking Plan' }, { text: '📈 Profit History' }],
      [{ text: '💸 Withdraw' }, { text: '🔓 Unstake' }],
      [{ text: '📜 Transactions' }, { text: '👥 Referral System' }],
      [{ text: '📞 Support' }, { text: '⚙️ Profile' }]
    ],
    resize_keyboard: true,
    persistent: true
  }
});

/**
 * Admin main keyboard
 */
const getAdminKeyboard = () => ({
  reply_markup: {
    keyboard: [
      [{ text: '👥 Users' }, { text: '💰 Deposits' }],
      [{ text: '💸 Withdrawals' }, { text: '📈 Add Profit' }],
      [{ text: '📊 Statistics' }, { text: '📢 Broadcast' }],
      [{ text: '⚙️ Manage Balance' }, { text: '🔙 User Mode' }]
    ],
    resize_keyboard: true,
    persistent: true
  }
});

/**
 * Remove keyboard
 */
const removeKeyboard = () => ({
  reply_markup: {
    remove_keyboard: true
  }
});

/**
 * Cancel keyboard
 */
const getCancelKeyboard = () => ({
  reply_markup: {
    keyboard: [[{ text: '❌ Cancel' }]],
    resize_keyboard: true,
    one_time_keyboard: true
  }
});

module.exports = {
  getMainKeyboard,
  getAdminKeyboard,
  removeKeyboard,
  getCancelKeyboard
};
