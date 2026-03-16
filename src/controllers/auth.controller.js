const catchAsync = require('../utils/catchAsync');
const { sendSuccess, sendCreated } = require('../utils/response');
const authService = require('../services/auth.service');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, confirmPassword]
 *             properties:
 *               firstName: { type: string, example: John }
 *               lastName: { type: string, example: Doe }
 *               email: { type: string, example: john@example.com }
 *               phone: { type: string, example: "+11234567890" }
 *               password: { type: string, example: "Pass@1234" }
 *               confirmPassword: { type: string, example: "Pass@1234" }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already exists
 */
const register = catchAsync(async (req, res) => {
  const result = await authService.register(
    req.body,
    req.ip,
    req.get('User-Agent')
  );
  sendCreated(res, result, 'Registration successful. Please verify your email.');
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: "Pass@1234" }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, req.ip, req.get('User-Agent'));
  sendSuccess(res, result, 'Login successful');
});

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
const refreshToken = catchAsync(async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  sendSuccess(res, result, 'Token refreshed successfully');
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
const logout = catchAsync(async (req, res) => {
  await authService.logout(req.token, req.user.id, req.ip, req.get('User-Agent'));
  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Authentication]
 */
const verifyEmail = catchAsync(async (req, res) => {
  const result = await authService.verifyEmail(
    req.body.email, req.body.otp, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, result, 'Email verified successfully');
});

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 */
const forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, req.ip, req.get('User-Agent'));
  sendSuccess(res, result);
});

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Authentication]
 */
const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword(email, otp, newPassword, req.ip, req.get('User-Agent'));
  sendSuccess(res, result);
});

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    req.user.id, currentPassword, newPassword, req.ip, req.get('User-Agent')
  );
  sendSuccess(res, result);
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
};
