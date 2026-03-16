const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendCreated } = require('../utils/response');
const walletService = require('../services/wallet.service');
const userService = require('../services/user.service');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management and operations
 */

/**
 * @swagger
 * /api/v1/wallet:
 *   get:
 *     summary: Get user's wallets
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const getWallets = catchAsync(async (req, res) => {
  const wallets = await walletService.getWallets(req.user.id);
  sendSuccess(res, wallets);
});

/**
 * @swagger
 * /api/v1/wallet/{id}:
 *   get:
 *     summary: Get wallet by ID
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const getWalletById = catchAsync(async (req, res) => {
  const wallet = await walletService.getWalletById(req.params.id, req.user.id);
  sendSuccess(res, wallet);
});

/**
 * @swagger
 * /api/v1/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const getBalance = catchAsync(async (req, res) => {
  const wallet = await walletService.getDefaultWallet(req.user.id);
  sendSuccess(res, {
    walletId: wallet.walletId,
    balance: wallet.balance,
    availableBalance: wallet.availableBalance,
    currency: wallet.currency,
    dailyLimit: wallet.dailyLimit,
    dailySpent: wallet.dailySpent,
    monthlyLimit: wallet.monthlyLimit,
    monthlySpent: wallet.monthlySpent,
  });
});

/**
 * @swagger
 * /api/v1/wallet/create:
 *   post:
 *     summary: Create additional wallet (different currency)
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const createWallet = catchAsync(async (req, res) => {
  const wallet = await walletService.createWallet(
    req.user.id, req.body.currency, req.ip, req.get('User-Agent')
  );
  sendCreated(res, wallet, 'Wallet created successfully');
});

/**
 * @swagger
 * /api/v1/wallet/deposit:
 *   post:
 *     summary: Deposit money into wallet
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const deposit = catchAsync(async (req, res) => {
  const wallet = await walletService.getDefaultWallet(req.user.id);
  const transaction = await walletService.deposit(
    req.user.id,
    wallet.id,
    req.body.amount,
    req.body.description,
    req.body.paymentMethod,
    req.body.idempotencyKey,
    req.ip,
    req.get('User-Agent')
  );
  sendSuccess(res, transaction, 'Deposit successful');
});

/**
 * @swagger
 * /api/v1/wallet/withdraw:
 *   post:
 *     summary: Withdraw money from wallet
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const withdraw = catchAsync(async (req, res) => {
  // Verify PIN
  const user = await User.scope('withPin').findByPk(req.user.id);
  if (!user.pin) throw ApiError.badRequest('Please set a transaction PIN first');
  const isPinValid = await user.comparePin(req.body.pin);
  if (!isPinValid) throw ApiError.unauthorized('Invalid transaction PIN');

  const transaction = await walletService.withdraw(
    req.user.id,
    req.body.amount,
    req.body.description,
    req.body.bankAccount,
    req.body.idempotencyKey,
    req.ip,
    req.get('User-Agent')
  );
  sendSuccess(res, transaction, 'Withdrawal successful');
});

/**
 * @swagger
 * /api/v1/wallet/transfer:
 *   post:
 *     summary: Transfer money to another wallet
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const transfer = catchAsync(async (req, res) => {
  // Verify PIN
  const user = await User.scope('withPin').findByPk(req.user.id);
  if (!user.pin) throw ApiError.badRequest('Please set a transaction PIN first');
  const isPinValid = await user.comparePin(req.body.pin);
  if (!isPinValid) throw ApiError.unauthorized('Invalid transaction PIN');

  const { receiverEmail, receiverPhone, receiverWalletId, amount, description, idempotencyKey } = req.body;
  const transaction = await walletService.transfer(
    req.user.id,
    { receiverEmail, receiverPhone, receiverWalletId },
    amount,
    description,
    idempotencyKey,
    req.ip,
    req.get('User-Agent')
  );
  sendSuccess(res, transaction, 'Transfer successful');
});

/**
 * @swagger
 * /api/v1/wallet/bill-payment:
 *   post:
 *     summary: Pay a bill
 *     tags: [Wallet]
 *     security: [{ bearerAuth: [] }]
 */
const payBill = catchAsync(async (req, res) => {
  // Verify PIN
  const user = await User.scope('withPin').findByPk(req.user.id);
  if (!user.pin) throw ApiError.badRequest('Please set a transaction PIN first');
  const isPinValid = await user.comparePin(req.body.pin);
  if (!isPinValid) throw ApiError.unauthorized('Invalid transaction PIN');

  const transaction = await walletService.payBill(
    req.user.id,
    req.body,
    req.body.idempotencyKey,
    req.ip,
    req.get('User-Agent')
  );
  sendSuccess(res, transaction, 'Bill payment successful');
});

module.exports = {
  getWallets,
  getWalletById,
  getBalance,
  createWallet,
  deposit,
  withdraw,
  transfer,
  payBill,
};
