const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDB, sequelize } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Import models to ensure associations are set up
require('./models');

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await connectDB();

    // Connect to Redis (non-blocking — app works without it)
    await connectRedis();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🔐 Digital Payment Wallet API                       ║
║                                                       ║
║   Environment : ${config.nodeEnv.padEnd(36)}║
║   Port        : ${String(config.port).padEnd(36)}║
║   Database    : ${config.db.name.padEnd(36)}║
║   API Docs    : http://localhost:${config.port}/api-docs${' '.repeat(11)}║
║   Health      : http://localhost:${config.port}/health${' '.repeat(14)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // ─── Graceful Shutdown ──────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await sequelize.close();
          logger.info('Database connection closed');
        } catch (err) {
          logger.error('Error closing database:', err.message);
        }

        try {
          await disconnectRedis();
          logger.info('Redis connection closed');
        } catch (err) {
          logger.error('Error closing Redis:', err.message);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
