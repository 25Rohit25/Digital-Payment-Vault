const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'pending_verification', 'deactivated'),
    defaultValue: 'pending_verification',
    allowNull: false,
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  kycStatus: {
    type: DataTypes.ENUM('none', 'pending', 'verified', 'rejected'),
    defaultValue: 'none',
  },
  kycDocumentType: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  kycDocumentNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  kycSubmittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  kycVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  pin: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Transaction PIN (hashed)',
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  address: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: '{ street, city, state, zipCode, country }',
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      if (user.pin) {
        user.pin = await bcrypt.hash(user.pin, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      if (user.changed('pin')) {
        user.pin = await bcrypt.hash(user.pin, 12);
      }
    },
  },
  defaultScope: {
    attributes: { exclude: ['password', 'pin'] },
  },
  scopes: {
    withPassword: {
      attributes: {},
    },
    withPin: {
      attributes: {},
    },
  },
});

// Instance methods
User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.comparePin = async function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

User.prototype.isAccountLocked = function () {
  if (this.lockedUntil && this.lockedUntil > new Date()) {
    return true;
  }
  return false;
};

User.prototype.toSafeJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.pin;
  delete values.loginAttempts;
  delete values.lockedUntil;
  return values;
};

module.exports = User;
