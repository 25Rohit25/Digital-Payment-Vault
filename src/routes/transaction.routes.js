const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const txValidation = require('../validations/transaction.validation');

router.use(authenticate);

router.get('/', validate(txValidation.transactionQuery, 'query'), transactionController.getTransactions);
router.get('/summary', transactionController.getTransactionSummary);
router.get('/reference/:referenceId', transactionController.getTransactionByReference);
router.get('/:id', transactionController.getTransactionById);

module.exports = router;
