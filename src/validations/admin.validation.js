const Joi = require('joi');

const adminUserQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'suspended', 'pending_verification', 'deactivated').optional(),
  role: Joi.string().valid('user', 'admin').optional(),
  kycStatus: Joi.string().valid('none', 'pending', 'verified', 'rejected').optional(),
  search: Joi.string().max(255).optional(),
  sortBy: Joi.string().valid('created_at', 'email', 'first_name').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

const updateUserStatus = Joi.object({
  status: Joi.string().valid('active', 'suspended', 'deactivated').required(),
  reason: Joi.string().max(500).optional(),
});

const updateKycStatus = Joi.object({
  kycStatus: Joi.string().valid('verified', 'rejected').required(),
  reason: Joi.string().max(500).optional(),
});

const updateWalletStatus = Joi.object({
  status: Joi.string().valid('active', 'frozen').required(),
  reason: Joi.string().max(500).optional(),
});

const updateWalletLimits = Joi.object({
  dailyLimit: Joi.number().positive().max(1000000).optional(),
  monthlyLimit: Joi.number().positive().max(10000000).optional(),
});

const auditLogQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  action: Joi.string().max(100).optional(),
  entity: Joi.string().max(50).optional(),
  userId: Joi.string().uuid().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

module.exports = {
  adminUserQuery,
  updateUserStatus,
  updateKycStatus,
  updateWalletStatus,
  updateWalletLimits,
  auditLogQuery,
};
