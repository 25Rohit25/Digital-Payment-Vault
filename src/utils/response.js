/**
 * Standardized API response helpers
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    status: statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    status: 200,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendCreated, sendNoContent, sendPaginated };
