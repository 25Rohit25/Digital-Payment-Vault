const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Create an audit log entry
   */
  async log({ userId, action, entity, entityId, details, ipAddress, userAgent, status = 'success' }) {
    try {
      await AuditLog.create({
        userId,
        action,
        entity,
        entityId,
        details,
        ipAddress,
        userAgent,
        status,
      });
    } catch (error) {
      // Audit logging should never break the main flow
      logger.error('Failed to create audit log:', error.message);
    }
  }

  /**
   * Get audit logs (admin)
   */
  async getLogs(query) {
    const { Op } = require('sequelize');
    const { getPagination, getPaginationMeta } = require('../utils/helpers');
    const { User } = require('../models');

    const { page, limit, offset } = getPagination(query.page, query.limit);

    const where = {};
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt[Op.gte] = new Date(query.startDate);
      if (query.endDate) where.createdAt[Op.lte] = new Date(query.endDate);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', query.sortOrder || 'DESC']],
      limit,
      offset,
    });

    return {
      logs: rows,
      pagination: getPaginationMeta(count, page, limit),
    };
  }
}

module.exports = new AuditService();
