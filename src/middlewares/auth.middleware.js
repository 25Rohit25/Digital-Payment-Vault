const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getRedisClient } = require('../config/redis');

/**
 * Authenticate JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is required');
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted (after logout)
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`bl_${token}`);
      if (isBlacklisted) {
        throw ApiError.unauthorized('Token has been revoked');
      }
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account has been suspended');
    }

    if (user.status === 'deactivated') {
      throw ApiError.forbidden('Your account has been deactivated');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized('Invalid access token'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('Access token has expired'));
    }
    next(error);
  }
};

/**
 * Authorize specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present, but doesn't fail if missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = await User.findByPk(decoded.id);
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
