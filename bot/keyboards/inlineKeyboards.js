/**
 * Inline keyboards for interactive bot actions
 */

/**
 * Deposit confirmation keyboard
 */
const getDepositConfirmKeyboard = (depositId) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Confirm Deposit', callback_data: `confirm_deposit:${depositId}` },
        { text: '❌ Cancel', callback_data: 'cancel_deposit' }
      ]
    ]
  }
});

/**
 * Admin: approve or reject deposit
 */
const getAdminDepositKeyboard = (depositId) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `admin_approve_deposit:${depositId}` },
        { text: '❌ Reject', callback_data: `admin_reject_deposit:${depositId}` }
      ]
    ]
  }
});

/**
 * Admin: approve or reject withdrawal
 */
const getAdminWithdrawalKeyboard = (withdrawalId) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `admin_approve_withdrawal:${withdrawalId}` },
        { text: '❌ Reject', callback_data: `admin_reject_withdrawal:${withdrawalId}` }
      ]
    ]
  }
});

/**
 * Withdrawal confirmation keyboard
 */
const getWithdrawalConfirmKeyboard = (withdrawalId) => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ Confirm', callback_data: `confirm_withdrawal:${withdrawalId}` },
        { text: '❌ Cancel', callback_data: 'cancel_withdrawal' }
      ]
    ]
  }
});

/**
 * Back to main menu button
 */
const getBackToMenuKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
    ]
  }
});

/**
 * Pending deposits list keyboard for admin
 */
const getPendingDepositsKeyboard = (deposits) => {
  const buttons = deposits.map((d, i) => ([{
    text: `#${i + 1} - $${d.amount} USDT`,
    callback_data: `view_deposit:${d._id}`
  }]));

  return {
    reply_markup: {
      inline_keyboard: [
        ...buttons,
        [{ text: '🔙 Back', callback_data: 'admin_back' }]
      ]
    }
  };
};

/**
 * Pending withdrawals list keyboard for admin
 */
const getPendingWithdrawalsKeyboard = (withdrawals) => {
  const buttons = withdrawals.map((d, i) => ([{
    text: `#${i + 1} - $${d.amount} USDT`,
    callback_data: `view_withdrawal:${d._id}`
  }]));

  return {
    reply_markup: {
      inline_keyboard: [
        ...buttons,
        [{ text: '🔙 Back', callback_data: 'admin_back' }]
      ]
    }
  };
};

/**
 * Referral menu keyboard
 */
const getReferralKeyboard = (botUsername, referralCode) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '📋 Copy Referral Link', switch_inline_query: `https://t.me/${botUsername}?start=${referralCode}` }],
      [{ text: '📊 View Referral Stats', callback_data: 'referral_stats' }]
    ]
  }
});

/**
 * Support keyboard
 */
const getSupportKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '✉️ Send Message to Support', callback_data: 'contact_support' }]
    ]
  }
});

/**
 * Admin profit type keyboard
 */
const getProfitTypeKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💵 Fixed Amount', callback_data: 'profit_type:fixed' },
        { text: '📊 Percentage', callback_data: 'profit_type:percentage' }
      ],
      [{ text: '❌ Cancel', callback_data: 'cancel_profit' }]
    ]
  }
});

/**
 * Admin user management keyboard
 */
const getAdminUserKeyboard = (telegramId, isBanned) => ({
  reply_markup: {
    inline_keyboard: [
      [
        isBanned
          ? { text: '✅ Unban User', callback_data: `admin_unban:${telegramId}` }
          : { text: '🚫 Ban User', callback_data: `admin_ban:${telegramId}` }
      ],
      [
        { text: '💰 Add Balance', callback_data: `admin_add_balance:${telegramId}` },
        { text: '📈 Add Profit', callback_data: `admin_add_profit:${telegramId}` }
      ],
      [{ text: '🔙 Back', callback_data: 'admin_back' }]
    ]
  }
});

module.exports = {
  getDepositConfirmKeyboard,
  getAdminDepositKeyboard,
  getAdminWithdrawalKeyboard,
  getWithdrawalConfirmKeyboard,
  getBackToMenuKeyboard,
  getPendingDepositsKeyboard,
  getPendingWithdrawalsKeyboard,
  getReferralKeyboard,
  getSupportKeyboard,
  getProfitTypeKeyboard,
  getAdminUserKeyboard
};
