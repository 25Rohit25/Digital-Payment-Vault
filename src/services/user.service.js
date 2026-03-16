const { User, Wallet } = require('../models');
const ApiError = require('../utils/ApiError');
const auditService = require('./audit.service');
const { maskEmail } = require('../utils/helpers');

class UserService {
  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      include: [{ model: Wallet, as: 'wallets' }],
    });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData, ipAddress, userAgent) {
    const user = await User.unscoped().findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');

    // Check phone uniqueness if being updated
    if (updateData.phone && updateData.phone !== user.phone) {
      const existingPhone = await User.unscoped().findOne({
        where: { phone: updateData.phone },
      });
      if (existingPhone) {
        throw ApiError.conflict('Phone number already in use');
      }
    }

    const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'address'];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    });

    await user.save({ hooks: false });

    await auditService.log({
      userId,
      action: 'PROFILE_UPDATED',
      entity: 'user',
      entityId: userId,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return await User.findByPk(userId, {
      include: [{ model: Wallet, as: 'wallets' }],
    });
  }

  /**
   * Set transaction PIN
   */
  async setPin(userId, pin, ipAddress, userAgent) {
    const user = await User.scope('withPin').findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.pin) {
      throw ApiError.badRequest('PIN is already set. Use change PIN instead.');
    }

    user.pin = pin;
    await user.save();

    await auditService.log({
      userId,
      action: 'PIN_SET',
      entity: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return { message: 'Transaction PIN set successfully' };
  }

  /**
   * Submit KYC documents
   */
  async submitKYC(userId, documentType, documentNumber, ipAddress, userAgent) {
    const user = await User.unscoped().findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.kycStatus === 'verified') {
      throw ApiError.badRequest('KYC is already verified');
    }

    if (user.kycStatus === 'pending') {
      throw ApiError.badRequest('KYC verification is already pending');
    }

    user.kycStatus = 'pending';
    user.kycDocumentType = documentType;
    user.kycDocumentNumber = documentNumber;
    user.kycSubmittedAt = new Date();
    await user.save({ hooks: false });

    await auditService.log({
      userId,
      action: 'KYC_SUBMITTED',
      entity: 'user',
      entityId: userId,
      details: { documentType },
      ipAddress,
      userAgent,
    });

    return { message: 'KYC documents submitted. Verification is pending.' };
  }
}

module.exports = new UserService();
