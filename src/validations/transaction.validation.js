const Joi = require('joi');

const deposit = Joi.object({
  amount: Joi.number().positive().min(0.01).max(50000).required()
    .messages({ 'number.min': 'Minimum deposit amount is $0.01' }),
  currency: Joi.string().length(3).uppercase().default('USD').optional(),
  description: Joi.string().max(500).optional(),
  paymentMethod: Joi.string().valid('bank_transfer', 'credit_card', 'debit_card').required(),
  idempotencyKey: Joi.string().max(255).optional(),
});

const withdraw = Joi.object({
  amount: Joi.number().positive().min(0.01).max(50000).required(),
  currency: Joi.string().length(3).uppercase().default('USD').optional(),
  description: Joi.string().max(500).optional(),
  bankAccount: Joi.object({
    bankName: Joi.string().required(),
    accountNumber: Joi.string().required(),
    routingNumber: Joi.string().required(),
  }).required(),
  pin: Joi.string().length(4).pattern(/^\d{4}$/).required(),
  idempotencyKey: Joi.string().max(255).optional(),
});

const transfer = Joi.object({
  receiverEmail: Joi.string().email().optional(),
  receiverPhone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).optional(),
  receiverWalletId: Joi.string().optional(),
  amount: Joi.number().positive().min(0.01).max(50000).required(),
  currency: Joi.string().length(3).uppercase().default('USD').optional(),
  description: Joi.string().max(500).optional(),
  pin: Joi.string().length(4).pattern(/^\d{4}$/).required(),
  idempotencyKey: Joi.string().max(255).optional(),
}).or('receiverEmail', 'receiverPhone', 'receiverWalletId')
  .messages({ 'object.missing': 'Please provide receiver email, phone, or wallet ID' });

const billPayment = Joi.object({
  billerId: Joi.string().required(),
  billerName: Joi.string().required(),
  accountNumber: Joi.string().required(),
  amount: Joi.number().positive().min(0.01).max(50000).required(),
  category: Joi.string().valid('electricity', 'water', 'internet', 'phone', 'insurance', 'other').required(),
  description: Joi.string().max(500).optional(),
  pin: Joi.string().length(4).pattern(/^\d{4}$/).required(),
  idempotencyKey: Joi.string().max(255).optional(),
});

const transactionQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('deposit', 'withdrawal', 'transfer', 'bill_payment', 'refund', 'fee').optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled').optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  sortBy: Joi.string().valid('created_at', 'amount', 'type').default('created_at'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
});

module.exports = {
  deposit,
  withdraw,
  transfer,
  billPayment,
  transactionQuery,
};
