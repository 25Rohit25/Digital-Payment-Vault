const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('wallets', {
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
  walletId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Human-readable wallet identifier (WLT-XXXXX)',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      isIn: [['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD']],
    },
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
    },
  },
  availableBalance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Balance minus pending holds',
  },
  status: {
    type: DataTypes.ENUM('active', 'frozen', 'closed'),
    defaultValue: 'active',
    allowNull: false,
  },
  dailyLimit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 10000.00,
  },
  monthlyLimit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 50000.00,
  },
  dailySpent: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  monthlySpent: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  lastResetDaily: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  lastResetMonthly: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the primary wallet',
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Optimistic locking version',
  },
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['wallet_id'], unique: true },
    { fields: ['currency'] },
    { fields: ['status'] },
  ],
  version: true, // Optimistic locking
});

// Instance methods
Wallet.prototype.checkDailyLimit = function (amount) {
  const today = new Date().toISOString().split('T')[0];
  const spent = this.lastResetDaily === today ? parseFloat(this.dailySpent) : 0;
  return (spent + parseFloat(amount)) <= parseFloat(this.dailyLimit);
};

Wallet.prototype.checkMonthlyLimit = function (amount) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastResetMonth = this.lastResetMonthly ? this.lastResetMonthly.slice(0, 7) : null;
  const spent = lastResetMonth === currentMonth ? parseFloat(this.monthlySpent) : 0;
  return (spent + parseFloat(amount)) <= parseFloat(this.monthlyLimit);
};

Wallet.prototype.hasSufficientBalance = function (amount) {
  return parseFloat(this.availableBalance) >= parseFloat(amount);
};

module.exports = Wallet;
