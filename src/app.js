const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const logger = require('./utils/logger');

const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // For Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
}));

// ─── Body Parsing ──────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Compression ───────────────────────────────────────
app.use(compression());

// ─── Request Logging ───────────────────────────────────
const morganFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  skip: (req) => req.path === '/health',
}));

// ─── Rate Limiting ─────────────────────────────────────
app.use('/api/', apiLimiter);

// ─── Health Check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// ─── API Documentation ────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
  `,
  customSiteTitle: 'Digital Wallet API Docs',
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── API Routes ────────────────────────────────────────
app.use('/api/v1', routes);

// ─── Root route ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🔐 Digital Payment Wallet API v1.0.0',
    documentation: '/api-docs',
    health: '/health',
    api: '/api/v1',
  });
});

// ─── Error Handling ────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
