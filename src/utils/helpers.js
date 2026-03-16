const crypto = require('crypto');
const config = require('../config');

/**
 * Generate a random OTP of configured length
 */
const generateOTP = (length = config.otp.length) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

/**
 * Generate a unique reference/transaction ID
 */
const generateReference = (prefix = 'TXN') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate a wallet ID
 */
const generateWalletId = () => {
  return generateReference('WLT');
};

/**
 * Mask sensitive data for logs
 */
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  const maskedName = name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + name.charAt(name.length - 1);
  return `${maskedName}@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  return phone.slice(0, 3) + '*'.repeat(Math.max(phone.length - 6, 1)) + phone.slice(-3);
};

/**
 * Pagination helper
 */
const getPagination = (page = 1, limit = 20) => {
  const sanitizedPage = Math.max(1, parseInt(page, 10) || 1);
  const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (sanitizedPage - 1) * sanitizedLimit;
  return { page: sanitizedPage, limit: sanitizedLimit, offset };
};

const getPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    totalItems,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  generateOTP,
  generateReference,
  generateWalletId,
  maskEmail,
  maskPhone,
  getPagination,
  getPaginationMeta,
};
