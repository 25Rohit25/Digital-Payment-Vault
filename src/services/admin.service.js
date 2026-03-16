const { Op, fn, col, literal } = require('sequelize');
const { User, Wallet, Transaction } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const logger = require('../utils/logger');

class AdminService {
  /**
   * Get all users with filters
   */
  async getUsers(query) {
    const { page, limit, offset } = getPagination(query.page, query.limit);

    const where = {};
    if (query.status) where.status = query.status;
    if (query.role) where.role = query.role;
    if (query.kycStatus) where.kycStatus = query.kycStatus;
    if (query.search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${query.search}%` } },
        { lastName: { [Op.iLike]: `%${query.search}%` } },
        { email: { [Op.iLike]: `%${query.search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Wallet, as: 'wallets' }],
      order: [[query.sortBy || 'created_at', query.sortOrder || 'DESC']],
      limit,
      offset,
    });

    return {
      users: rows,
      pagination: getPaginationMeta(count, page, limit),
    };
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: Wallet, as: 'wallets' }],
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  /**
   * Update user status (suspend/activate/deactivate)
   */
  async updateUserStatus(userId, status, reason, adminId, ipAddress, userAgent) {
    const user = await User.unscoped().findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.role === 'admin') {
      throw ApiError.forbidden('Cannot modify admin accounts');
    }

    const previousStatus = user.status;
    user.status = status;
    await user.save({ hooks: false });

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_USER_STATUS',
      entity: 'user',
      entityId: userId,
      details: { previousStatus, newStatus: status, reason },
      ipAddress,
      userAgent,
    });

    logger.info(`Admin ${adminId} changed user ${userId} status: ${previousStatus} → ${status}`);
    return user;
  }

  /**
   * Update KYC status
   */
  async updateKycStatus(userId, kycStatus, reason, adminId, ipAddress, userAgent) {
    const user = await User.unscoped().findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');

    const previousKycStatus = user.kycStatus;
    user.kycStatus = kycStatus;
    if (kycStatus === 'verified') {
      user.kycVerifiedAt = new Date();
    }
    await user.save({ hooks: false });

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_KYC_STATUS',
      entity: 'user',
      entityId: userId,
      details: { previousKycStatus, newStatus: kycStatus, reason },
      ipAddress,
      userAgent,
    });

    return user;
  }

  /**
   * Update wallet status (freeze/unfreeze)
   */
  async updateWalletStatus(walletId, status, reason, adminId, ipAddress, userAgent) {
    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) throw ApiError.notFound('Wallet not found');

    const previousStatus = wallet.status;
    wallet.status = status;
    await wallet.save();

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_WALLET_STATUS',
      entity: 'wallet',
      entityId: walletId,
      details: { previousStatus, newStatus: status, reason },
      ipAddress,
      userAgent,
    });

    return wallet;
  }

  /**
   * Update wallet limits
   */
  async updateWalletLimits(walletId, limits, adminId, ipAddress, userAgent) {
    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) throw ApiError.notFound('Wallet not found');

    const previousLimits = {
      dailyLimit: wallet.dailyLimit,
      monthlyLimit: wallet.monthlyLimit,
    };

    if (limits.dailyLimit !== undefined) wallet.dailyLimit = limits.dailyLimit;
    if (limits.monthlyLimit !== undefined) wallet.monthlyLimit = limits.monthlyLimit;
    await wallet.save();

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_WALLET_LIMITS',
      entity: 'wallet',
      entityId: walletId,
      details: { previousLimits, newLimits: limits },
      ipAddress,
      userAgent,
    });

    return wallet;
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingKyc,
      totalWallets,
      totalBalance,
      todayTransactions,
      todayVolume,
      monthlyTransactions,
      monthlyVolume,
      transactionsByType,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { status: 'active' } }),
      User.count({ where: { status: 'suspended' } }),
      User.count({ where: { kycStatus: 'pending' } }),
      Wallet.count(),
      Wallet.sum('balance'),
      Transaction.count({
        where: { createdAt: { [Op.gte]: today }, status: 'completed' },
      }),
      Transaction.sum('amount', {
        where: { createdAt: { [Op.gte]: today }, status: 'completed' },
      }),
      Transaction.count({
        where: { createdAt: { [Op.gte]: thirtyDaysAgo }, status: 'completed' },
      }),
      Transaction.sum('amount', {
        where: { createdAt: { [Op.gte]: thirtyDaysAgo }, status: 'completed' },
      }),
      Transaction.findAll({
        attributes: [
          'type',
          [fn('COUNT', col('id')), 'count'],
          [fn('SUM', col('amount')), 'totalAmount'],
        ],
        where: { status: 'completed', createdAt: { [Op.gte]: thirtyDaysAgo } },
        group: ['type'],
        raw: true,
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        pendingKyc,
      },
      wallets: {
        total: totalWallets,
        totalBalance: totalBalance || 0,
      },
      transactions: {
        today: { count: todayTransactions, volume: todayVolume || 0 },
        monthly: { count: monthlyTransactions, volume: monthlyVolume || 0 },
        byType: transactionsByType,
      },
    };
  }
}

module.exports = new AdminService();
