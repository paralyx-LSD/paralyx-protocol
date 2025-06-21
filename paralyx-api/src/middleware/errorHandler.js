const logger = require('../utils/logger');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.logApiError(err, req, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let error = 'server_error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'validation_error';
    message = 'Invalid input data';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    error = 'invalid_id';
    message = 'Invalid ID format';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    error = 'service_unavailable';
    message = 'External service unavailable';
  } else if (err.name === 'TimeoutError') {
    statusCode = 504;
    error = 'timeout';
    message = 'Request timeout';
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    statusCode = 400;
    error = 'invalid_json';
    message = 'Invalid JSON format';
  }

  // Production vs development error responses
  const errorResponse = {
    error,
    message,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    path: req.originalUrl
  };

  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Add additional context for API errors
  if (err.context) {
    errorResponse.context = err.context;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 Not Found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/user/:walletAddress',
      'GET /api/protocol/stats',
      'GET /api/markets',
      'GET /api/rates',
      'GET /api/bridge/status'
    ]
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
}; 