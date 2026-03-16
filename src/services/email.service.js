const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async sendMail(to, subject, html) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Digital Wallet" <${config.email.from}>`,
        to,
        subject,
        html,
      });
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      // Don't throw — email failures shouldn't break flows
    }
  }

  async sendVerificationEmail(email, firstName, otp) {
    const subject = 'Verify Your Email — Digital Wallet';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">🔐 Digital Wallet</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #667eea;">Hello ${firstName}!</h2>
          <p>Welcome to Digital Wallet. Please verify your email with the OTP below:</p>
          <div style="background: #16213e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${otp}</span>
          </div>
          <p style="color: #888;">This OTP expires in ${config.otp.expiryMinutes} minutes.</p>
          <p style="color: #888;">If you didn't create an account, please ignore this email.</p>
        </div>
        <div style="background: #16213e; padding: 15px; text-align: center; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} Digital Wallet. All rights reserved.
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }

  async sendPasswordResetEmail(email, firstName, otp) {
    const subject = 'Password Reset — Digital Wallet';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">🔐 Digital Wallet</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #f5576c;">Password Reset Request</h2>
          <p>Hi ${firstName}, we received a request to reset your password.</p>
          <div style="background: #16213e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f5576c;">${otp}</span>
          </div>
          <p style="color: #888;">This OTP expires in ${config.otp.expiryMinutes} minutes.</p>
          <p style="color: #888;">If you didn't request this, your account is secure — ignore this email.</p>
        </div>
        <div style="background: #16213e; padding: 15px; text-align: center; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} Digital Wallet. All rights reserved.
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }

  async sendTransactionAlert(email, firstName, type, amount, reference) {
    const subject = `Transaction Alert — ${type.toUpperCase()} — Digital Wallet`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">💸 Transaction Alert</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #38ef7d;">Hi ${firstName},</h2>
          <p>A ${type} of <strong style="color: #38ef7d;">$${amount}</strong> has been processed.</p>
          <p>Reference: <code style="color: #667eea;">${reference}</code></p>
          <p style="color: #888;">If you didn't authorize this transaction, please contact support immediately.</p>
        </div>
        <div style="background: #16213e; padding: 15px; text-align: center; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} Digital Wallet. All rights reserved.
        </div>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }
}

module.exports = new EmailService();
