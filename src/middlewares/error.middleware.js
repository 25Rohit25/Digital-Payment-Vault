const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an ApiError, wrap it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, [], false);
  }

  const response = {
    success: false,
    status: error.statusCode,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  // Include validation errors if present
  if (error.errors && error.errors.length > 0) {
    response.errors = error.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Log error
  if (error.statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${error.statusCode}: ${error.message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${error.statusCode}: ${error.message}`);
  }

  res.status(error.statusCode).json(response);
};

/**
 * Handle 404 routes
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFoundHandler };
