const express = require('express');
const router = express.Router();
const stellarService = require('../services/stellar');
const { cacheMiddleware, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/markets:
 *   get:
 *     summary: Get all available lending markets
 *     tags: [Markets]
 *     responses:
 *       200:
 *         description: Available lending markets
 */
router.get('/', 
  cacheMiddleware(180, () => cacheKeys.marketData()),
  async (req, res, next) => {
    try {
      // Fetch data in parallel
      const [stats, rates, prices] = await Promise.all([
        stellarService.getProtocolStats(),
        stellarService.getInterestRates(),
        stellarService.getAssetPrices()
      ]);
      
      const totalSupply = stats.totalSupply / 1000000;
      const totalDebt = stats.totalDebt / 1000000;
      const utilizationRate = stats.utilizationRate / 1000000;
      
      const markets = [
        {
          id: 'pstETH',
          asset: 'pstETH',
          symbol: 'pstETH',
          name: 'Paralyx Staked Ethereum',
          description: 'Bridged stETH from Ethereum',
          icon: 'https://assets.coingecko.com/coins/images/13442/small/steth_logo.png',
          isActive: true,
          
          // Supply side
          totalSupply: totalSupply,
          supplyAPY: rates.supplyAPY,
          supplyRate: rates.supplyRate / 1000000,
          
          // Borrow side  
          totalBorrows: totalDebt,
          borrowAPY: rates.borrowAPY,
          borrowRate: rates.borrowRate / 1000000,
          
          // Market metrics
          utilizationRate: utilizationRate,
          utilizationPercentage: utilizationRate * 100,
          availableLiquidity: Math.max(0, totalSupply - totalDebt),
          
          // Risk parameters
          collateralFactor: 0.7, // 70% LTV
          liquidationThreshold: 0.8, // 80% liquidation threshold
          liquidationPenalty: 0.05, // 5% penalty
          reserveFactor: 0.1, // 10% reserve
          
          // Price info
          price: prices.prices.stETH || 0,
          priceChange24h: 0, // TODO: Calculate from historical data
          
          // Contract info
          contractAddress: stellarService.contracts.sToken,
          underlyingContract: stellarService.contracts.lendingPool,
          
          // Status
          canSupply: true,
          canBorrow: true,
          canWithdraw: totalSupply > totalDebt,
          canRepay: true,
          
          timestamp: new Date().toISOString()
        }
      ];
      
      res.json({
        markets,
        summary: {
          totalMarkets: markets.length,
          activeMarkets: markets.filter(m => m.isActive).length,
          totalValueLocked: totalSupply,
          totalBorrowed: totalDebt,
          totalLiquidity: Math.max(0, totalSupply - totalDebt)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getMarkets' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/markets/{marketId}:
 *   get:
 *     summary: Get specific market details
 *     tags: [Markets]
 *     parameters:
 *       - name: marketId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:marketId',
  cacheMiddleware(120, req => `market:${req.params.marketId}`),
  async (req, res, next) => {
    try {
      const { marketId } = req.params;
      
      // For now we only support pstETH market
      if (marketId !== 'pstETH') {
        return res.status(404).json({
          error: 'Market not found',
          message: `Market ${marketId} is not available`,
          availableMarkets: ['pstETH']
        });
      }
      
      // Fetch detailed market data
      const [stats, rates, prices] = await Promise.all([
        stellarService.getProtocolStats(),
        stellarService.getInterestRates(), 
        stellarService.getAssetPrices()
      ]);
      
      const totalSupply = stats.totalSupply / 1000000;
      const totalDebt = stats.totalDebt / 1000000;
      const utilizationRate = stats.utilizationRate / 1000000;
      const exchangeRate = stats.exchangeRate / 1000000;
      
      const market = {
        id: marketId,
        asset: 'pstETH',
        symbol: 'pstETH',
        name: 'Paralyx Staked Ethereum',
        description: 'Bridged Lido Staked Ethereum (stETH) from Ethereum to Stellar',
        
        // Detailed metrics
        supply: {
          totalSupply: totalSupply,
          apy: rates.supplyAPY,
          rate: rates.supplyRate / 1000000,
          exchangeRate: exchangeRate,
          suppliers: 0 // TODO: Get from contract
        },
        
        borrow: {
          totalBorrows: totalDebt,
          apy: rates.borrowAPY,
          rate: rates.borrowRate / 1000000,
          borrowers: 0 // TODO: Get from contract
        },
        
        liquidity: {
          available: Math.max(0, totalSupply - totalDebt),
          utilized: totalDebt,
          utilizationRate: utilizationRate,
          utilizationPercentage: utilizationRate * 100
        },
        
        risk: {
          collateralFactor: 0.7,
          liquidationThreshold: 0.8,
          liquidationPenalty: 0.05,
          reserveFactor: 0.1,
          riskScore: calculateRiskScore(utilizationRate, prices.prices.stETH || 0)
        },
        
        price: {
          current: prices.prices.stETH || 0,
          currency: 'USD',
          change24h: 0, // TODO: Historical data
          lastUpdate: prices.timestamp
        },
        
        contracts: {
          market: stellarService.contracts.lendingPool,
          token: stellarService.contracts.sToken,
          oracle: stellarService.contracts.priceOracle
        },
        
        bridgeInfo: {
          ethereumContract: process.env.ETHEREUM_LOCKBOX_CONTRACT,
          bridgeStatus: 'operational',
          totalBridged: totalSupply // Assuming all supply is bridged
        },
        
        actions: {
          canSupply: true,
          canBorrow: utilizationRate < 0.95,
          canWithdraw: totalSupply > totalDebt,
          canRepay: true,
          minimumSupply: 0.01,
          minimumBorrow: 0.01
        },
        
        timestamp: new Date().toISOString()
      };
      
      res.json(market);
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getMarketDetails', marketId: req.params.marketId });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/markets/{marketId}/history:
 *   get:
 *     summary: Get market historical data
 *     tags: [Markets]
 *     parameters:
 *       - name: marketId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [1h, 1d, 7d, 30d]
 *           default: 1d
 */
router.get('/:marketId/history',
  cacheMiddleware(300, req => `market:${req.params.marketId}:history:${req.query.period || '1d'}`),
  async (req, res, next) => {
    try {
      const { marketId } = req.params;
      const period = req.query.period || '1d';
      
      if (marketId !== 'pstETH') {
        return res.status(404).json({
          error: 'Market not found',
          message: `Market ${marketId} is not available`
        });
      }
      
      // For now, return mock historical data
      // In production, this would fetch from a database of historical records
      const now = new Date();
      const history = generateMockHistory(period, now);
      
      res.json({
        marketId,
        period,
        dataPoints: history.length,
        history,
        meta: {
          startTime: history[0]?.timestamp,
          endTime: history[history.length - 1]?.timestamp,
          intervalMinutes: getIntervalMinutes(period)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getMarketHistory', marketId: req.params.marketId });
      next(error);
    }
  }
);

// Helper functions
function calculateRiskScore(utilizationRate, price) {
  let score = 100;
  
  // Adjust based on utilization
  if (utilizationRate > 0.9) score -= 30;
  else if (utilizationRate > 0.8) score -= 20;
  else if (utilizationRate > 0.7) score -= 10;
  
  // Adjust based on price (mock volatility calculation)
  if (price > 0 && price < 1000) score -= 5; // Very low price might indicate issues
  
  return Math.max(0, Math.min(100, score));
}

function generateMockHistory(period, endTime) {
  const history = [];
  const intervals = getIntervalCount(period);
  const intervalMs = getIntervalMinutes(period) * 60 * 1000;
  
  for (let i = intervals; i >= 0; i--) {
    const timestamp = new Date(endTime.getTime() - (i * intervalMs));
    
    // Generate mock data with some randomness
    const baseUtilization = 0.6 + (Math.random() - 0.5) * 0.2;
    const baseSupplyAPY = 3.5 + (Math.random() - 0.5) * 0.5;
    const baseBorrowAPY = 5.5 + (Math.random() - 0.5) * 1.0;
    
    history.push({
      timestamp: timestamp.toISOString(),
      utilizationRate: Math.max(0, Math.min(1, baseUtilization)),
      supplyAPY: Math.max(0, baseSupplyAPY),
      borrowAPY: Math.max(0, baseBorrowAPY),
      totalSupply: 10000 + Math.random() * 5000,
      totalBorrows: 6000 + Math.random() * 3000,
      price: 2000 + (Math.random() - 0.5) * 100
    });
  }
  
  return history;
}

function getIntervalMinutes(period) {
  switch (period) {
    case '1h': return 1;
    case '1d': return 15;
    case '7d': return 60;
    case '30d': return 240;
    default: return 15;
  }
}

function getIntervalCount(period) {
  switch (period) {
    case '1h': return 60;
    case '1d': return 96; // 15min intervals
    case '7d': return 168; // 1h intervals  
    case '30d': return 180; // 4h intervals
    default: return 96;
  }
}

module.exports = router; 