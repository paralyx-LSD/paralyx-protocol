const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service = 'api', ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}] [${service}] ${message} ${metaString}`.trim();
  })
);

// Configure transports
const transports = [];

// Console transport for development
if (process.env.LOG_CONSOLE === 'true' || process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service = 'api' }) => 
        `${timestamp} [${level}] [${service}] ${message}`
      )
    )
  }));
}

// File transport
const logFile = process.env.LOG_FILE || path.join(logsDir, 'api.log');
transports.push(new winston.transports.File({
  filename: logFile,
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
}));

// Error file transport
transports.push(new winston.transports.File({
  filename: path.join(logsDir, 'error.log'),
  level: 'error',
  format: logFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 3,
}));

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add request ID support for tracking
logger.addRequestId = (req, res, next) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.requestId);
  
  // Add request info to logger context
  req.logger = logger.child({ 
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress
  });
  
  next();
};

// Performance logging helper
logger.logRequest = (req, res, duration) => {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  
  logger.info(`${method} ${originalUrl}`, {
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId
  });
};

// API error logging
logger.logApiError = (error, req, context = {}) => {
  logger.error('API Error', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    request: {
      method: req?.method,
      url: req?.originalUrl,
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      requestId: req?.requestId
    },
    context
  });
};

// Blockchain interaction logging
logger.logBlockchainCall = (action, network, result, duration, context = {}) => {
  logger.info(`Blockchain call: ${action}`, {
    network,
    duration: `${duration}ms`,
    success: !result.error,
    error: result.error,
    context
  });
};

// Cache operation logging
logger.logCacheOperation = (operation, key, hit = null, duration = null) => {
  logger.debug(`Cache ${operation}`, {
    key,
    hit: hit !== null ? hit : undefined,
    duration: duration ? `${duration}ms` : undefined
  });
};

module.exports = logger; 