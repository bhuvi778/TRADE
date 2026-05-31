const User = require('../models/User');
const Referral = require('../models/Referral');
const ReferralCommission = require('../models/ReferralCommission');
const Transaction = require('../models/Transaction');
const { formatAmount } = require('../utils/helpers');
const { notifyReferralCommission } = require('./notificationService');
const logger = require('../utils/logger');
const config = require('../config/config');

const LEVEL_RATES = config.referral.levelRates;

/**
 * Max unlocked referral level based on active direct referrals
 * 1 direct → L1-L2 | 2 → L3 | 3 → L4 | 4 → L5 | 5+ → L6-L7
 */
const getMaxUnlockedLevel = (activeDirectCount) => {
  if (activeDirectCount >= 5) return 7;
  if (activeDirectCount >= 4) return 5;
  if (activeDirectCount >= 3) return 4;
  if (activeDirectCount >= 2) return 3;
  if (activeDirectCount >= 1) return 2;
  return 0;
};

/**
 * Process referral when a new user registers (by code or referrer Telegram ID)
 */
const processReferralRegistration = async (newUser, referralInput) => {
  try {
    if (!referralInput) return null;

    let referrer = null;
    const input = String(referralInput).trim().toUpperCase();

    if (/^\d+$/.test(referralInput.trim())) {
      referrer = await User.findOne({ telegramId: String(referralInput).trim() });
    } else {
      referrer = await User.findOne({ referralCode: input });
    }

    if (!referrer) {
      logger.warn(`Invalid referral input used: ${referralInput}`);
      return null;
    }

    if (String(referrer._id) === String(newUser._id)) {
      return null;
    }

    await User.findByIdAndUpdate(newUser._id, { referredBy: referrer._id });

    const referral = await Referral.create({
      referrerId: referrer._id,
      referredUserId: newUser._id,
      referralCode: referrer.referralCode,
      status: 'registered'
    });

    await User.findByIdAndUpdate(referrer._id, {
      $inc: { referralCount: 1 }
    });

    logger.info(`Referral registered: ${newUser.telegramId} referred by ${referrer.telegramId}`);
    return referral;
  } catch (error) {
    logger.error('Error processing referral registration:', error);
    return null;
  }
};

/**
 * Mark direct referral as active when referred user makes qualifying deposit
 */
const markDirectReferralActive = async (userId, depositAmount) => {
  try {
    if (depositAmount < config.referral.minDepositForBonus) return;

    const user = await User.findById(userId);
    if (!user || !user.referredBy) return;

    const referral = await Referral.findOne({
      referredUserId: userId,
      referrerId: user.referredBy
    });

    if (!referral || referral.hasQualifiedDeposit) return;

    await Referral.findByIdAndUpdate(referral._id, {
      hasQualifiedDeposit: true,
      depositAmount,
      status: 'deposited'
    });

    await User.findByIdAndUpdate(user.referredBy, {
      $inc: { activeDirectReferrals: 1 }
    });

    logger.info(`Active direct referral counted for referrer of user ${user.telegramId}`);
  } catch (error) {
    logger.error('Error marking direct referral active:', error);
  }
};

/**
 * Distribute multi-level referral commissions up the upline chain
 */
const distributeReferralCommissions = async (sourceUserId, baseAmount, eventType) => {
  try {
    if (baseAmount <= 0) return [];

    const sourceUser = await User.findById(sourceUserId);
    if (!sourceUser || !sourceUser.referredBy) return [];

    const payouts = [];
    let currentReferrerId = sourceUser.referredBy;

    for (let level = 1; level <= 7 && currentReferrerId; level++) {
      const referrer = await User.findById(currentReferrerId);
      if (!referrer) break;

      const maxLevel = getMaxUnlockedLevel(referrer.activeDirectReferrals || 0);
      if (level <= maxLevel) {
        const rate = LEVEL_RATES[level - 1];
        const commissionAmount = formatAmount((baseAmount * rate) / 100);

        if (commissionAmount > 0) {
          const balanceBefore = referrer.walletBalance;
          const balanceAfter = formatAmount(balanceBefore + commissionAmount);

          await User.findByIdAndUpdate(referrer._id, {
            $inc: {
              walletBalance: commissionAmount,
              totalReferralEarnings: commissionAmount
            }
          });

          await Transaction.create({
            userId: referrer._id,
            telegramId: referrer.telegramId,
            type: 'referral_commission',
            amount: commissionAmount,
            direction: 'credit',
            balanceBefore,
            balanceAfter,
            description: `Level ${level} referral (${rate}%) from ${sourceUser.fullName} - ${eventType}`
          });

          await ReferralCommission.create({
            referrerId: referrer._id,
            sourceUserId: sourceUser._id,
            level,
            baseAmount,
            commissionRate: rate,
            commissionAmount,
            eventType
          });

          await notifyReferralCommission(
            referrer.telegramId,
            commissionAmount,
            level,
            rate,
            sourceUser.fullName,
            eventType
          );

          payouts.push({ level, referrerId: referrer.telegramId, commissionAmount });
        }
      }

      currentReferrerId = referrer.referredBy;
    }

    return payouts;
  } catch (error) {
    logger.error('Error distributing referral commissions:', error);
    return [];
  }
};

/**
 * Process referral on deposit approval (replaces old single bonus)
 */
const processReferralBonus = async (userId, depositAmount) => {
  await markDirectReferralActive(userId, depositAmount);
  return distributeReferralCommissions(userId, depositAmount, 'deposit');
};

/**
 * Get referral statistics for a user
 */
const getReferralStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    const referrals = await Referral.find({ referrerId: userId })
      .populate('referredUserId', 'fullName username telegramId totalDeposits createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    const commissions = await ReferralCommission.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const earningsByLevel = [0, 0, 0, 0, 0, 0, 0];
    commissions.forEach((c) => {
      earningsByLevel[c.level - 1] += c.commissionAmount;
    });

    const maxLevel = getMaxUnlockedLevel(user?.activeDirectReferrals || 0);

    return {
      totalReferrals: user?.referralCount || 0,
      activeDirectReferrals: user?.activeDirectReferrals || 0,
      maxUnlockedLevel: maxLevel,
      totalBonusEarned: user?.totalReferralEarnings || 0,
      earningsByLevel,
      referrals,
      levelRates: LEVEL_RATES
    };
  } catch (error) {
    logger.error('Error getting referral stats:', error);
    return null;
  }
};

const getReferralUnlockInfo = () => {
  return [
    { directs: 1, levels: '1-2', rates: '3%, 2%' },
    { directs: 2, levels: '3', rates: '2%' },
    { directs: 3, levels: '4', rates: '1%' },
    { directs: 4, levels: '5', rates: '1%' },
    { directs: 5, levels: '6-7', rates: '0.5%, 0.5%' }
  ];
};

module.exports = {
  processReferralRegistration,
  processReferralBonus,
  distributeReferralCommissions,
  markDirectReferralActive,
  getReferralStats,
  getMaxUnlockedLevel,
  getReferralUnlockInfo,
  LEVEL_RATES
};
