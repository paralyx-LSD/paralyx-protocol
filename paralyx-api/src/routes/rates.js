const express = require('express');
const router = express.Router();
const stellarService = require('../services/stellar');
const { cacheMiddleware, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: Get current interest rates for all markets
 *     tags: [Rates]
 *     responses:
 *       200:
 *         description: Current interest rates
 */
router.get('/', 
  cacheMiddleware(60, () => cacheKeys.interestRates()),
  async (req, res, next) => {
    try {
      const [rates, stats] = await Promise.all([
        stellarService.getInterestRates(),
        stellarService.getProtocolStats()
      ]);
      
      const utilizationRate = stats.utilizationRate / 1000000;
      
      res.json({
        current: {
          supplyAPY: rates.supplyAPY,
          borrowAPY: rates.borrowAPY,
          supplyRate: rates.supplyRate / 1000000,
          borrowRate: rates.borrowRate / 1000000,
          utilizationRate: utilizationRate,
          utilizationPercentage: utilizationRate * 100
        },
        markets: {
          pstETH: {
            supplyAPY: rates.supplyAPY,
            borrowAPY: rates.borrowAPY,
            utilizationRate: utilizationRate,
            rateModel: 'jump-rate-model',
            optimalUtilization: 0.8,
            baseRate: 0.02, // 2%
            multiplier: 0.1, // 10%
            jumpMultiplier: 3.0, // 300%
            kink: 0.8 // 80%
          }
        },
        calculations: {
          interestAccrual: 'compound',
          compoundingFrequency: 'continuous',
          rateUpdateInterval: 'per-block',
          lastUpdate: rates.timestamp
        },
        timestamp: rates.timestamp
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getCurrentRates' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rates/calculate:
 *   post:
 *     summary: Calculate projected interest for given amounts and duration
 *     tags: [Rates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               principal:
 *                 type: number
 *                 description: Principal amount
 *               durationDays:
 *                 type: number
 *                 description: Duration in days
 *               type:
 *                 type: string
 *                 enum: [supply, borrow]
 *               market:
 *                 type: string
 *                 default: pstETH
 */
router.post('/calculate',
  async (req, res, next) => {
    try {
      const { principal, durationDays, type, market = 'pstETH' } = req.body;
      
      // Validation
      if (!principal || !durationDays || !type) {
        return res.status(400).json({
          error: 'Missing required parameters',
          required: ['principal', 'durationDays', 'type']
        });
      }
      
      if (principal <= 0 || durationDays <= 0) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'Principal and duration must be positive numbers'
        });
      }
      
      if (!['supply', 'borrow'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid type',
          message: 'Type must be either "supply" or "borrow"'
        });
      }
      
      // Get current rates
      const rates = await stellarService.getInterestRates();
      const annualRate = type === 'supply' ? rates.supplyAPY : rates.borrowAPY;
      
      // Calculate projected returns/costs
      const dailyRate = annualRate / 365;
      const compoundInterest = principal * Math.pow(1 + (dailyRate / 100), durationDays) - principal;
      const simpleInterest = principal * (dailyRate / 100) * durationDays;
      
      res.json({
        input: {
          principal,
          durationDays,
          type,
          market,
          annualRate: annualRate
        },
        results: {
          compoundInterest,
          simpleInterest,
          finalAmount: principal + compoundInterest,
          effectiveRate: (compoundInterest / principal) * 100,
          dailyInterest: compoundInterest / durationDays
        },
        breakdown: {
          dailyRate: dailyRate,
          weeklyInterest: compoundInterest * (7 / durationDays),
          monthlyInterest: compoundInterest * (30 / durationDays)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'calculateInterest' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rates/history:
 *   get:
 *     summary: Get historical interest rate data
 *     tags: [Rates]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d]
 *           default: 7d
 *       - name: market
 *         in: query
 *         schema:
 *           type: string
 *           default: pstETH
 */
router.get('/history',
  cacheMiddleware(300, req => `rates:history:${req.query.period || '7d'}:${req.query.market || 'pstETH'}`),
  async (req, res, next) => {
    try {
      const period = req.query.period || '7d';
      const market = req.query.market || 'pstETH';
      
      // Generate mock historical rate data
      // In production, this would fetch from historical database
      const history = generateRateHistory(period);
      
      res.json({
        market,
        period,
        dataPoints: history.length,
        history,
        summary: {
          avgSupplyAPY: history.reduce((sum, h) => sum + h.supplyAPY, 0) / history.length,
          avgBorrowAPY: history.reduce((sum, h) => sum + h.borrowAPY, 0) / history.length,
          maxSupplyAPY: Math.max(...history.map(h => h.supplyAPY)),
          minSupplyAPY: Math.min(...history.map(h => h.supplyAPY)),
          maxBorrowAPY: Math.max(...history.map(h => h.borrowAPY)),
          minBorrowAPY: Math.min(...history.map(h => h.borrowAPY))
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getRateHistory' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/rates/model:
 *   get:
 *     summary: Get interest rate model parameters
 *     tags: [Rates]
 *     parameters:
 *       - name: market
 *         in: query
 *         schema:
 *           type: string
 *           default: pstETH
 */
router.get('/model',
  cacheMiddleware(3600, req => `rates:model:${req.query.market || 'pstETH'}`),
  async (req, res, next) => {
    try {
      const market = req.query.market || 'pstETH';
      
      // Get current utilization to show rate curve
      const stats = await stellarService.getProtocolStats();
      const currentUtilization = stats.utilizationRate / 1000000;
      
      const rateModel = {
        market,
        type: 'JumpRateModel',
        parameters: {
          baseRatePerYear: 0.02, // 2%
          multiplierPerYear: 0.1, // 10%
          jumpMultiplierPerYear: 3.0, // 300%
          kink: 0.8, // 80%
          reserveFactor: 0.1 // 10%
        },
        currentState: {
          utilizationRate: currentUtilization,
          utilizationPercentage: currentUtilization * 100,
          currentSupplyRate: calculateRateFromModel(currentUtilization, 'supply'),
          currentBorrowRate: calculateRateFromModel(currentUtilization, 'borrow')
        },
        rateCurve: generateRateCurve(),
        description: 'Jump rate model with optimal utilization at 80%. Rates increase gradually below kink, then jump significantly above kink to discourage over-utilization.',
        timestamp: new Date().toISOString()
      };
      
      res.json(rateModel);
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getRateModel' });
      next(error);
    }
  }
);

// Helper functions
function generateRateHistory(period) {
  const history = [];
  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
  const intervals = days * 24; // Hourly data points
  
  for (let i = intervals; i >= 0; i--) {
    const timestamp = new Date(Date.now() - (i * 60 * 60 * 1000));
    
    // Generate realistic rate variations
    const baseSupply = 3.5;
    const baseBorrow = 5.5;
    const variation = (Math.sin(i / 24) + Math.random() - 0.5) * 0.5;
    
    history.push({
      timestamp: timestamp.toISOString(),
      supplyAPY: Math.max(0, baseSupply + variation),
      borrowAPY: Math.max(0, baseBorrow + variation),
      utilizationRate: 0.6 + (Math.sin(i / 48) + Math.random() - 0.5) * 0.2,
      spread: baseBorrow - baseSupply + Math.abs(variation)
    });
  }
  
  return history;
}

function calculateRateFromModel(utilization, type) {
  const baseRate = 0.02; // 2%
  const multiplier = 0.1; // 10%
  const jumpMultiplier = 3.0; // 300%
  const kink = 0.8; // 80%
  const reserveFactor = 0.1; // 10%
  
  let borrowRate;
  
  if (utilization <= kink) {
    borrowRate = baseRate + (utilization * multiplier);
  } else {
    const normalRate = baseRate + (kink * multiplier);
    const excessUtil = utilization - kink;
    borrowRate = normalRate + (excessUtil * jumpMultiplier);
  }
  
  if (type === 'supply') {
    // Supply rate = borrow rate * utilization * (1 - reserve factor)
    return borrowRate * utilization * (1 - reserveFactor) * 100;
  } else {
    return borrowRate * 100;
  }
}

function generateRateCurve() {
  const curve = [];
  
  for (let i = 0; i <= 100; i += 5) {
    const utilization = i / 100;
    curve.push({
      utilization,
      utilizationPercentage: i,
      supplyAPY: calculateRateFromModel(utilization, 'supply'),
      borrowAPY: calculateRateFromModel(utilization, 'borrow')
    });
  }
  
  return curve;
}

module.exports = router; 