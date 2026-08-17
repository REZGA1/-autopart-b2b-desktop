const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  error: (message, meta = {}) => {
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, meta);
    }
  },

  warn: (message, meta = {}) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, meta);
    }
  },

  info: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, meta);
    }
  },

  debug: (message, meta = {}) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, meta);
    }
  },
};

module.exports = logger;