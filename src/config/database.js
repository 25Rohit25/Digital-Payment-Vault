const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    pool: config.db.pool,
    logging: config.db.logging,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
      paranoid: true, // soft deletes
    },
    dialectOptions: {
      decimalNumbers: true,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connected successfully');

    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database synced (development mode)');
    }
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
