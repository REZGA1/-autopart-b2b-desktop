const { ERROR_CODES } = require('../constants/errorCodes');

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = ERROR_CODES.SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, ERROR_CODES.AUTH_UNAUTHORIZED);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ERROR_CODES.PERMISSION_DENIED);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, ERROR_CODES.RESOURCE_CONFLICT);
  }
}

class BusinessLogicError extends AppError {
  constructor(message, errorCode = ERROR_CODES.SERVER_ERROR) {
    super(message, 400, errorCode);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
};