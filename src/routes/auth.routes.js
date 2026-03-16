const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const authValidation = require('../validations/auth.validation');
const { authLimiter, otpLimiter } = require('../middlewares/rateLimiter.middleware');

// Public routes
router.post('/register', authLimiter, validate(authValidation.register), authController.register);
router.post('/login', authLimiter, validate(authValidation.login), authController.login);
router.post('/refresh-token', validate(authValidation.refreshToken), authController.refreshToken);
router.post('/verify-email', otpLimiter, validate(authValidation.verifyEmail), authController.verifyEmail);
router.post('/forgot-password', otpLimiter, validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', otpLimiter, validate(authValidation.resetPassword), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(authValidation.changePassword), authController.changePassword);

module.exports = router;
