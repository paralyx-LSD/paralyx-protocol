const express = require('express');
const router = express.Router();
const Joi = require('joi');
const stellarService = require('../services/stellar');
const { cacheMiddleware, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

// Validation schemas
const walletAddressSchema = Joi.string()
  .length(56)
  .pattern(/^G[A-Z2-7]{55}$/)
  .required()
  .messages({
    'string.length': 'Wallet address must be exactly 56 characters',
    'string.pattern.base': 'Invalid Stellar wallet address format'
  });

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1)
});

/**
 * @swagger
 * /api/user/{walletAddress}:
 *   get:
 *     summary: Get user's complete position and portfolio
 *     tags: [User]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           pattern: "^G[A-Z2-7]{55}$"
 *         description: Stellar wallet address
 *     responses:
 *       200:
 *         description: User position data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletAddress:
 *                   type: string
 *                 position:
 *                   type: object
 *                 accountInfo:
 *                   type: object
 *                 timestamp:
 *                   type: string
 */
router.get('/:walletAddress', 
  cacheMiddleware(120, req => cacheKeys.userPosition(req.params.walletAddress)),
  async (req, res, next) => {
    try {
      // Validate wallet address
      const { error, value } = walletAddressSchema.validate(req.params.walletAddress);
      if (error) {
        return res.status(400).json({
          error: 'Invalid wallet address',
          message: error.details[0].message
        });
      }
      
      const walletAddress = value;
      
      // Fetch user data in parallel
      const [position, accountInfo] = await Promise.all([
        stellarService.getUserPosition(walletAddress).catch(err => {
          logger.warn(`Failed to fetch position for ${walletAddress}:`, err.message);
          return null;
        }),
        stellarService.getAccountInfo(walletAddress).catch(err => {
          logger.warn(`Failed to fetch account info for ${walletAddress}:`, err.message);
          return null;
        })
      ]);
      
      // Calculate additional metrics
      let healthStatus = 'safe';
      if (position?.healthFactor) {
        if (position.healthFactor < 1100000) { // 1.1 in 7-decimal format
          healthStatus = 'risky';
        } else if (position.healthFactor < 1300000) { // 1.3 in 7-decimal format
          healthStatus = 'moderate';
        }
      }
      
      res.json({
        walletAddress,
        position: position ? {
          ...position,
          healthStatus,
          hasPosition: position.balance > 0 || position.debt > 0 || position.collateral > 0
        } : null,
        accountInfo,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getUserPosition' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/{walletAddress}/transactions:
 *   get:
 *     summary: Get user's transaction history
 *     tags: [User]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: cursor
 *         in: query
 *         schema:
 *           type: string
 */
router.get('/:walletAddress/transactions', 
  cacheMiddleware(60, req => cacheKeys.userTransactions(req.params.walletAddress, req.query.page || 1)),
  async (req, res, next) => {
    try {
      // Validate inputs
      const { error: addrError } = walletAddressSchema.validate(req.params.walletAddress);
      if (addrError) {
        return res.status(400).json({
          error: 'Invalid wallet address',
          message: addrError.details[0].message
        });
      }
      
      const { error: queryError, value: queryParams } = paginationSchema.validate(req.query);
      if (queryError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          message: queryError.details[0].message
        });
      }
      
      const { walletAddress } = req.params;
      const { limit, cursor } = queryParams;
      
      const transactions = await stellarService.getUserTransactions(walletAddress, limit, cursor);
      
      res.json({
        walletAddress,
        ...transactions,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getUserTransactions' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/{walletAddress}/balance:
 *   get:
 *     summary: Get user's account balances
 *     tags: [User]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:walletAddress/balance',
  cacheMiddleware(30, req => `balance:${req.params.walletAddress}`),
  async (req, res, next) => {
    try {
      // Validate wallet address
      const { error, value } = walletAddressSchema.validate(req.params.walletAddress);
      if (error) {
        return res.status(400).json({
          error: 'Invalid wallet address',
          message: error.details[0].message
        });
      }
      
      const walletAddress = value;
      const accountInfo = await stellarService.getAccountInfo(walletAddress);
      
      // Format balances
      const balances = accountInfo.balances.map(balance => ({
        asset: balance.asset_type === 'native' ? 'XLM' : 
               `${balance.asset_code}:${balance.asset_issuer}`,
        balance: parseFloat(balance.balance),
        asset_type: balance.asset_type,
        asset_code: balance.asset_code,
        asset_issuer: balance.asset_issuer
      }));
      
      res.json({
        walletAddress,
        balances,
        totalAssets: balances.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getUserBalance' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/{walletAddress}/health:
 *   get:
 *     summary: Get user's position health metrics
 *     tags: [User]
 *     parameters:
 *       - name: walletAddress
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:walletAddress/health',
  cacheMiddleware(60, req => `health:${req.params.walletAddress}`),
  async (req, res, next) => {
    try {
      // Validate wallet address
      const { error, value } = walletAddressSchema.validate(req.params.walletAddress);
      if (error) {
        return res.status(400).json({
          error: 'Invalid wallet address',
          message: error.details[0].message
        });
      }
      
      const walletAddress = value;
      const position = await stellarService.getUserPosition(walletAddress);
      
      if (!position || (position.balance === 0 && position.debt === 0 && position.collateral === 0)) {
        return res.json({
          walletAddress,
          hasPosition: false,
          message: 'No active position found',
          timestamp: new Date().toISOString()
        });
      }
      
      // Calculate health metrics
      const healthFactor = position.healthFactor || 0;
      const collateralValue = position.collateral || 0;
      const debtValue = position.debt || 0;
      
      let healthStatus, riskLevel, liquidationRisk;
      
      if (healthFactor >= 1500000) { // 1.5
        healthStatus = 'excellent';
        riskLevel = 'low';
        liquidationRisk = 'very_low';
      } else if (healthFactor >= 1300000) { // 1.3
        healthStatus = 'good';
        riskLevel = 'low';
        liquidationRisk = 'low';
      } else if (healthFactor >= 1100000) { // 1.1
        healthStatus = 'moderate';
        riskLevel = 'medium';
        liquidationRisk = 'medium';
      } else if (healthFactor >= 1000000) { // 1.0
        healthStatus = 'risky';
        riskLevel = 'high';
        liquidationRisk = 'high';
      } else {
        healthStatus = 'critical';
        riskLevel = 'very_high';
        liquidationRisk = 'imminent';
      }
      
      res.json({
        walletAddress,
        hasPosition: true,
        healthFactor: healthFactor / 1000000, // Convert to decimal
        healthFactorRaw: healthFactor,
        healthStatus,
        riskLevel,
        liquidationRisk,
        collateralValue: collateralValue / 1000000, // Convert to decimal
        debtValue: debtValue / 1000000,
        availableToBorrow: Math.max(0, (collateralValue * 0.7) - debtValue) / 1000000,
        liquidationThreshold: 0.8, // 80% LTV
        currentLTV: debtValue > 0 ? (debtValue / collateralValue) : 0,
        recommendations: generateHealthRecommendations(healthStatus, healthFactor / 1000000),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getUserHealth' });
      next(error);
    }
  }
);

// Helper function to generate health recommendations
function generateHealthRecommendations(healthStatus, healthFactor) {
  const recommendations = [];
  
  switch (healthStatus) {
    case 'critical':
      recommendations.push('URGENT: Add more collateral immediately to avoid liquidation');
      recommendations.push('Consider repaying part of your debt');
      break;
    case 'risky':
      recommendations.push('Add more collateral to improve your position');
      recommendations.push('Monitor your position closely');
      break;
    case 'moderate':
      recommendations.push('Consider adding more collateral for safety');
      recommendations.push('Monitor market conditions');
      break;
    case 'good':
      recommendations.push('Your position is healthy');
      recommendations.push('You may borrow more if needed');
      break;
    case 'excellent':
      recommendations.push('Excellent position health');
      recommendations.push('Opportunity to borrow more or supply additional assets');
      break;
  }
  
  return recommendations;
}

module.exports = router; 