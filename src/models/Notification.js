const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('notifications', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.ENUM(
      'transaction_received',
      'transaction_sent',
      'deposit_completed',
      'withdrawal_completed',
      'bill_payment',
      'low_balance',
      'security_alert',
      'kyc_update',
      'account_update',
      'system'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  channel: {
    type: DataTypes.ENUM('in_app', 'email', 'sms', 'push'),
    defaultValue: 'in_app',
  },
  sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['read'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Notification;
