const winston = require('winston');
const config = require('./config');
const EthereumListener = require('./eth-listener');
const StellarMinter = require('./stellar-minter');

// Setup logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bridge-coordinator' },
  transports: [
    new winston.transports.File({ filename: config.logging.file }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class BridgeCoordinator {
  constructor() {
    this.ethereumListener = null;
    this.stellarMinter = null;
    this.isRunning = false;
    this.startTime = null;
    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      lastProcessedEvent: null
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Paralyx Bridge Coordinator...');

      // Validate configuration
      if (!config.validateConfig()) {
        throw new Error('Invalid configuration');
      }

      // Create logs directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const logDir = path.dirname(config.logging.file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Initialize Ethereum listener
      this.ethereumListener = new EthereumListener();
      if (!(await this.ethereumListener.initialize())) {
        throw new Error('Failed to initialize Ethereum listener');
      }

      // Initialize Stellar minter
      this.stellarMinter = new StellarMinter();
      if (!(await this.stellarMinter.initialize())) {
        throw new Error('Failed to initialize Stellar minter');
      }

      logger.info('Bridge coordinator initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize bridge coordinator', { error: error.message });
      return false;
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Bridge coordinator is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.startTime = new Date();

      logger.info('Starting Paralyx Bridge Coordinator...', {
        ethereumNetwork: config.ethereum.chainId,
        stellarNetwork: config.stellar.network,
        contractAddress: config.ethereum.contractAddress,
        stellarContractId: config.stellar.contractId
      });

      // Start Stellar minter first
      await this.stellarMinter.start();
      logger.info('Stellar minter started');

      // Start Ethereum listener
      await this.ethereumListener.start();
      logger.info('Ethereum listener started');

      // Start monitoring
      this.startMonitoring();

      logger.info('Bridge coordinator is now running and monitoring for cross-chain transactions');

    } catch (error) {
      logger.error('Failed to start bridge coordinator', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      logger.warn('Bridge coordinator is not running');
      return;
    }

    try {
      logger.info('Stopping bridge coordinator...');
      this.isRunning = false;

      // Stop Ethereum listener first
      if (this.ethereumListener) {
        await this.ethereumListener.stop();
        logger.info('Ethereum listener stopped');
      }

      // Stop Stellar minter
      if (this.stellarMinter) {
        await this.stellarMinter.stop();
        logger.info('Stellar minter stopped');
      }

      logger.info('Bridge coordinator stopped successfully');

    } catch (error) {
      logger.error('Error stopping bridge coordinator', { error: error.message });
    }
  }

  startMonitoring() {
    // Monitor system health every 30 seconds
    const monitorInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(monitorInterval);
        return;
      }

      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
      }
    }, 30000); // 30 seconds

    // Log stats every 5 minutes
    const statsInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(statsInterval);
        return;
      }

      try {
        await this.logStats();
      } catch (error) {
        logger.error('Stats logging failed', { error: error.message });
      }
    }, 300000); // 5 minutes
  }

  async performHealthCheck() {
    const health = {
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      ethereumListener: {
        isRunning: this.ethereumListener?.isRunning || false,
        processedEvents: await this.ethereumListener?.getProcessedEvents() || [],
        pendingEvents: await this.ethereumListener?.getPendingEvents() || []
      },
      stellarMinter: {
        isRunning: this.stellarMinter?.isRunning || false,
        queueStatus: await this.stellarMinter?.getQueueStatus() || {}
      },
      stats: this.stats
    };

    logger.debug('Bridge health check', health);

    // Check for any critical issues
    if (!health.ethereumListener.isRunning) {
      logger.warn('Ethereum listener is not running');
    }

    if (!health.stellarMinter.isRunning) {
      logger.warn('Stellar minter is not running');
    }

    return health;
  }

  async logStats() {
    const processedEvents = await this.ethereumListener?.getProcessedEvents() || [];
    const pendingEvents = await this.ethereumListener?.getPendingEvents() || [];
    const queueStatus = await this.stellarMinter?.getQueueStatus() || {};

    const stats = {
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      processedEvents: processedEvents.length,
      pendingEvents: pendingEvents.length,
      mintQueue: queueStatus.queueLength || 0,
      pendingMints: queueStatus.pendingMints || 0,
      totalProcessed: this.stats.totalProcessed,
      totalErrors: this.stats.totalErrors
    };

    logger.info('Bridge statistics', stats);
  }

  async restart() {
    logger.info('Restarting bridge coordinator...');
    await this.stop();
    await this.sleep(5000); // Wait 5 seconds
    await this.start();
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      stats: this.stats,
      health: await this.performHealthCheck()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const coordinator = new BridgeCoordinator();

  // Handle CLI arguments
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      if (await coordinator.initialize()) {
        await coordinator.start();
      } else {
        logger.error('Failed to initialize bridge coordinator');
        process.exit(1);
      }
      break;

    case 'status':
      logger.info('Bridge status check not implemented in standalone mode');
      process.exit(0);
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
Paralyx Bridge Coordinator

Usage: node index.js [command]

Commands:
  start     Start the bridge coordinator (default)
  status    Check bridge status (requires running instance)
  help      Show this help message

Environment Variables:
  See .env.example for required configuration

Examples:
  node index.js start
  npm start
      `);
      process.exit(0);
      break;

    default:
      // Default to start if no command specified
      if (await coordinator.initialize()) {
        await coordinator.start();
      } else {
        logger.error('Failed to initialize bridge coordinator');
        process.exit(1);
      }
  }

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await coordinator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await coordinator.stop();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
  });
}

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error in bridge coordinator', { error: error.message });
    process.exit(1);
  });
}

module.exports = BridgeCoordinator; 