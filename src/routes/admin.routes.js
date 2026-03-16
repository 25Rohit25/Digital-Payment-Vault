const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const adminValidation = require('../validations/admin.validation');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// ─── Users ─────────────────────────────────────────────
router.get('/users', validate(adminValidation.adminUserQuery, 'query'), adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', validate(adminValidation.updateUserStatus), adminController.updateUserStatus);
router.put('/users/:id/kyc', validate(adminValidation.updateKycStatus), adminController.updateKycStatus);

// ─── Wallets ───────────────────────────────────────────
router.put('/wallets/:id/status', validate(adminValidation.updateWalletStatus), adminController.updateWalletStatus);
router.put('/wallets/:id/limits', validate(adminValidation.updateWalletLimits), adminController.updateWalletLimits);

// ─── Transactions ──────────────────────────────────────
router.get('/transactions', adminController.getTransactions);

// ─── Audit Logs ────────────────────────────────────────
router.get('/audit-logs', validate(adminValidation.auditLogQuery, 'query'), adminController.getAuditLogs);

// ─── Statistics ────────────────────────────────────────
router.get('/stats', adminController.getSystemStats);

module.exports = router;
