const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendPaginated } = require('../utils/response');
const transactionService = require('../services/transaction.service');

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction history and details
 */

const getTransactions = catchAsync(async (req, res) => {
  const result = await transactionService.getTransactions(req.user.id, req.query);
  sendPaginated(res, result.transactions, result.pagination, 'Transactions retrieved');
});

const getTransactionById = catchAsync(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.params.id, req.user.id);
  sendSuccess(res, transaction);
});

const getTransactionByReference = catchAsync(async (req, res) => {
  const transaction = await transactionService.getTransactionByReference(req.params.referenceId, req.user.id);
  sendSuccess(res, transaction);
});

const getTransactionSummary = catchAsync(async (req, res) => {
  const summary = await transactionService.getTransactionSummary(req.user.id);
  sendSuccess(res, summary);
});

module.exports = {
  getTransactions,
  getTransactionById,
  getTransactionByReference,
  getTransactionSummary,
};
