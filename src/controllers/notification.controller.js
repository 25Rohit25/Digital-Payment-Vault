const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');
const notificationService = require('../services/notification.service');

const getNotifications = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await notificationService.getNotifications(req.user.id, parseInt(page) || 1, parseInt(limit) || 20);
  sendSuccess(res, result);
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  sendSuccess(res, notification, 'Notification marked as read');
});

const markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, result);
});

const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  sendSuccess(res, result);
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
