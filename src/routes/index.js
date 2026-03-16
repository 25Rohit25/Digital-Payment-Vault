const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const walletRoutes = require('./wallet.routes');
const transactionRoutes = require('./transaction.routes');
const userRoutes = require('./user.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/user', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
