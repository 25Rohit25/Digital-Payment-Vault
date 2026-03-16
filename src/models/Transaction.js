const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('transactions', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  referenceId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'External-facing transaction reference',
  },
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'bill_payment', 'refund', 'fee'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'amount + fee',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  senderWalletId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'wallets',
      key: 'id',
    },
  },
  receiverWalletId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'wallets',
      key: 'id',
    },
  },
  senderUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  receiverUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional transaction data',
  },
  idempotencyKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Client-provided key for safe retries',
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  failureReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reversedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['reference_id'], unique: true },
    { fields: ['sender_wallet_id'] },
    { fields: ['receiver_wallet_id'] },
    { fields: ['sender_user_id'] },
    { fields: ['receiver_user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['idempotency_key'], unique: true, where: { idempotency_key: { [require('sequelize').Op.ne]: null } } },
    { fields: ['created_at'] },
  ],
});

module.exports = Transaction;
