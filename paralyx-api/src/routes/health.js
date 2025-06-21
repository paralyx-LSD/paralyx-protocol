const express = require('express');
const router = express.Router();
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(health);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check Redis connection
    const redisHealthy = await checkRedis();
    
    // Check Stellar connectivity
    const stellarHealthy = await checkStellar();
    
    // Check environment configuration
    const configHealthy = checkConfiguration();
    
    const allHealthy = redisHealthy.healthy && stellarHealthy.healthy && configHealthy.healthy;
    
    const health = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // System metrics
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
          external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100 + ' MB'
        },
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Dependencies
      dependencies: {
        redis: redisHealthy,
        stellar: stellarHealthy,
        configuration: configHealthy
      },
      
      // Application metrics
      metrics: {
        totalRequests: 0, // TODO: Implement request counter
        activeConnections: 0, // TODO: Implement connection counter
        errorRate: 0, // TODO: Implement error tracking
        averageResponseTime: 0 // TODO: Implement response time tracking
      }
    };
    
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical dependencies are available
    const [redisHealthy, stellarHealthy, configHealthy] = await Promise.all([
      checkRedis(),
      checkStellar(),
      Promise.resolve(checkConfiguration())
    ]);
    
    const ready = redisHealthy.healthy && stellarHealthy.healthy && configHealthy.healthy;
    
    if (ready) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        message: 'Service is ready to accept traffic'
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Service is not ready to accept traffic',
        issues: [
          !redisHealthy.healthy ? 'Redis connection issue' : null,
          !stellarHealthy.healthy ? 'Stellar connectivity issue' : null,
          !configHealthy.healthy ? 'Configuration issue' : null
        ].filter(Boolean)
      });
    }
    
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe for Kubernetes
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req, res) => {
  // Simple liveness check - just return 200 if the process is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pid: process.pid
  });
});

// Helper functions
async function checkRedis() {
  try {
    // Try to set and get a test value
    const testKey = 'health_check_test';
    const testValue = Date.now().toString();
    
    await cache.set(testKey, testValue, 10); // 10 second TTL
    const retrieved = await cache.get(testKey);
    await cache.del(testKey);
    
    const working = retrieved === testValue;
    
    return {
      healthy: working,
      status: working ? 'connected' : 'connection_issue',
      responseTime: '< 50ms', // TODO: Measure actual response time
      version: 'unknown' // TODO: Get Redis version
    };
    
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error.message
    };
  }
}

async function checkStellar() {
  try {
    const stellarService = require('../services/stellar');
    const health = await stellarService.healthCheck();
    
    return {
      healthy: health.healthy,
      horizon: health.horizon,
      soroban: health.soroban,
      contracts: health.contracts,
      responseTime: health.duration
    };
    
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      error: error.message
    };
  }
}

function checkConfiguration() {
  const requiredEnvVars = [
    'STELLAR_NETWORK',
    'STELLAR_HORIZON_URL',
    'STELLAR_RPC_URL',
    'LENDING_POOL_CONTRACT',
    'S_TOKEN_CONTRACT',
    'PRICE_ORACLE_CONTRACT'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  const healthy = missing.length === 0;
  
  return {
    healthy,
    status: healthy ? 'configured' : 'missing_configuration',
    missing: missing,
    configured: requiredEnvVars.filter(envVar => !!process.env[envVar])
  };
}

module.exports = router; 