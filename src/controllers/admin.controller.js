const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendPaginated } = require('../utils/response');
const adminService = require('../services/admin.service');
const transactionService = require('../services/transaction.service');
const auditService = require('../services/audit.service');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard and management
 */

// ─── Users ─────────────────────────────────────────────
const getUsers = catchAsync(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  sendPaginated(res, result.users, result.pagination, 'Users retrieved');
});

const getUserById = catchAsync(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);
  sendSuccess(res, user);
});

const updateUserStatus = catchAsync(async (req, res) => {
  const user = await adminService.updateUserStatus(
    req.params.id, req.body.status, req.body.reason,
    req.user.id, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, user, `User status updated to ${req.body.status}`);
});

// ─── KYC ───────────────────────────────────────────────
const updateKycStatus = catchAsync(async (req, res) => {
  const user = await adminService.updateKycStatus(
    req.params.id, req.body.kycStatus, req.body.reason,
    req.user.id, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, user, `KYC status updated to ${req.body.kycStatus}`);
});

// ─── Wallets ───────────────────────────────────────────
const updateWalletStatus = catchAsync(async (req, res) => {
  const wallet = await adminService.updateWalletStatus(
    req.params.id, req.body.status, req.body.reason,
    req.user.id, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, wallet, `Wallet status updated to ${req.body.status}`);
});

const updateWalletLimits = catchAsync(async (req, res) => {
  const wallet = await adminService.updateWalletLimits(
    req.params.id, req.body,
    req.user.id, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, wallet, 'Wallet limits updated');
});

// ─── Transactions ──────────────────────────────────────
const getTransactions = catchAsync(async (req, res) => {
  const result = await transactionService.getAllTransactions(req.query);
  sendPaginated(res, result.transactions, result.pagination, 'Transactions retrieved');
});

// ─── Audit Logs ────────────────────────────────────────
const getAuditLogs = catchAsync(async (req, res) => {
  const result = await auditService.getLogs(req.query);
  sendPaginated(res, result.logs, result.pagination, 'Audit logs retrieved');
});

// ─── Statistics ────────────────────────────────────────
const getSystemStats = catchAsync(async (req, res) => {
  const stats = await adminService.getSystemStats();
  sendSuccess(res, stats, 'System statistics retrieved');
});

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  updateKycStatus,
  updateWalletStatus,
  updateWalletLimits,
  getTransactions,
  getAuditLogs,
  getSystemStats,
};
