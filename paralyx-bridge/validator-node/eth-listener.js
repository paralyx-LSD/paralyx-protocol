const { ethers } = require('ethers');
const winston = require('winston');
const config = require('./config');

// Setup logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'eth-listener' },
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

class EthereumListener {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    this.contract = new ethers.Contract(
      config.ethereum.contractAddress,
      config.abis.lockbox,
      this.provider
    );
    this.lastProcessedBlock = null;
    this.isRunning = false;
    this.eventQueue = [];
  }

  async initialize() {
    try {
      // Validate connection
      const blockNumber = await this.provider.getBlockNumber();
      logger.info('Connected to Ethereum network', { 
        blockNumber,
        chainId: config.ethereum.chainId,
        contractAddress: config.ethereum.contractAddress
      });

      // Set starting block
      if (config.ethereum.startBlock === 'latest') {
        this.lastProcessedBlock = blockNumber;
      } else {
        this.lastProcessedBlock = parseInt(config.ethereum.startBlock);
      }

      logger.info('Ethereum listener initialized', { 
        startBlock: this.lastProcessedBlock 
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Ethereum listener', { error: error.message });
      return false;
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Ethereum listener is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Ethereum event listener...');

    // Start the polling loop
    this.pollForEvents();
  }

  async stop() {
    this.isRunning = false;
    logger.info('Stopping Ethereum event listener...');
  }

  async pollForEvents() {
    while (this.isRunning) {
      try {
        await this.processNewBlocks();
        await this.sleep(config.bridge.pollInterval);
      } catch (error) {
        logger.error('Error in polling loop', { error: error.message });
        await this.sleep(config.bridge.retryDelay);
      }
    }
  }

  async processNewBlocks() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      if (currentBlock <= this.lastProcessedBlock) {
        return; // No new blocks
      }

      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = Math.min(
        currentBlock - Number(config.ethereum.confirmations),
        fromBlock + Number(config.bridge.maxBatchSize) - 1
      );

      if (toBlock < fromBlock) {
        return; // Not enough confirmations yet
      }

      logger.debug('Processing blocks', { fromBlock, toBlock, currentBlock });

      // Get AssetLocked events using ethers.js filter
      const filter = this.contract.filters.AssetLocked();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

      if (events.length > 0) {
        logger.info('Found AssetLocked events', { 
          count: events.length,
          fromBlock,
          toBlock 
        });

        for (const event of events) {
          await this.processAssetLockedEvent(event);
        }
      }

      this.lastProcessedBlock = toBlock;
      
    } catch (error) {
      logger.error('Error processing new blocks', { error: error.message });
    }
  }

  async processAssetLockedEvent(event) {
    try {
      // Ethers.js event structure is different
      const { args, transactionHash, blockNumber, logIndex } = event;
      
      const lockEvent = {
        id: `${transactionHash}-${logIndex}`,
        user: args.user,
        token: args.token,
        amount: args.amount.toString(), // Convert BigInt to string
        stellarAddress: args.stellarAddress,
        stellarSymbol: args.stellarSymbol,
        lockId: args.lockId.toString(), // Convert BigInt to string
        transactionHash,
        blockNumber,
        timestamp: new Date().toISOString(),
        processed: false
      };

      logger.info('Processing AssetLocked event', {
        lockId: lockEvent.lockId,
        user: lockEvent.user,
        amount: lockEvent.amount,
        stellarAddress: lockEvent.stellarAddress,
        transactionHash: lockEvent.transactionHash
      });

      // Validate event data
      if (!this.validateLockEvent(lockEvent)) {
        logger.error('Invalid lock event data', { lockEvent });
        return;
      }

      // Add to processing queue
      this.eventQueue.push(lockEvent);
      
      // Process the event (trigger Stellar minting)
      await this.triggerStellarMinting(lockEvent);
      
    } catch (error) {
      logger.error('Error processing AssetLocked event', { 
        error: error.message,
        event: event.transactionHash 
      });
    }
  }

  validateLockEvent(lockEvent) {
    // Basic validation
    if (!lockEvent.user || !lockEvent.stellarAddress || !lockEvent.amount) {
      return false;
    }

    // Amount validation - convert to BigInt safely
    let amount, minAmount, maxAmount;
    try {
      amount = BigInt(lockEvent.amount.toString());
      minAmount = BigInt(config.security.minAmount.toString());
      maxAmount = BigInt(config.security.maxAmount.toString());

      if (amount < minAmount || amount > maxAmount) {
        logger.warn('Amount out of range', { 
          amount: lockEvent.amount.toString(),
          min: config.security.minAmount.toString(),
          max: config.security.maxAmount.toString()
        });
        return false;
      }
    } catch (error) {
      logger.error('Error validating amount', { error: error.message });
      return false;
    }

    // Token whitelist validation
    if (config.security.enableWhitelist) {
      const tokenLower = lockEvent.token.toLowerCase();
      const whitelistedTokensLower = config.security.whitelistedTokens.map(t => t.toLowerCase());
      if (!whitelistedTokensLower.includes(tokenLower)) {
        logger.warn('Token not whitelisted', { token: lockEvent.token });
        return false;
      }
    }

    // Stellar address format validation
    if (!this.validateStellarAddress(lockEvent.stellarAddress)) {
      logger.warn('Invalid Stellar address format', { 
        stellarAddress: lockEvent.stellarAddress 
      });
      return false;
    }

    return true;
  }

  validateStellarAddress(address) {
    // Basic Stellar address validation
    if (typeof address !== 'string') return false;
    if (address.length !== 56) return false;
    if (!address.startsWith('G')) return false;
    
    // Check character set (base32)
    const validChars = /^[A-Z2-7]+$/;
    return validChars.test(address);
  }

  async triggerStellarMinting(lockEvent) {
    try {
      // Here we would typically send the event to a queue or directly call the Stellar minter
      // For now, we'll use a simple approach and require the stellar-minter to be running
      
      logger.info('Triggering Stellar minting', { 
        lockId: lockEvent.lockId,
        amount: lockEvent.amount,
        stellarAddress: lockEvent.stellarAddress
      });

      // In a production environment, you might:
      // 1. Send to a message queue (Redis, RabbitMQ, etc.)
      // 2. Store in a database for the Stellar minter to pick up
      // 3. Make an HTTP request to the Stellar minter service
      
      // For this implementation, we'll emit a custom event that the Stellar minter can listen to
      process.emit('assetLocked', lockEvent);
      
      lockEvent.processed = true;
      
    } catch (error) {
      logger.error('Error triggering Stellar minting', { 
        error: error.message,
        lockEvent 
      });
    }
  }

  async getProcessedEvents() {
    return this.eventQueue.filter(event => event.processed);
  }

  async getPendingEvents() {
    return this.eventQueue.filter(event => !event.processed);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// If running directly
if (require.main === module) {
  async function main() {
    if (!config.validateConfig()) {
      process.exit(1);
    }

    const listener = new EthereumListener();
    
    if (await listener.initialize()) {
      await listener.start();
    } else {
      logger.error('Failed to initialize Ethereum listener');
      process.exit(1);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await listener.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await listener.stop();
      process.exit(0);
    });
  }

  main().catch(error => {
    logger.error('Fatal error in Ethereum listener', { error: error.message });
    process.exit(1);
  });
}

module.exports = EthereumListener; 