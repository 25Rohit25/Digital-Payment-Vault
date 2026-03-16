const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(authValidation.updateProfile), userController.updateProfile);
router.post('/set-pin', validate(authValidation.setPin), userController.setPin);
router.post('/kyc', validate(authValidation.submitKYC), userController.submitKYC);

module.exports = router;
