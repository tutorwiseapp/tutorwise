// cas/packages/core/src/utils/logger.js

/**
 * @file Logger Utility
 * @description A simple logger for CAS.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(logLevel) {
    this.logLevel = logLevel || process.env.LOG_LEVEL || 'info';
  }

  log(level, message, ...args) {
    if (LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}]`, message, ...args);
    }
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
}

// Export a default instance
module.exports = new Logger();
// Also export the class for custom instances
module.exports.Logger = Logger;
