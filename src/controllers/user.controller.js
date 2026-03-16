const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/response');
const userService = require('../services/user.service');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile management
 */

const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  sendSuccess(res, user);
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body, req.ip, req.get('User-Agent'));
  sendSuccess(res, user, 'Profile updated successfully');
});

const setPin = catchAsync(async (req, res) => {
  const result = await userService.setPin(req.user.id, req.body.pin, req.ip, req.get('User-Agent'));
  sendSuccess(res, result);
});

const submitKYC = catchAsync(async (req, res) => {
  const { documentType, documentNumber } = req.body;
  const result = await userService.submitKYC(
    req.user.id, documentType, documentNumber, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, result);
});

module.exports = {
  getProfile,
  updateProfile,
  setPin,
  submitKYC,
};
