/**
 * In-memory user conversation state manager
 * Tracks multi-step conversation flows
 */

const userStates = new Map();

const STATES = {
  IDLE: null,
  // Deposit flow
  AWAITING_DEPOSIT_AMOUNT: 'AWAITING_DEPOSIT_AMOUNT',
  AWAITING_DEPOSIT_TXHASH: 'AWAITING_DEPOSIT_TXHASH',
  // Withdrawal flow
  AWAITING_WITHDRAW_AMOUNT: 'AWAITING_WITHDRAW_AMOUNT',
  AWAITING_WITHDRAW_ADDRESS: 'AWAITING_WITHDRAW_ADDRESS',
  AWAITING_WITHDRAW_CONFIRM: 'AWAITING_WITHDRAW_CONFIRM',
  AWAITING_UNSTAKE_AMOUNT: 'AWAITING_UNSTAKE_AMOUNT',
  // Support flow
  AWAITING_SUPPORT_MESSAGE: 'AWAITING_SUPPORT_MESSAGE',
  // Admin flows
  ADMIN_AWAITING_BROADCAST: 'ADMIN_AWAITING_BROADCAST',
  ADMIN_AWAITING_USER_ID: 'ADMIN_AWAITING_USER_ID',
  ADMIN_AWAITING_ADD_BALANCE_AMOUNT: 'ADMIN_AWAITING_ADD_BALANCE_AMOUNT',
  ADMIN_AWAITING_ADD_PROFIT_AMOUNT: 'ADMIN_AWAITING_ADD_PROFIT_AMOUNT',
  ADMIN_AWAITING_PROFIT_PERCENTAGE: 'ADMIN_AWAITING_PROFIT_PERCENTAGE',
  ADMIN_AWAITING_PROFIT_TYPE: 'ADMIN_AWAITING_PROFIT_TYPE',
  ADMIN_AWAITING_REJECT_REASON: 'ADMIN_AWAITING_REJECT_REASON',
  ADMIN_AWAITING_BAN_REASON: 'ADMIN_AWAITING_BAN_REASON'
};

/**
 * Get user state
 */
const getState = (telegramId) => {
  return userStates.get(String(telegramId)) || { state: STATES.IDLE, data: {} };
};

/**
 * Set user state
 */
const setState = (telegramId, state, data = {}) => {
  userStates.set(String(telegramId), { state, data });
};

/**
 * Clear user state (back to idle)
 */
const clearState = (telegramId) => {
  userStates.delete(String(telegramId));
};

/**
 * Update state data without changing state
 */
const updateStateData = (telegramId, newData) => {
  const current = getState(telegramId);
  userStates.set(String(telegramId), {
    state: current.state,
    data: { ...current.data, ...newData }
  });
};

// Clean up stale states every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userStates.entries()) {
    if (value.timestamp && now - value.timestamp > 30 * 60 * 1000) {
      userStates.delete(key);
    }
  }
}, 30 * 60 * 1000);

module.exports = { STATES, getState, setState, clearState, updateStateData };
