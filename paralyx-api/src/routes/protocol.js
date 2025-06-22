const express = require('express');
const router = express.Router();
const stellarService = require('../services/stellar');
const { cacheMiddleware, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/protocol/stats:
 *   get:
 *     summary: Get overall protocol statistics
 *     tags: [Protocol]
 *     responses:
 *       200:
 *         description: Protocol statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSupply:
 *                   type: number
 *                 totalDebt:
 *                   type: number
 *                 utilizationRate:
 *                   type: number
 *                 totalLiquidity:
 *                   type: number
 */
router.get('/stats', 
  cacheMiddleware(300, () => cacheKeys.protocolStats()),
  async (req, res, next) => {
    try {
      const stats = await stellarService.getProtocolStats();
      
      // Calculate additional metrics - convert BigInt to Number
      const totalSupply = Number(stats.totalSupply) / 1000000;
      const totalDebt = Number(stats.totalDebt) / 1000000;
      const utilizationRate = Number(stats.utilizationRate) / 1000000;
      const totalLiquidity = Number(stats.totalLiquidity) / 1000000;
      
      res.json({
        totalSupply,
        totalDebt,
        totalLiquidity,
        utilizationRate,
        exchangeRate: Number(stats.exchangeRate) / 1000000,
        protocolHealth: calculateProtocolHealth(utilizationRate),
        metrics: {
          totalValueLocked: totalSupply,
          availableLiquidity: totalLiquidity,
          borrowedAmount: totalDebt,
          utilizationPercentage: utilizationRate * 100,
          liquidityRatio: totalSupply > 0 ? (totalLiquidity / totalSupply) * 100 : 0
        },
        raw: {
          ...stats,
          // Convert BigInt values to strings for JSON serialization
          totalSupply: stats.totalSupply.toString(),
          totalDebt: stats.totalDebt.toString(),
          utilizationRate: stats.utilizationRate.toString(),
          totalLiquidity: stats.totalLiquidity.toString(),
          exchangeRate: stats.exchangeRate.toString()
        },
        timestamp: stats.timestamp
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getProtocolStats' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/protocol/overview:
 *   get:
 *     summary: Get comprehensive protocol overview
 *     tags: [Protocol]
 *     responses:
 *       200:
 *         description: Complete protocol overview
 */
router.get('/overview',
  cacheMiddleware(180, () => 'protocol:overview'),
  async (req, res, next) => {
    try {
      // Fetch multiple data sources in parallel
      const [stats, rates, prices] = await Promise.all([
        stellarService.getProtocolStats(),
        stellarService.getInterestRates(),
        stellarService.getAssetPrices()
      ]);
      
      const totalSupply = Number(stats.totalSupply) / 1000000;
      const totalDebt = Number(stats.totalDebt) / 1000000;
      const utilizationRate = Number(stats.utilizationRate) / 1000000;
      
      res.json({
        protocol: {
          name: 'Paralyx Protocol',
          version: '1.0.0',
          network: 'stellar-testnet',
          status: 'operational'
        },
        liquidity: {
          totalValueLocked: totalSupply,
          totalBorrowed: totalDebt,
          availableLiquidity: Math.max(0, totalSupply - totalDebt),
          utilizationRate: utilizationRate,
          utilizationPercentage: utilizationRate * 100
        },
        rates: {
          supplyAPY: rates.supplyAPY,
          borrowAPY: rates.borrowAPY,
          supplyRate: Number(rates.supplyRate) / 1000000,
          borrowRate: Number(rates.borrowRate) / 1000000
        },
        prices: prices.prices,
        markets: [
          {
            asset: 'pstETH',
            symbol: 'pstETH',
            name: 'Paralyx Staked Ethereum',
            totalSupply: totalSupply,
            totalBorrows: totalDebt,
            supplyAPY: rates.supplyAPY,
            borrowAPY: rates.borrowAPY,
            utilizationRate: utilizationRate,
            collateralFactor: 0.7,
            liquidationThreshold: 0.8,
            price: prices.prices.stETH || 0
          }
        ],
        contracts: {
          lendingPool: stellarService.contracts.lendingPool,
          sToken: stellarService.contracts.sToken,
          priceOracle: stellarService.contracts.priceOracle
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getProtocolOverview' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/protocol/health:
 *   get:
 *     summary: Get protocol health metrics
 *     tags: [Protocol]
 *     responses:
 *       200:
 *         description: Protocol health status
 */
router.get('/health',
  cacheMiddleware(120, () => 'protocol:health'),
  async (req, res, next) => {
    try {
      const stats = await stellarService.getProtocolStats();
      const utilizationRate = Number(stats.utilizationRate) / 1000000;
      const totalSupply = Number(stats.totalSupply) / 1000000;
      const totalDebt = Number(stats.totalDebt) / 1000000;
      
      const health = calculateProtocolHealth(utilizationRate);
      
      res.json({
        status: health.status,
        score: health.score,
        utilizationRate: utilizationRate,
        utilizationPercentage: utilizationRate * 100,
        recommendations: health.recommendations,
        metrics: {
          liquidity: {
            total: totalSupply,
            available: Math.max(0, totalSupply - totalDebt),
            borrowed: totalDebt,
            ratio: totalSupply > 0 ? ((totalSupply - totalDebt) / totalSupply) * 100 : 0
          },
          utilization: {
            current: utilizationRate * 100,
            optimal: 80, // 80% target utilization
            critical: 95 // 95% critical threshold
          }
        },
        alerts: generateHealthAlerts(utilizationRate, totalSupply, totalDebt),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getProtocolHealth' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/protocol/contracts:
 *   get:
 *     summary: Get deployed contract addresses and info
 *     tags: [Protocol]
 *     responses:
 *       200:
 *         description: Contract information
 */
router.get('/contracts',
  cacheMiddleware(3600, () => 'protocol:contracts'), // Cache for 1 hour
  async (req, res, next) => {
    try {
      const networkInfo = await stellarService.getNetworkInfo();
      
      res.json({
        network: networkInfo.network,
        contracts: {
          lendingPool: {
            address: stellarService.contracts.lendingPool,
            name: 'Paralyx Lending Pool',
            description: 'Main lending and borrowing contract'
          },
          sToken: {
            address: stellarService.contracts.sToken,
            name: 'Paralyx stETH Token',
            description: 'Interest-bearing token representing stETH deposits'
          },
          priceOracle: {
            address: stellarService.contracts.priceOracle,
            name: 'Paralyx Price Oracle',
            description: 'Price feeds for supported assets'
          }
        },
        bridge: {
          ethereum: {
            lockbox: process.env.ETHEREUM_LOCKBOX_CONTRACT,
            network: 'sepolia',
            description: 'Ethereum side of the cross-chain bridge'
          }
        },
        networkInfo: {
          soroban: networkInfo.soroban,
          horizon: networkInfo.horizon
        },
        timestamp: networkInfo.timestamp
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getProtocolContracts' });
      next(error);
    }
  }
);

// Helper function to calculate protocol health
function calculateProtocolHealth(utilizationRate) {
  let status, score, recommendations = [];
  
  if (utilizationRate < 0.4) { // < 40%
    status = 'healthy';
    score = 100;
    recommendations.push('Protocol has ample liquidity');
    recommendations.push('Good conditions for borrowing');
  } else if (utilizationRate < 0.7) { // 40-70%
    status = 'good';
    score = 85;
    recommendations.push('Protocol utilization is within target range');
    recommendations.push('Monitor for increased demand');
  } else if (utilizationRate < 0.85) { // 70-85%
    status = 'moderate';
    score = 70;
    recommendations.push('Higher utilization - consider adding liquidity');
    recommendations.push('Interest rates may increase');
  } else if (utilizationRate < 0.95) { // 85-95%
    status = 'stressed';
    score = 50;
    recommendations.push('High utilization - liquidity may be limited');
    recommendations.push('Consider repaying loans or adding liquidity');
  } else { // > 95%
    status = 'critical';
    score = 25;
    recommendations.push('CRITICAL: Very low liquidity available');
    recommendations.push('Borrowing may be limited or unavailable');
  }
  
  return { status, score, recommendations };
}

// Generate health alerts
function generateHealthAlerts(utilizationRate, totalSupply, totalDebt) {
  const alerts = [];
  
  if (utilizationRate > 0.95) {
    alerts.push({
      level: 'critical',
      message: 'Protocol utilization is critically high',
      action: 'Add liquidity immediately'
    });
  } else if (utilizationRate > 0.85) {
    alerts.push({
      level: 'warning',
      message: 'Protocol utilization is high',
      action: 'Consider adding liquidity'
    });
  }
  
  if (totalSupply < 1000) { // Less than 1000 units
    alerts.push({
      level: 'info',
      message: 'Low total liquidity in protocol',
      action: 'Consider supplying assets to earn interest'
    });
  }
  
  return alerts;
}

module.exports = router; 