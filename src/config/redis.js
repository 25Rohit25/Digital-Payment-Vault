const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

const createRedisClient = () => {
  if (redisClient) return redisClient;

  const options = {
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: config.redis.maxRetries,
    retryStrategy: (times) => {
      if (times > config.redis.maxRetries) {
        logger.error('❌ Redis max retries reached. Giving up.');
        return null;
      }
      return Math.min(times * config.redis.retryDelayMs, 5000);
    },
    lazyConnect: true,
  };

  if (config.redis.password) {
    options.password = config.redis.password;
  }

  redisClient = new Redis(options);

  redisClient.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    logger.warn('⚠️  Redis connection error:', err.message);
  });

  redisClient.on('close', () => {
    logger.warn('⚠️  Redis connection closed');
  });

  return redisClient;
};

const connectRedis = async () => {
  try {
    const client = createRedisClient();
    await client.connect();
    return client;
  } catch (error) {
    logger.warn('⚠️  Redis connection failed, running without cache:', error.message);
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

module.exports = { createRedisClient, connectRedis, getRedisClient, disconnectRedis };
