const logger = require('../utils/logger');

// Optional API key validation middleware
const validateApiKey = (req, res, next) => {
  // If no API key is configured, skip validation
  const requiredApiKey = process.env.API_KEY;
  if (!requiredApiKey) {
    return next();
  }

  const providedApiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!providedApiKey) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'API key required',
      timestamp: new Date().toISOString()
    });
  }

  if (providedApiKey !== requiredApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      providedKey: providedApiKey.slice(0, 8) + '...' // Log partial key for debugging
    });

    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid API key',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Rate limiting by IP (additional to express-rate-limit)
const ipRateLimit = new Map();

const checkIpRateLimit = (maxRequests = 1000, windowMs = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    const userRequests = ipRateLimit.get(ip) || [];
    const recentRequests = userRequests.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests from this IP address',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Add current request
    recentRequests.push(now);
    ipRateLimit.set(ip, recentRequests);

    next();
  };
};

module.exports = {
  validateApiKey,
  checkIpRateLimit
}; 