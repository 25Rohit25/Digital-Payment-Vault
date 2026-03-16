const Joi = require('joi');

const register = Joi.object({
  firstName: Joi.string().min(2).max(100).required()
    .messages({ 'string.min': 'First name must be at least 2 characters' }),
  lastName: Joi.string().min(2).max(100).required()
    .messages({ 'string.min': 'Last name must be at least 2 characters' }),
  email: Joi.string().email().required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).optional()
    .messages({ 'string.pattern.base': 'Please provide a valid phone number' }),
  password: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character',
    }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
  dateOfBirth: Joi.date().max('now').optional(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
    .messages({
      'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character',
    }),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).max(128).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/),
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

const verifyEmail = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

const updateProfile = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  address: Joi.object({
    street: Joi.string().max(255).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
  }).optional(),
});

const setPin = Joi.object({
  pin: Joi.string().length(4).pattern(/^\d{4}$/).required()
    .messages({ 'string.pattern.base': 'PIN must be exactly 4 digits' }),
  confirmPin: Joi.string().valid(Joi.ref('pin')).required()
    .messages({ 'any.only': 'PINs do not match' }),
});

const submitKYC = Joi.object({
  documentType: Joi.string().valid('passport', 'national_id', 'drivers_license').required(),
  documentNumber: Joi.string().min(5).max(100).required(),
});

const refreshToken = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  register,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updateProfile,
  setPin,
  submitKYC,
  refreshToken,
};
