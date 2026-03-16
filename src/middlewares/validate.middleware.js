const ApiError = require('../utils/ApiError');

/**
 * Validate request body/query/params against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    // Replace with validated & sanitized values
    req[property] = value;
    next();
  };
};

module.exports = validate;
