const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'approve_deposit',
        'reject_deposit',
        'approve_withdrawal',
        'reject_withdrawal',
        'add_profit',
        'add_balance',
        'remove_balance',
        'ban_user',
        'unban_user',
        'broadcast_message',
        'view_users',
        'view_analytics',
        'view_deposits',
        'view_withdrawals',
        'add_admin'
      ]
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    targetTelegramId: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ adminId: 1, createdAt: -1 });

const AdminLog = mongoose.model('AdminLog', adminLogSchema);
module.exports = AdminLog;
