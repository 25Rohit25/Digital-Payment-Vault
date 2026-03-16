const { Notification } = require('../models');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Create and send a notification
   */
  async notify(userId, { type, title, message, data, channel = 'in_app' }) {
    try {
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        channel,
        sent: true,
      });
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error.message);
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const unreadCount = await Notification.count({
      where: { userId, read: false },
    });

    return {
      notifications: rows,
      unreadCount,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );
    return { message: 'All notifications marked as read' };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    const count = await Notification.count({
      where: { userId, read: false },
    });
    return { unreadCount: count };
  }
}

module.exports = new NotificationService();
