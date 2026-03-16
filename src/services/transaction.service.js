const { Op } = require('sequelize');
const { Transaction, User, Wallet } = require('../models');
const { getPagination, getPaginationMeta } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

class TransactionService {
  /**
   * Get transaction history for a user
   */
  async getTransactions(userId, query) {
    const { page, limit, offset } = getPagination(query.page, query.limit);

    const where = {
      [Op.or]: [
        { senderUserId: userId },
        { receiverUserId: userId },
      ],
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt[Op.gte] = new Date(query.startDate);
      if (query.endDate) where.createdAt[Op.lte] = new Date(query.endDate);
    }
    if (query.minAmount || query.maxAmount) {
      where.amount = {};
      if (query.minAmount) where.amount[Op.gte] = query.minAmount;
      if (query.maxAmount) where.amount[Op.lte] = query.maxAmount;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [
        {
          model: User, as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: User, as: 'receiver',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Wallet, as: 'senderWallet',
          attributes: ['id', 'walletId', 'currency'],
        },
        {
          model: Wallet, as: 'receiverWallet',
          attributes: ['id', 'walletId', 'currency'],
        },
      ],
      order: [[query.sortBy || 'created_at', query.sortOrder || 'DESC']],
      limit,
      offset,
    });

    return {
      transactions: rows,
      pagination: getPaginationMeta(count, page, limit),
    };
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(transactionId, userId) {
    const transaction = await Transaction.findOne({
      where: {
        id: transactionId,
        [Op.or]: [
          { senderUserId: userId },
          { receiverUserId: userId },
        ],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Wallet, as: 'senderWallet', attributes: ['id', 'walletId', 'currency'] },
        { model: Wallet, as: 'receiverWallet', attributes: ['id', 'walletId', 'currency'] },
      ],
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction by reference ID
   */
  async getTransactionByReference(referenceId, userId) {
    const transaction = await Transaction.findOne({
      where: {
        referenceId,
        [Op.or]: [
          { senderUserId: userId },
          { receiverUserId: userId },
        ],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
    });

    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction summary (for dashboard)
   */
  async getTransactionSummary(userId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalSent, totalReceived, totalBillPayments, recentTransactions] = await Promise.all([
      Transaction.sum('amount', {
        where: {
          senderUserId: userId,
          type: { [Op.in]: ['transfer', 'bill_payment', 'withdrawal'] },
          status: 'completed',
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }),
      Transaction.sum('amount', {
        where: {
          receiverUserId: userId,
          type: { [Op.in]: ['transfer', 'deposit'] },
          status: 'completed',
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }),
      Transaction.sum('amount', {
        where: {
          senderUserId: userId,
          type: 'bill_payment',
          status: 'completed',
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }),
      Transaction.count({
        where: {
          [Op.or]: [{ senderUserId: userId }, { receiverUserId: userId }],
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      period: 'last_30_days',
      totalSent: totalSent || 0,
      totalReceived: totalReceived || 0,
      totalBillPayments: totalBillPayments || 0,
      totalTransactions: recentTransactions,
      netFlow: (totalReceived || 0) - (totalSent || 0),
    };
  }

  /**
   * Admin: Get all transactions
   */
  async getAllTransactions(query) {
    const { page, limit, offset } = getPagination(query.page, query.limit);

    const where = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt[Op.gte] = new Date(query.startDate);
      if (query.endDate) where.createdAt[Op.lte] = new Date(query.endDate);
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'receiver', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [[query.sortBy || 'created_at', query.sortOrder || 'DESC']],
      limit,
      offset,
    });

    return {
      transactions: rows,
      pagination: getPaginationMeta(count, page, limit),
    };
  }
}

module.exports = new TransactionService();
