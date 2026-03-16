const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
  skip: (req) => req.path === '/health',
});

/**
 * Strict rate limiter for auth endpoints (login, register)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

/**
 * Strict rate limiter for transaction endpoints
 */
const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many transaction requests. Please slow down.',
  },
});

/**
 * Very strict limiter for OTP generation
 */
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: 'Too many OTP requests. Please try again in 5 minutes.',
  },
});

module.exports = { apiLimiter, authLimiter, transactionLimiter, otpLimiter };
