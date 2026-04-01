/**
 * Structured error logging utility
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

function formatLog(level, message, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    env: process.env.NODE_ENV || 'development',
  };
}

function logToConsole(level, formatted) {
  const color = {
    ERROR: '\x1b[31m', // red
    WARN: '\x1b[33m', // yellow
    INFO: '\x1b[36m', // cyan
    DEBUG: '\x1b[90m', // gray
  };
  const reset = '\x1b[0m';

  const prefix = `${color[level] || ''}[${level}]${reset}`;
  console.log(prefix, JSON.stringify(formatted, null, 2));
}

export function logError(message, error = null, meta = {}) {
  const formatted = formatLog(LOG_LEVELS.ERROR, message, {
    ...meta,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    }),
  });
  logToConsole(LOG_LEVELS.ERROR, formatted);
}

export function logWarn(message, meta = {}) {
  const formatted = formatLog(LOG_LEVELS.WARN, message, meta);
  logToConsole(LOG_LEVELS.WARN, formatted);
}

export function logInfo(message, meta = {}) {
  const formatted = formatLog(LOG_LEVELS.INFO, message, meta);
  if (process.env.NODE_ENV !== 'test') {
    logToConsole(LOG_LEVELS.INFO, formatted);
  }
}

export function logDebug(message, meta = {}) {
  if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
    const formatted = formatLog(LOG_LEVELS.DEBUG, message, meta);
    logToConsole(LOG_LEVELS.DEBUG, formatted);
  }
}

/**
 * Wrap a function with error logging
 */
export function withErrorLogging(fn, context = '') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(`Error in ${context}`, error, {
        args: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)),
      });
      throw error;
    }
  };
}

/**
 * API request/response logging middleware for Express
 */
export function expressLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - startTime;
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 400) {
      logWarn(`API request failed`, meta);
    } else {
      logDebug(`API request completed`, meta);
    }

    return originalSend.call(this, data);
  };

  next();
}
