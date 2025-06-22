const redis = require('redis');
const logger = require('./logger');

let redisClient = null;

// Redis connection configuration
const connectRedis = async () => {
  try {
    const redisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 50, 1000);
        }
      }
    };

    redisClient = redis.createClient(redisConfig);

    // Error handling
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready for commands');
    });

    // Connect to Redis
    await redisClient.connect();
    
    // Make client globally available
    global.redisClient = redisClient;
    
    return redisClient;
    
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    
    // In development, continue without Redis
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('Continuing without Redis cache in development mode');
      return null;
    }
    
    throw error;
  }
};

// Cache utilities
const cache = {
  // Get value from cache
  async get(key) {
    if (!redisClient || !redisClient.isReady) {
      logger.logCacheOperation('get', key, false);
      return null;
    }

    try {
      const start = Date.now();
      const value = await redisClient.get(key);
      const duration = Date.now() - start;
      
      const parsed = value ? JSON.parse(value) : null;
      logger.logCacheOperation('get', key, !!parsed, duration);
      
      return parsed;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  // Set value in cache
  async set(key, value, ttlSeconds = null) {
    if (!redisClient || !redisClient.isReady) {
      logger.logCacheOperation('set', key, false);
      return false;
    }

    try {
      const start = Date.now();
      const ttl = ttlSeconds || parseInt(process.env.DEFAULT_CACHE_TTL) || 300;
      
      // Custom replacer function to handle BigInt serialization
      const serialized = JSON.stringify(value, (key, val) => {
        if (typeof val === 'bigint') {
          return val.toString();
        }
        return val;
      });
      
      await redisClient.setEx(key, ttl, serialized);
      
      const duration = Date.now() - start;
      logger.logCacheOperation('set', key, true, duration);
      
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  // Delete value from cache
  async del(key) {
    if (!redisClient || !redisClient.isReady) {
      logger.logCacheOperation('del', key, false);
      return false;
    }

    try {
      const start = Date.now();
      const result = await redisClient.del(key);
      const duration = Date.now() - start;
      
      logger.logCacheOperation('del', key, result > 0, duration);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    if (!redisClient || !redisClient.isReady) {
      return false;
    }

    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  },

  // Clear cache by pattern
  async clearPattern(pattern) {
    if (!redisClient || !redisClient.isReady) {
      return 0;
    }

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await redisClient.del(keys);
      logger.info(`Cleared ${result} cache keys matching pattern: ${pattern}`);
      return result;
    } catch (error) {
      logger.error(`Cache clear pattern error for ${pattern}:`, error);
      return 0;
    }
  },

  // Get cache stats
  async getStats() {
    if (!redisClient || !redisClient.isReady) {
      return { connected: false };
    }

    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      
      return {
        connected: true,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { connected: false, error: error.message };
    }
  }
};

// Cache middleware for Express routes
const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Generate cache key
    const defaultKey = `${req.method}:${req.originalUrl}`;
    const cacheKey = keyGenerator ? keyGenerator(req) : defaultKey;
    
    try {
      // Try to get cached response
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }
      
      // If no cache, intercept response to cache it
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Use the same BigInt serialization fix for middleware caching
          const serializableData = JSON.parse(JSON.stringify(data, (key, val) => {
            if (typeof val === 'bigint') {
              return val.toString();
            }
            return val;
          }));
          
          cache.set(cacheKey, serializableData, ttlSeconds).catch(err => 
            logger.error('Cache middleware set error:', err)
          );
        }
        
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue without caching
    }
  };
};

// Cache key generators
const cacheKeys = {
  userPosition: (walletAddress) => `user:position:${walletAddress}`,
  protocolStats: () => 'protocol:stats',
  marketData: () => 'markets:data',
  interestRates: () => 'rates:current',
  bridgeStatus: () => 'bridge:status',
  assetPrice: (asset) => `price:${asset}`,
  userTransactions: (walletAddress, page = 1) => `user:tx:${walletAddress}:${page}`
};

module.exports = {
  connectRedis,
  cache,
  cacheMiddleware,
  cacheKeys,
  getRedisClient: () => redisClient
}; 