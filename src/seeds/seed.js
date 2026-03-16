/**
 * Database seed script — creates an admin user and a test user
 * Run: npm run db:seed
 */
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User, Wallet } = require('../models');
const { generateWalletId } = require('../utils/helpers');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });

    // Check if admin already exists
    const existingAdmin = await User.unscoped().findOne({ where: { email: 'admin@digitalwallet.com' } });
    if (existingAdmin) {
      logger.info('Seed data already exists. Skipping.');
      process.exit(0);
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@1234', 12);
    const admin = await User.unscoped().create({
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@digitalwallet.com',
      password: adminPassword,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      kycStatus: 'verified',
    }, { hooks: false });

    await Wallet.create({
      userId: admin.id,
      walletId: generateWalletId(),
      currency: 'USD',
      balance: 1000000,
      availableBalance: 1000000,
      dailyLimit: 1000000,
      monthlyLimit: 10000000,
      isDefault: true,
    });

    // Create test user
    const userPassword = await bcrypt.hash('User@1234', 12);
    const testUser = await User.unscoped().create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+11234567890',
      password: userPassword,
      role: 'user',
      status: 'active',
      emailVerified: true,
      kycStatus: 'verified',
    }, { hooks: false });

    const testPin = await bcrypt.hash('1234', 12);
    testUser.pin = testPin;
    await testUser.save({ hooks: false });

    await Wallet.create({
      userId: testUser.id,
      walletId: generateWalletId(),
      currency: 'USD',
      balance: 5000,
      availableBalance: 5000,
      dailyLimit: 10000,
      monthlyLimit: 50000,
      isDefault: true,
    });

    // Create second test user
    const user2Password = await bcrypt.hash('User@1234', 12);
    const testUser2 = await User.unscoped().create({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+10987654321',
      password: user2Password,
      role: 'user',
      status: 'active',
      emailVerified: true,
      kycStatus: 'none',
    }, { hooks: false });

    const test2Pin = await bcrypt.hash('5678', 12);
    testUser2.pin = test2Pin;
    await testUser2.save({ hooks: false });

    await Wallet.create({
      userId: testUser2.id,
      walletId: generateWalletId(),
      currency: 'USD',
      balance: 2500,
      availableBalance: 2500,
      dailyLimit: 10000,
      monthlyLimit: 50000,
      isDefault: true,
    });

    logger.info('✅ Seed data created successfully:');
    logger.info('   Admin: admin@digitalwallet.com / Admin@1234');
    logger.info('   User1: john@example.com / User@1234 (PIN: 1234)');
    logger.info('   User2: jane@example.com / User@1234 (PIN: 5678)');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
