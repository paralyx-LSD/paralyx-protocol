const express = require('express');
const router = express.Router();
const axios = require('axios');
const { cacheMiddleware, cacheKeys } = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/bridge/status:
 *   get:
 *     summary: Get cross-chain bridge operational status
 *     tags: [Bridge]
 *     responses:
 *       200:
 *         description: Bridge status information
 */
router.get('/status', 
  cacheMiddleware(60, () => cacheKeys.bridgeStatus()),
  async (req, res, next) => {
    try {
      // Check Ethereum side
      const ethereumStatus = await checkEthereumBridge();
      
      // Check Stellar side (we can use our stellar service)
      const stellarService = require('../services/stellar');
      const stellarStatus = await stellarService.healthCheck();
      
      // Check validator status (if running locally)
      const validatorStatus = await checkValidatorStatus();
      
      const overallHealthy = ethereumStatus.healthy && stellarStatus.healthy && validatorStatus.healthy;
      
      res.json({
        status: overallHealthy ? 'operational' : 'degraded',
        healthy: overallHealthy,
        components: {
          ethereum: ethereumStatus,
          stellar: stellarStatus,
          validator: validatorStatus
        },
        contracts: {
          ethereum: {
            lockbox: process.env.ETHEREUM_LOCKBOX_CONTRACT,
            network: 'sepolia'
          },
          stellar: {
            lendingPool: process.env.LENDING_POOL_CONTRACT,
            sToken: process.env.S_TOKEN_CONTRACT,
            network: 'testnet'
          }
        },
        metrics: {
          totalBridged: 0, // TODO: Calculate from events
          pendingTransactions: 0,
          averageProcessingTime: '2-5 minutes',
          successRate: '99.5%'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getBridgeStatus' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bridge/transactions:
 *   get:
 *     summary: Get recent bridge transactions
 *     tags: [Bridge]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: direction
 *         in: query
 *         schema:
 *           type: string
 *           enum: [eth_to_stellar, stellar_to_eth, all]
 *           default: all
 */
router.get('/transactions',
  cacheMiddleware(120, req => `bridge:transactions:${req.query.limit || 20}:${req.query.direction || 'all'}`),
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const direction = req.query.direction || 'all';
      
      // In production, this would query a database of bridge events
      // For now, return mock data
      const transactions = generateMockBridgeTransactions(limit, direction);
      
      res.json({
        transactions,
        pagination: {
          total: transactions.length,
          limit,
          hasMore: false
        },
        filters: {
          direction
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getBridgeTransactions' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bridge/fees:
 *   get:
 *     summary: Get current bridge fee structure
 *     tags: [Bridge]
 *     responses:
 *       200:
 *         description: Bridge fee information
 */
router.get('/fees',
  cacheMiddleware(300, () => 'bridge:fees'),
  async (req, res, next) => {
    try {
      res.json({
        bridgeFees: {
          ethToStellar: {
            baseFee: '0.001 ETH',
            gasFee: 'dynamic',
            processingFee: '0.1%',
            minimumAmount: '0.01 stETH',
            maximumAmount: '1000 stETH'
          },
          stellarToEth: {
            baseFee: '1 XLM',
            processingFee: '0.1%',
            minimumAmount: '0.01 pstETH',
            maximumAmount: '1000 pstETH'
          }
        },
        estimatedTimes: {
          ethToStellar: '2-5 minutes',
          stellarToEth: '3-7 minutes'
        },
        gasPrices: {
          ethereum: await getEthereumGasPrice(),
          stellar: '100 stroops'
        },
        feeCalculator: {
          description: 'Bridge fees are calculated based on transaction amount and current network conditions',
          formula: 'total_fee = base_fee + (amount * processing_fee_percentage) + gas_fee'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getBridgeFees' });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bridge/analytics:
 *   get:
 *     summary: Get bridge usage analytics
 *     tags: [Bridge]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 24h
 */
router.get('/analytics',
  cacheMiddleware(600, req => `bridge:analytics:${req.query.period || '24h'}`),
  async (req, res, next) => {
    try {
      const period = req.query.period || '24h';
      
      // Generate mock analytics data
      const analytics = generateBridgeAnalytics(period);
      
      res.json({
        period,
        volume: analytics.volume,
        transactions: analytics.transactions,
        users: analytics.users,
        assets: analytics.assets,
        performance: analytics.performance,
        trends: analytics.trends,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.logApiError(error, req, { endpoint: 'getBridgeAnalytics' });
      next(error);
    }
  }
);

// Helper functions
async function checkEthereumBridge() {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!rpcUrl) {
      return { healthy: false, error: 'Ethereum RPC URL not configured' };
    }
    
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    }, { timeout: 5000 });
    
    const blockNumber = parseInt(response.data.result, 16);
    
    return {
      healthy: true,
      network: 'sepolia',
      latestBlock: blockNumber,
      contractAddress: process.env.ETHEREUM_LOCKBOX_CONTRACT,
      rpcStatus: 'connected'
    };
    
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      network: 'sepolia',
      rpcStatus: 'disconnected'
    };
  }
}

async function checkValidatorStatus() {
  try {
    // Try to connect to local validator if running
    const response = await axios.get('http://localhost:3333/health', { timeout: 2000 });
    return {
      healthy: true,
      status: 'running',
      version: response.data.version || '1.0.0',
      uptime: response.data.uptime || 'unknown'
    };
  } catch (error) {
    // Validator might not be running locally or on different port
    return {
      healthy: false,
      status: 'not_accessible',
      error: 'Bridge validator not accessible on localhost:3333',
      note: 'This is expected if validator is running elsewhere'
    };
  }
}

async function getEthereumGasPrice() {
  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 1
    }, { timeout: 3000 });
    
    const gasPriceWei = parseInt(response.data.result, 16);
    const gasPriceGwei = gasPriceWei / 1e9;
    
    return {
      wei: gasPriceWei,
      gwei: gasPriceGwei,
      formatted: `${gasPriceGwei.toFixed(2)} gwei`
    };
  } catch (error) {
    return {
      error: 'Unable to fetch gas price',
      estimated: '20 gwei'
    };
  }
}

function generateMockBridgeTransactions(limit, direction) {
  const transactions = [];
  const now = new Date();
  
  for (let i = 0; i < limit; i++) {
    const timestamp = new Date(now.getTime() - (i * 15 * 60 * 1000)); // Every 15 minutes
    const isEthToStellar = direction === 'all' ? Math.random() > 0.5 : direction === 'eth_to_stellar';
    
    transactions.push({
      id: `bridge_${Date.now()}_${i}`,
      direction: isEthToStellar ? 'eth_to_stellar' : 'stellar_to_eth',
      status: Math.random() > 0.1 ? 'completed' : 'pending',
      amount: (Math.random() * 10 + 0.1).toFixed(4),
      asset: isEthToStellar ? 'stETH' : 'pstETH',
      fromAddress: isEthToStellar ? `0x${Math.random().toString(16).slice(2, 42)}` : `G${Math.random().toString(36).slice(2, 56).toUpperCase()}`,
      toAddress: isEthToStellar ? `G${Math.random().toString(36).slice(2, 56).toUpperCase()}` : `0x${Math.random().toString(16).slice(2, 42)}`,
      ethTxHash: isEthToStellar ? `0x${Math.random().toString(16).slice(2, 66)}` : null,
      stellarTxHash: `${Math.random().toString(16).slice(2, 64)}`,
      timestamp: timestamp.toISOString(),
      processingTime: `${Math.floor(Math.random() * 5) + 2} minutes`,
      fees: {
        gas: isEthToStellar ? `${(Math.random() * 0.01).toFixed(6)} ETH` : '100 stroops',
        bridge: '0.1%'
      }
    });
  }
  
  return transactions;
}

function generateBridgeAnalytics(period) {
  const multiplier = period === '24h' ? 1 : period === '7d' ? 7 : 30;
  
  return {
    volume: {
      total: (50000 * multiplier + Math.random() * 10000).toFixed(2),
      ethToStellar: (30000 * multiplier + Math.random() * 5000).toFixed(2),
      stellarToEth: (20000 * multiplier + Math.random() * 5000).toFixed(2),
      currency: 'USD'
    },
    transactions: {
      total: Math.floor(150 * multiplier + Math.random() * 50),
      successful: Math.floor(147 * multiplier + Math.random() * 45),
      pending: Math.floor(2 * multiplier + Math.random() * 5),
      failed: Math.floor(1 * multiplier + Math.random() * 2),
      successRate: '98.5%'
    },
    users: {
      unique: Math.floor(75 * multiplier + Math.random() * 25),
      returning: Math.floor(25 * multiplier + Math.random() * 15),
      new: Math.floor(50 * multiplier + Math.random() * 20)
    },
    assets: {
      stETH: {
        volume: (35000 * multiplier).toFixed(2),
        transactions: Math.floor(100 * multiplier)
      },
      pstETH: {
        volume: (35000 * multiplier).toFixed(2),
        transactions: Math.floor(50 * multiplier)
      }
    },
    performance: {
      averageProcessingTime: '3.2 minutes',
      fastestTransaction: '1.8 minutes',
      slowestTransaction: '8.1 minutes',
      uptime: '99.8%'
    },
    trends: {
      volumeChange: `+${(Math.random() * 20).toFixed(1)}%`,
      transactionChange: `+${(Math.random() * 15).toFixed(1)}%`,
      userGrowth: `+${(Math.random() * 25).toFixed(1)}%`
    }
  };
}

module.exports = router; 