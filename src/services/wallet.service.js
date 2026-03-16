const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Wallet, Transaction, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateReference, generateWalletId } = require('../utils/helpers');
const config = require('../config');
const auditService = require('./audit.service');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

class WalletService {
  /**
   * Get user's wallets
   */
  async getWallets(userId) {
    const wallets = await Wallet.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
    });
    return wallets;
  }

  /**
   * Get specific wallet by ID
   */
  async getWalletById(walletId, userId) {
    const wallet = await Wallet.findOne({
      where: { id: walletId, userId },
    });
    if (!wallet) {
      throw ApiError.notFound('Wallet not found');
    }
    return wallet;
  }

  /**
   * Get wallet by human-readable wallet ID
   */
  async getWalletByWalletId(walletId) {
    const wallet = await Wallet.findOne({
      where: { walletId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });
    return wallet;
  }

  /**
   * Get default wallet for a user
   */
  async getDefaultWallet(userId) {
    let wallet = await Wallet.findOne({
      where: { userId, isDefault: true },
    });
    if (!wallet) {
      wallet = await Wallet.findOne({
        where: { userId },
        order: [['createdAt', 'ASC']],
      });
    }
    if (!wallet) {
      throw ApiError.notFound('No wallet found for this user');
    }
    return wallet;
  }

  /**
   * Create additional wallet (different currency)
   */
  async createWallet(userId, currency, ipAddress, userAgent) {
    // Check if user already has a wallet in this currency
    const existing = await Wallet.findOne({
      where: { userId, currency },
    });
    if (existing) {
      throw ApiError.conflict(`You already have a ${currency} wallet`);
    }

    const wallet = await Wallet.create({
      userId,
      walletId: generateWalletId(),
      currency,
      dailyLimit: config.wallet.defaultDailyLimit,
      monthlyLimit: config.wallet.defaultMonthlyLimit,
    });

    await auditService.log({
      userId,
      action: 'WALLET_CREATED',
      entity: 'wallet',
      entityId: wallet.id,
      details: { currency, walletId: wallet.walletId },
      ipAddress,
      userAgent,
    });

    return wallet;
  }

  /**
   * Deposit money into wallet
   */
  async deposit(userId, walletId, amount, description, paymentMethod, idempotencyKey, ipAddress, userAgent) {
    // Check idempotency
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ where: { idempotencyKey } });
      if (existingTx) {
        logger.info(`Idempotent request detected: ${idempotencyKey}`);
        return existingTx;
      }
    }

    const result = await sequelize.transaction(async (t) => {
      // Lock the wallet row
      const wallet = await Wallet.findOne({
        where: { id: walletId, userId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) {
        throw ApiError.notFound('Wallet not found');
      }
      if (wallet.status !== 'active') {
        throw ApiError.badRequest('Wallet is not active');
      }

      // Validate amount
      if (amount < config.wallet.minTransactionAmount) {
        throw ApiError.badRequest(`Minimum deposit amount is ${config.wallet.minTransactionAmount}`);
      }
      if (amount > config.wallet.maxTransactionAmount) {
        throw ApiError.badRequest(`Maximum deposit amount is ${config.wallet.maxTransactionAmount}`);
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = balanceBefore + parseFloat(amount);

      // Update wallet balance
      wallet.balance = newBalance;
      wallet.availableBalance = newBalance;
      await wallet.save({ transaction: t });

      // Create transaction record
      const transaction = await Transaction.create({
        referenceId: generateReference('DEP'),
        type: 'deposit',
        status: 'completed',
        amount,
        fee: 0,
        totalAmount: amount,
        currency: wallet.currency,
        receiverWalletId: wallet.id,
        receiverUserId: userId,
        description: description || `Deposit via ${paymentMethod}`,
        metadata: { paymentMethod },
        idempotencyKey,
        balanceBefore,
        balanceAfter: newBalance,
        processedAt: new Date(),
        ipAddress,
        userAgent,
      }, { transaction: t });

      return transaction;
    });

    // Post-transaction actions (non-blocking)
    auditService.log({
      userId,
      action: 'DEPOSIT_COMPLETED',
      entity: 'transaction',
      entityId: result.id,
      details: { amount, reference: result.referenceId },
      ipAddress,
      userAgent,
    }).catch((err) => logger.error('Audit log failed:', err.message));

    notificationService.notify(userId, {
      type: 'deposit_completed',
      title: 'Deposit Successful',
      message: `$${amount} has been deposited to your wallet.`,
      data: { transactionId: result.id, referenceId: result.referenceId },
    }).catch((err) => logger.error('Notification failed:', err.message));

    return result;
  }

  /**
   * Withdraw money from wallet
   */
  async withdraw(userId, amount, description, bankAccount, idempotencyKey, ipAddress, userAgent) {
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ where: { idempotencyKey } });
      if (existingTx) return existingTx;
    }

    const fee = this.calculateWithdrawalFee(amount);
    const totalAmount = parseFloat(amount) + fee;

    const result = await sequelize.transaction(async (t) => {
      const wallet = await Wallet.findOne({
        where: { userId, isDefault: true },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) throw ApiError.notFound('Default wallet not found');
      if (wallet.status !== 'active') throw ApiError.badRequest('Wallet is not active');
      if (!wallet.hasSufficientBalance(totalAmount)) {
        throw ApiError.badRequest('Insufficient balance');
      }

      // Check limits
      this.resetLimitsIfNeeded(wallet);
      if (!wallet.checkDailyLimit(totalAmount)) {
        throw ApiError.badRequest('Daily transaction limit exceeded');
      }
      if (!wallet.checkMonthlyLimit(totalAmount)) {
        throw ApiError.badRequest('Monthly transaction limit exceeded');
      }

      const balanceBefore = parseFloat(wallet.balance);
      const newBalance = balanceBefore - totalAmount;

      wallet.balance = newBalance;
      wallet.availableBalance = newBalance;
      wallet.dailySpent = parseFloat(wallet.dailySpent) + totalAmount;
      wallet.monthlySpent = parseFloat(wallet.monthlySpent) + totalAmount;
      wallet.lastResetDaily = new Date().toISOString().split('T')[0];
      wallet.lastResetMonthly = new Date().toISOString().split('T')[0];
      await wallet.save({ transaction: t });

      const transaction = await Transaction.create({
        referenceId: generateReference('WDR'),
        type: 'withdrawal',
        status: 'completed',
        amount,
        fee,
        totalAmount,
        currency: wallet.currency,
        senderWalletId: wallet.id,
        senderUserId: userId,
        description: description || 'Withdrawal to bank account',
        metadata: { bankAccount: { bankName: bankAccount.bankName } }, // Don't store full account
        idempotencyKey,
        balanceBefore,
        balanceAfter: newBalance,
        processedAt: new Date(),
        ipAddress,
        userAgent,
      }, { transaction: t });

      return transaction;
    });

    auditService.log({
      userId,
      action: 'WITHDRAWAL_COMPLETED',
      entity: 'transaction',
      entityId: result.id,
      details: { amount, fee, reference: result.referenceId },
      ipAddress,
      userAgent,
    }).catch((err) => logger.error('Audit log failed:', err.message));

    notificationService.notify(userId, {
      type: 'withdrawal_completed',
      title: 'Withdrawal Successful',
      message: `$${amount} has been withdrawn from your wallet. Fee: $${fee}`,
      data: { transactionId: result.id, referenceId: result.referenceId },
    }).catch((err) => logger.error('Notification failed:', err.message));

    return result;
  }

  /**
   * P2P Transfer
   */
  async transfer(userId, receiverIdentifier, amount, description, idempotencyKey, ipAddress, userAgent) {
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ where: { idempotencyKey } });
      if (existingTx) return existingTx;
    }

    // Find receiver
    let receiverWallet;
    if (receiverIdentifier.receiverEmail) {
      const receiver = await User.findOne({ where: { email: receiverIdentifier.receiverEmail } });
      if (!receiver) throw ApiError.notFound('Receiver not found');
      receiverWallet = await Wallet.findOne({ where: { userId: receiver.id, isDefault: true } });
    } else if (receiverIdentifier.receiverPhone) {
      const receiver = await User.findOne({ where: { phone: receiverIdentifier.receiverPhone } });
      if (!receiver) throw ApiError.notFound('Receiver not found');
      receiverWallet = await Wallet.findOne({ where: { userId: receiver.id, isDefault: true } });
    } else if (receiverIdentifier.receiverWalletId) {
      receiverWallet = await Wallet.findOne({
        where: { walletId: receiverIdentifier.receiverWalletId },
      });
    }

    if (!receiverWallet) {
      throw ApiError.notFound('Receiver wallet not found');
    }

    if (receiverWallet.userId === userId) {
      throw ApiError.badRequest('Cannot transfer to your own wallet');
    }

    if (receiverWallet.status !== 'active') {
      throw ApiError.badRequest('Receiver wallet is not active');
    }

    const fee = this.calculateTransferFee(amount);
    const totalAmount = parseFloat(amount) + fee;

    const result = await sequelize.transaction(async (t) => {
      // Lock both wallets (always in consistent order to prevent deadlocks)
      const senderWallet = await Wallet.findOne({
        where: { userId, isDefault: true },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!senderWallet) throw ApiError.notFound('Sender wallet not found');
      if (senderWallet.status !== 'active') throw ApiError.badRequest('Your wallet is not active');
      if (!senderWallet.hasSufficientBalance(totalAmount)) {
        throw ApiError.badRequest('Insufficient balance');
      }

      this.resetLimitsIfNeeded(senderWallet);
      if (!senderWallet.checkDailyLimit(totalAmount)) {
        throw ApiError.badRequest('Daily transaction limit exceeded');
      }
      if (!senderWallet.checkMonthlyLimit(totalAmount)) {
        throw ApiError.badRequest('Monthly transaction limit exceeded');
      }

      // Lock receiver wallet
      const recvWallet = await Wallet.findOne({
        where: { id: receiverWallet.id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const senderBalanceBefore = parseFloat(senderWallet.balance);
      const receiverBalanceBefore = parseFloat(recvWallet.balance);

      // Debit sender
      senderWallet.balance = senderBalanceBefore - totalAmount;
      senderWallet.availableBalance = senderBalanceBefore - totalAmount;
      senderWallet.dailySpent = parseFloat(senderWallet.dailySpent) + totalAmount;
      senderWallet.monthlySpent = parseFloat(senderWallet.monthlySpent) + totalAmount;
      senderWallet.lastResetDaily = new Date().toISOString().split('T')[0];
      senderWallet.lastResetMonthly = new Date().toISOString().split('T')[0];
      await senderWallet.save({ transaction: t });

      // Credit receiver
      recvWallet.balance = receiverBalanceBefore + parseFloat(amount);
      recvWallet.availableBalance = receiverBalanceBefore + parseFloat(amount);
      await recvWallet.save({ transaction: t });

      // Create transaction
      const transaction = await Transaction.create({
        referenceId: generateReference('TRF'),
        type: 'transfer',
        status: 'completed',
        amount,
        fee,
        totalAmount,
        currency: senderWallet.currency,
        senderWalletId: senderWallet.id,
        senderUserId: userId,
        receiverWalletId: recvWallet.id,
        receiverUserId: recvWallet.userId,
        description: description || 'P2P Transfer',
        idempotencyKey,
        balanceBefore: senderBalanceBefore,
        balanceAfter: senderBalanceBefore - totalAmount,
        processedAt: new Date(),
        ipAddress,
        userAgent,
      }, { transaction: t });

      return { transaction, receiverUserId: recvWallet.userId };
    });

    // Post-transaction notifications
    auditService.log({
      userId,
      action: 'TRANSFER_COMPLETED',
      entity: 'transaction',
      entityId: result.transaction.id,
      details: { amount, fee, reference: result.transaction.referenceId },
      ipAddress,
      userAgent,
    }).catch((err) => logger.error('Audit log failed:', err.message));

    notificationService.notify(userId, {
      type: 'transaction_sent',
      title: 'Transfer Sent',
      message: `$${amount} has been sent successfully.`,
      data: { transactionId: result.transaction.id },
    }).catch((err) => logger.error('Notification failed:', err.message));

    notificationService.notify(result.receiverUserId, {
      type: 'transaction_received',
      title: 'Money Received',
      message: `You received $${amount}.`,
      data: { transactionId: result.transaction.id },
    }).catch((err) => logger.error('Notification failed:', err.message));

    return result.transaction;
  }

  /**
   * Bill Payment
   */
  async payBill(userId, billData, idempotencyKey, ipAddress, userAgent) {
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ where: { idempotencyKey } });
      if (existingTx) return existingTx;
    }

    const fee = this.calculateBillPaymentFee(billData.amount);
    const totalAmount = parseFloat(billData.amount) + fee;

    const result = await sequelize.transaction(async (t) => {
      const wallet = await Wallet.findOne({
        where: { userId, isDefault: true },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!wallet) throw ApiError.notFound('Default wallet not found');
      if (wallet.status !== 'active') throw ApiError.badRequest('Wallet is not active');
      if (!wallet.hasSufficientBalance(totalAmount)) {
        throw ApiError.badRequest('Insufficient balance');
      }

      this.resetLimitsIfNeeded(wallet);
      if (!wallet.checkDailyLimit(totalAmount)) throw ApiError.badRequest('Daily limit exceeded');
      if (!wallet.checkMonthlyLimit(totalAmount)) throw ApiError.badRequest('Monthly limit exceeded');

      const balanceBefore = parseFloat(wallet.balance);
      wallet.balance = balanceBefore - totalAmount;
      wallet.availableBalance = balanceBefore - totalAmount;
      wallet.dailySpent = parseFloat(wallet.dailySpent) + totalAmount;
      wallet.monthlySpent = parseFloat(wallet.monthlySpent) + totalAmount;
      wallet.lastResetDaily = new Date().toISOString().split('T')[0];
      wallet.lastResetMonthly = new Date().toISOString().split('T')[0];
      await wallet.save({ transaction: t });

      const transaction = await Transaction.create({
        referenceId: generateReference('BIL'),
        type: 'bill_payment',
        status: 'completed',
        amount: billData.amount,
        fee,
        totalAmount,
        currency: wallet.currency,
        senderWalletId: wallet.id,
        senderUserId: userId,
        description: billData.description || `Bill payment to ${billData.billerName}`,
        metadata: {
          billerId: billData.billerId,
          billerName: billData.billerName,
          accountNumber: billData.accountNumber,
          category: billData.category,
        },
        idempotencyKey,
        balanceBefore,
        balanceAfter: balanceBefore - totalAmount,
        processedAt: new Date(),
        ipAddress,
        userAgent,
      }, { transaction: t });

      return transaction;
    });

    auditService.log({
      userId,
      action: 'BILL_PAYMENT_COMPLETED',
      entity: 'transaction',
      entityId: result.id,
      details: { amount: billData.amount, biller: billData.billerName, reference: result.referenceId },
      ipAddress,
      userAgent,
    }).catch((err) => logger.error('Audit log failed:', err.message));

    notificationService.notify(userId, {
      type: 'bill_payment',
      title: 'Bill Payment Successful',
      message: `$${billData.amount} paid to ${billData.billerName}.`,
      data: { transactionId: result.id },
    }).catch((err) => logger.error('Notification failed:', err.message));

    return result;
  }

  /**
   * Fee calculations
   */
  calculateWithdrawalFee(amount) {
    // 1% fee with $1 minimum, $25 maximum
    return Math.min(Math.max(parseFloat(amount) * 0.01, 1), 25);
  }

  calculateTransferFee(amount) {
    // Free for transfers under $100, 0.5% above
    if (parseFloat(amount) <= 100) return 0;
    return Math.min(parseFloat(amount) * 0.005, 10);
  }

  calculateBillPaymentFee(amount) {
    // Flat $0.50 fee
    return 0.50;
  }

  /**
   * Reset daily/monthly spending limits if needed
   */
  resetLimitsIfNeeded(wallet) {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.slice(0, 7);

    if (wallet.lastResetDaily !== today) {
      wallet.dailySpent = 0;
    }

    const lastMonth = wallet.lastResetMonthly ? wallet.lastResetMonthly.slice(0, 7) : null;
    if (lastMonth !== currentMonth) {
      wallet.monthlySpent = 0;
    }
  }
}

module.exports = new WalletService();
