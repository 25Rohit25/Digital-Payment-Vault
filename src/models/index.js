const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const AuditLog = require('./AuditLog');
const OTP = require('./OTP');
const Notification = require('./Notification');

// ──── Associations ────

// User <-> Wallet (1:Many)
User.hasMany(Wallet, { foreignKey: 'userId', as: 'wallets' });
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Transaction (as sender)
User.hasMany(Transaction, { foreignKey: 'senderUserId', as: 'sentTransactions' });
Transaction.belongsTo(User, { foreignKey: 'senderUserId', as: 'sender' });

// User <-> Transaction (as receiver)
User.hasMany(Transaction, { foreignKey: 'receiverUserId', as: 'receivedTransactions' });
Transaction.belongsTo(User, { foreignKey: 'receiverUserId', as: 'receiver' });

// Wallet <-> Transaction (as sender wallet)
Wallet.hasMany(Transaction, { foreignKey: 'senderWalletId', as: 'outgoingTransactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'senderWalletId', as: 'senderWallet' });

// Wallet <-> Transaction (as receiver wallet)
Wallet.hasMany(Transaction, { foreignKey: 'receiverWalletId', as: 'incomingTransactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'receiverWalletId', as: 'receiverWallet' });

// User <-> AuditLog (1:Many)
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> OTP (1:Many)
User.hasMany(OTP, { foreignKey: 'userId', as: 'otps' });
OTP.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Notification (1:Many)
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  User,
  Wallet,
  Transaction,
  AuditLog,
  OTP,
  Notification,
};
