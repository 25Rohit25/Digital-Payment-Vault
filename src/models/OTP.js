const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('otps', {
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
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('email_verification', 'phone_verification', 'password_reset', 'transaction'),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['expires_at'] },
  ],
  paranoid: false,
});

OTP.prototype.isExpired = function () {
  return new Date() > this.expiresAt;
};

OTP.prototype.isMaxAttempts = function () {
  return this.attempts >= 5;
};

module.exports = OTP;
