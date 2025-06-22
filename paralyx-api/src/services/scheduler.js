const cron = require('node-cron');
const stellarService = require('./stellar');
const { cache, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

let schedulerInitialized = false;

// Helper function to convert BigInt values to strings for JSON serialization
function serializeBigInts(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  
  return obj;
}

// Initialize background data refresh scheduler
async function initializeScheduler() {
  if (schedulerInitialized) {
    logger.warn('Scheduler already initialized');
    return;
  }

  logger.info('Initializing background data refresh scheduler...');

  // Refresh protocol stats every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.debug('Refreshing protocol stats...');
      const stats = await stellarService.getProtocolStats();
      await cache.set(cacheKeys.protocolStats(), serializeBigInts(stats), 300);
      logger.debug('Protocol stats refreshed');
    } catch (error) {
      logger.error('Failed to refresh protocol stats:', error);
    }
  });

  // Refresh interest rates every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      logger.debug('Refreshing interest rates...');
      const rates = await stellarService.getInterestRates();
      await cache.set(cacheKeys.interestRates(), serializeBigInts(rates), 120);
      logger.debug('Interest rates refreshed');
    } catch (error) {
      logger.error('Failed to refresh interest rates:', error);
    }
  });

  // Refresh asset prices every 1 minute
  cron.schedule('*/1 * * * *', async () => {
    try {
      logger.debug('Refreshing asset prices...');
      const prices = await stellarService.getAssetPrices();
      await cache.set('prices:current', serializeBigInts(prices), 60);
      logger.debug('Asset prices refreshed');
    } catch (error) {
      logger.error('Failed to refresh asset prices:', error);
    }
  });

  // Refresh market data every 3 minutes
  cron.schedule('*/3 * * * *', async () => {
    try {
      logger.debug('Refreshing market data...');
      const [stats, rates, prices] = await Promise.all([
        stellarService.getProtocolStats(),
        stellarService.getInterestRates(),
        stellarService.getAssetPrices()
      ]);
      
      const marketData = serializeBigInts({
        stats,
        rates,
        prices,
        timestamp: new Date().toISOString()
      });
      
      await cache.set(cacheKeys.marketData(), marketData, 180);
      logger.debug('Market data refreshed');
    } catch (error) {
      logger.error('Failed to refresh market data:', error);
    }
  });

  // Health check and cleanup every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      logger.debug('Running periodic health check...');
      
      // Check Stellar connectivity
      const health = await stellarService.healthCheck();
      await cache.set('system:health', health, 1800);
      
      // Clear expired cache entries (Redis handles this automatically, but good to track)
      logger.debug('Cache cleanup completed');
      
      // Log system metrics
      const memUsage = process.memoryUsage();
      logger.info('System metrics', {
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        stellarHealth: health.healthy
      });
      
    } catch (error) {
      logger.error('Failed periodic health check:', error);
    }
  });

  // Warm up cache on startup
  try {
    logger.info('Warming up cache with initial data...');
    
    await Promise.allSettled([
      warmupProtocolStats(),
      warmupInterestRates(),
      warmupAssetPrices(),
      warmupMarketData()
    ]);
    
    logger.info('Cache warmup completed');
  } catch (error) {
    logger.error('Cache warmup failed:', error);
  }

  schedulerInitialized = true;
  logger.info('Background scheduler initialized successfully');
}

// Warmup functions
async function warmupProtocolStats() {
  try {
    const stats = await stellarService.getProtocolStats();
    await cache.set(cacheKeys.protocolStats(), serializeBigInts(stats), 300);
    logger.debug('Protocol stats warmed up');
  } catch (error) {
    logger.warn('Failed to warm up protocol stats:', error);
  }
}

async function warmupInterestRates() {
  try {
    const rates = await stellarService.getInterestRates();
    await cache.set(cacheKeys.interestRates(), serializeBigInts(rates), 120);
    logger.debug('Interest rates warmed up');
  } catch (error) {
    logger.warn('Failed to warm up interest rates:', error);
  }
}

async function warmupAssetPrices() {
  try {
    const prices = await stellarService.getAssetPrices();
    await cache.set('prices:current', serializeBigInts(prices), 60);
    logger.debug('Asset prices warmed up');
  } catch (error) {
    logger.warn('Failed to warm up asset prices:', error);
  }
}

async function warmupMarketData() {
  try {
    const [stats, rates, prices] = await Promise.all([
      stellarService.getProtocolStats(),
      stellarService.getInterestRates(),
      stellarService.getAssetPrices()
    ]);
    
    const marketData = serializeBigInts({
      stats,
      rates,
      prices,
      timestamp: new Date().toISOString()
    });
    
    await cache.set(cacheKeys.marketData(), marketData, 180);
    logger.debug('Market data warmed up');
  } catch (error) {
    logger.warn('Failed to warm up market data:', error);
  }
}

// Manual refresh functions (can be called via API if needed)
async function refreshAllData() {
  logger.info('Manual refresh of all cached data triggered');
  
  const refreshTasks = [
    warmupProtocolStats(),
    warmupInterestRates(),
    warmupAssetPrices(),
    warmupMarketData()
  ];

  const results = await Promise.allSettled(refreshTasks);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  logger.info(`Manual refresh completed: ${successful} successful, ${failed} failed`);
  
  return {
    successful,
    failed,
    total: results.length,
    timestamp: new Date().toISOString()
  };
}

// Clear all cached data
async function clearAllCache() {
  try {
    logger.info('Clearing all cached data...');
    
    const patterns = [
      'protocol:*',
      'market:*', 
      'rates:*',
      'prices:*',
      'user:*',
      'bridge:*'
    ];
    
    let totalCleared = 0;
    for (const pattern of patterns) {
      const cleared = await cache.clearPattern(pattern);
      totalCleared += cleared;
    }
    
    logger.info(`Cache cleared: ${totalCleared} keys removed`);
    return totalCleared;
    
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    throw error;
  }
}

module.exports = {
  initializeScheduler,
  refreshAllData,
  clearAllCache
}; 