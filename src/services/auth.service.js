const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const config = require('../config');
const { User, OTP, Wallet } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateOTP, generateWalletId, maskEmail } = require('../utils/helpers');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const auditService = require('./audit.service');
const emailService = require('./email.service');

class AuthService {
  /**
   * Generate JWT tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiration }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiration }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user
   */
  async register(userData, ipAddress, userAgent) {
    // Check if email already exists
    const existingUser = await User.unscoped().findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Check phone uniqueness
    if (userData.phone) {
      const existingPhone = await User.unscoped().findOne({
        where: { phone: userData.phone },
      });
      if (existingPhone) {
        throw ApiError.conflict('An account with this phone number already exists');
      }
    }

    // Create user
    const user = await User.scope('withPassword').create({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || null,
      password: userData.password,
      dateOfBirth: userData.dateOfBirth || null,
    });

    // Create default wallet
    await Wallet.create({
      userId: user.id,
      walletId: generateWalletId(),
      currency: config.wallet.defaultCurrency,
      dailyLimit: config.wallet.defaultDailyLimit,
      monthlyLimit: config.wallet.defaultMonthlyLimit,
      isDefault: true,
    });

    // Generate email verification OTP
    const otpCode = generateOTP();
    await OTP.create({
      userId: user.id,
      code: otpCode,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
    });

    // Send verification email (non-blocking)
    emailService.sendVerificationEmail(user.email, user.firstName, otpCode).catch((err) => {
      logger.error('Failed to send verification email:', err.message);
    });

    // Audit log
    await auditService.log({
      userId: user.id,
      action: 'USER_REGISTERED',
      entity: 'user',
      entityId: user.id,
      details: { email: maskEmail(user.email) },
      ipAddress,
      userAgent,
    });

    const tokens = this.generateTokens(user);
    const safeUser = await User.findByPk(user.id, {
      include: [{ model: Wallet, as: 'wallets' }],
    });

    return { user: safeUser, ...tokens };
  }

  /**
   * Login user
   */
  async login(email, password, ipAddress, userAgent) {
    const user = await User.scope('withPassword').findOne({
      where: { email },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check account lock
    if (user.isAccountLocked()) {
      throw ApiError.forbidden('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        logger.warn(`Account locked for user ${maskEmail(email)} due to too many failed attempts`);
      }
      await user.save({ hooks: false });

      await auditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'user',
        entityId: user.id,
        details: { reason: 'Invalid password', attempts: user.loginAttempts },
        ipAddress,
        userAgent,
        status: 'failure',
      });

      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check account status
    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account has been suspended. Please contact support.');
    }

    if (user.status === 'deactivated') {
      throw ApiError.forbidden('Your account has been deactivated.');
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save({ hooks: false });

    // Audit log
    await auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const tokens = this.generateTokens(user);
    const safeUser = await User.findByPk(user.id, {
      include: [{ model: Wallet, as: 'wallets' }],
    });

    return { user: safeUser, ...tokens };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      if (decoded.type !== 'refresh') {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw ApiError.unauthorized('User not found');
      }

      if (user.status !== 'active' && user.status !== 'pending_verification') {
        throw ApiError.forbidden('Account is not active');
      }

      const tokens = this.generateTokens(user);
      return tokens;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Logout — blacklist the token
   */
  async logout(token, userId, ipAddress, userAgent) {
    const redis = getRedisClient();
    if (redis) {
      // Decode token to get expiry
      const decoded = jwt.decode(token);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`bl_${token}`, ttl, '1');
      }
    }

    await auditService.log({
      userId,
      action: 'USER_LOGOUT',
      entity: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email, otpCode, ipAddress, userAgent) {
    const user = await User.unscoped().findOne({ where: { email } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (user.emailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    const otp = await OTP.findOne({
      where: {
        userId: user.id,
        type: 'email_verification',
        verified: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!otp) {
      throw ApiError.badRequest('OTP expired or not found. Please request a new one.');
    }

    if (otp.isMaxAttempts()) {
      throw ApiError.tooManyRequests('Too many verification attempts. Please request a new OTP.');
    }

    if (otp.code !== otpCode) {
      otp.attempts += 1;
      await otp.save();
      throw ApiError.badRequest('Invalid OTP');
    }

    // Mark OTP as verified
    otp.verified = true;
    await otp.save();

    // Update user
    user.emailVerified = true;
    user.status = 'active';
    await user.save({ hooks: false });

    await auditService.log({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Forgot password — send OTP
   */
  async forgotPassword(email, ipAddress, userAgent) {
    const user = await User.unscoped().findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a password reset OTP has been sent.' };
    }

    // Invalidate previous OTPs
    await OTP.update(
      { verified: true },
      { where: { userId: user.id, type: 'password_reset', verified: false } }
    );

    const otpCode = generateOTP();
    await OTP.create({
      userId: user.id,
      code: otpCode,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000),
    });

    emailService.sendPasswordResetEmail(user.email, user.firstName, otpCode).catch((err) => {
      logger.error('Failed to send password reset email:', err.message);
    });

    await auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { message: 'If the email exists, a password reset OTP has been sent.' };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(email, otpCode, newPassword, ipAddress, userAgent) {
    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const otp = await OTP.findOne({
      where: {
        userId: user.id,
        type: 'password_reset',
        verified: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    if (!otp) {
      throw ApiError.badRequest('OTP expired or not found');
    }

    if (otp.code !== otpCode) {
      otp.attempts += 1;
      await otp.save();
      throw ApiError.badRequest('Invalid OTP');
    }

    otp.verified = true;
    await otp.save();

    user.password = newPassword;
    await user.save();

    await auditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId, currentPassword, newPassword, ipAddress, userAgent) {
    const user = await User.scope('withPassword').findByPk(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    await auditService.log({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
