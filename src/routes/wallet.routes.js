const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const txValidation = require('../validations/transaction.validation');
const { transactionLimiter } = require('../middlewares/rateLimiter.middleware');

// All wallet routes require authentication
router.use(authenticate);

router.get('/', walletController.getWallets);
router.get('/balance', walletController.getBalance);
router.get('/:id', walletController.getWalletById);
router.post('/create', walletController.createWallet);

// Financial operations
router.post('/deposit', transactionLimiter, validate(txValidation.deposit), walletController.deposit);
router.post('/withdraw', transactionLimiter, validate(txValidation.withdraw), walletController.withdraw);
router.post('/transfer', transactionLimiter, validate(txValidation.transfer), walletController.transfer);
router.post('/bill-payment', transactionLimiter, validate(txValidation.billPayment), walletController.payBill);

module.exports = router;
