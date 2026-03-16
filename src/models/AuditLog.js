const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g., USER_LOGIN, WALLET_CREATED, TRANSFER_INITIATED',
  },
  entity: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g., user, wallet, transaction',
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSONB,
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
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success',
  },
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['entity'] },
    { fields: ['created_at'] },
  ],
  updatedAt: false, // Audit logs should never be updated
  paranoid: false,  // And never soft-deleted
});

module.exports = AuditLog;
