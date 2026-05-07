const { errorResponse } = require('../utils/response');

const isDev = process.env.NODE_ENV === 'development';

module.exports = (err, req, res, next) => {
  // Log full error details for debugging (always)
  console.error('[Error]', err);

  // In production: hide sensitive error details from client
  const status = err.status || 500;
  const message = isDev
    ? err.message || 'Internal server error'
    : 'Internal server error'; // Generic message for production

  // Only expose detailed errors in development
  const errors = isDev ? err.errors || null : null;

  return errorResponse(res, message, status, errors);
};
