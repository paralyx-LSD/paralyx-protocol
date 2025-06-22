const StellarSdk = require('@stellar/stellar-sdk');
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
  defaultMeta: { service: 'stellar-minter' },
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

class StellarMinter {
  constructor() {
    this.server = null;
    this.rpc = null;
    this.sourceKeypair = null;
    this.isRunning = false;
    this.mintQueue = [];
    this.pendingMints = new Map();
  }

  async initialize() {
    try {
      // Configure Stellar SDK for the appropriate network
      if (config.stellar.network === 'testnet') {
        StellarSdk.Networks.TESTNET = config.stellar.networkPassphrase;
        this.server = new StellarSdk.Horizon.Server(config.stellar.horizonUrl);
        this.rpc = new StellarSdk.SorobanRpc.Server(config.stellar.rpcUrl);
      } else {
        StellarSdk.Networks.PUBLIC = config.stellar.networkPassphrase;
        this.server = new StellarSdk.Horizon.Server(config.stellar.horizonUrl);
        this.rpc = new StellarSdk.SorobanRpc.Server(config.stellar.rpcUrl);
      }

      // Initialize keypair
      this.sourceKeypair = StellarSdk.Keypair.fromSecret(config.stellar.secretKey);
      
      // Validate account exists and is funded
      const account = await this.server.loadAccount(this.sourceKeypair.publicKey());
      
      logger.info('Stellar minter initialized', {
        publicKey: this.sourceKeypair.publicKey(),
        network: config.stellar.network,
        contractId: config.stellar.contractId,
        accountSequence: account.sequenceNumber()
      });

      // Test contract connectivity
      await this.testContractConnectivity();
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Stellar minter', { error: error.message });
      return false;
    }
  }

  async testContractConnectivity() {
    try {
      // Try to call a read-only method on the contract to test connectivity
      const contract = new StellarSdk.Contract(config.stellar.contractId);
      
      // This would be a simple read call to test the contract
      const transaction = new StellarSdk.TransactionBuilder(
        await this.server.loadAccount(this.sourceKeypair.publicKey()),
        {
          fee: '10000',
          networkPassphrase: config.stellar.networkPassphrase,
        }
      )
      .addOperation(contract.call('name')) // Assuming the contract has a name method
      .setTimeout(30)
      .build();

      const simResult = await this.rpc.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simResult)) {
        logger.info('Contract connectivity test successful');
      } else {
        logger.warn('Contract connectivity test failed, but continuing...');
      }
      
    } catch (error) {
      logger.warn('Could not test contract connectivity', { error: error.message });
      // Don't fail initialization just because of this test
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Stellar minter is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Stellar minter...');

    // Listen for events from the Ethereum listener
    process.on('assetLocked', (lockEvent) => {
      this.queueMintOperation(lockEvent);
    });

    // Start processing queue
    this.processMintQueue();
  }

  async stop() {
    this.isRunning = false;
    logger.info('Stopping Stellar minter...');
  }

  queueMintOperation(lockEvent) {
    logger.info('Queueing mint operation', {
      lockId: lockEvent.lockId,
      amount: lockEvent.amount,
      stellarAddress: lockEvent.stellarAddress
    });

    this.mintQueue.push({
      ...lockEvent,
      queuedAt: new Date().toISOString(),
      attempts: 0
    });
  }

  async processMintQueue() {
    while (this.isRunning) {
      try {
        if (this.mintQueue.length > 0) {
          const mintOperation = this.mintQueue.shift();
          await this.processMintOperation(mintOperation);
        } else {
          await this.sleep(1000); // Sleep for 1 second if queue is empty
        }
      } catch (error) {
        logger.error('Error in mint queue processing', { error: error.message });
        await this.sleep(5000); // Sleep for 5 seconds on error
      }
    }
  }

  async processMintOperation(mintOperation) {
    try {
      const { lockId, amount, stellarAddress, stellarSymbol } = mintOperation;

      // Check if this mint has already been processed
      if (this.pendingMints.has(lockId)) {
        logger.warn('Mint operation already pending', { lockId });
        return;
      }

      logger.info('Processing mint operation', {
        lockId,
        amount,
        stellarAddress,
        stellarSymbol
      });

      this.pendingMints.set(lockId, mintOperation);

      // Convert amount from Ethereum format (18 decimals) to Stellar format (7 decimals)
      const stellarAmount = this.convertEthereumAmountToStellar(amount);

      // Create the mint transaction
      const transaction = await this.createMintTransaction(
        stellarAddress,
        stellarAmount,
        lockId
      );

      // Submit the transaction
      const result = await this.submitTransaction(transaction);

      if (result.successful) {
        logger.info('Mint operation successful', {
          lockId,
          stellarAddress,
          amount: stellarAmount,
          transactionHash: result.hash
        });

        this.pendingMints.delete(lockId);
      } else {
        throw new Error(`Transaction failed: ${result.resultXdr}`);
      }

    } catch (error) {
      logger.error('Error processing mint operation', {
        error: error.message,
        lockId: mintOperation.lockId
      });

      // Retry logic
      mintOperation.attempts += 1;
      
      if (mintOperation.attempts < config.bridge.retryAttempts) {
        logger.info('Retrying mint operation', {
          lockId: mintOperation.lockId,
          attempt: mintOperation.attempts
        });
        
        // Re-add to queue for retry
        setTimeout(() => {
          this.mintQueue.push(mintOperation);
        }, config.bridge.retryDelay);
      } else {
        logger.error('Max retry attempts reached for mint operation', {
          lockId: mintOperation.lockId,
          attempts: mintOperation.attempts
        });
        
        // Remove from pending and handle failure
        this.pendingMints.delete(mintOperation.lockId);
        this.handleMintFailure(mintOperation, error);
      }
    }
  }

  async createMintTransaction(stellarAddress, amount, lockId) {
    try {
      // Load the source account
      const sourceAccount = await this.server.loadAccount(this.sourceKeypair.publicKey());
      
      // Create contract instance
      const contract = new StellarSdk.Contract(config.stellar.contractId);
      
      // Create the mint operation
      // Testing with regular mint function first
      const mintOperation = contract.call(
        'mint',
        StellarSdk.Address.fromString(stellarAddress).toScVal(),
        new StellarSdk.XdrLargeInt('i128', amount).toI128()
      );

      // Build the transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '10000000', // 1 XLM base fee (high for Soroban)
        networkPassphrase: config.stellar.networkPassphrase,
      })
      .addOperation(mintOperation)
      .setTimeout(300) // 5 minutes timeout
      .build();

      // Use the server's prepareTransaction method which handles simulation and assembly
      const preparedTransaction = await this.rpc.prepareTransaction(transaction);

      // Sign the prepared transaction
      preparedTransaction.sign(this.sourceKeypair);

      return preparedTransaction;

    } catch (error) {
      logger.error('Error creating mint transaction', { error: error.message });
      throw error;
    }
  }

  async submitTransaction(transaction) {
    try {
      // Submit to Stellar network
      const response = await this.rpc.sendTransaction(transaction);
      
      if (response.status === 'PENDING') {
        // Wait for transaction confirmation
        const hash = response.hash;
        logger.info('Transaction submitted, waiting for confirmation', { hash });
        
        const result = await this.waitForTransaction(hash);
        return result;
      } else {
        throw new Error(`Transaction submission failed: ${response.status}`);
      }

    } catch (error) {
      logger.error('Error submitting transaction', { error: error.message });
      throw error;
    }
  }

  async waitForTransaction(hash, maxWaitTime = 300000) { // 5 minutes max wait
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.rpc.getTransaction(hash);
        
        if (response.status === 'SUCCESS') {
          return {
            successful: true,
            hash: hash,
            resultXdr: response.resultXdr
          };
        } else if (response.status === 'FAILED') {
          return {
            successful: false,
            hash: hash,
            resultXdr: response.resultXdr
          };
        }
        
        // If still pending, wait and check again
        await this.sleep(2000); // Wait 2 seconds before checking again
        
      } catch (error) {
        if (error.message.includes('404')) {
          // Transaction not found yet, wait and try again
          await this.sleep(2000);
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Transaction confirmation timeout');
  }

  convertEthereumAmountToStellar(ethereumAmount) {
    // Convert from Ethereum's 18 decimals to Stellar's 7 decimals
    // This is a simple conversion - you might need more sophisticated logic
    const eth18 = BigInt(ethereumAmount);
    const stellar7 = eth18 / BigInt(10 ** 11); // Divide by 10^11 to go from 18 to 7 decimals
    return stellar7.toString();
  }

  async handleMintFailure(mintOperation, error) {
    // Log the failure
    logger.error('Mint operation failed permanently', {
      lockId: mintOperation.lockId,
      error: error.message,
      attempts: mintOperation.attempts
    });

    // In a production system, you might:
    // 1. Send an alert/notification
    // 2. Store the failure in a database for manual review
    // 3. Trigger a manual intervention process
    // 4. Initiate a refund process on Ethereum
  }

  async getQueueStatus() {
    return {
      queueLength: this.mintQueue.length,
      pendingMints: this.pendingMints.size,
      isRunning: this.isRunning
    };
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

    const minter = new StellarMinter();
    
    if (await minter.initialize()) {
      await minter.start();
    } else {
      logger.error('Failed to initialize Stellar minter');
      process.exit(1);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await minter.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await minter.stop();
      process.exit(0);
    });
  }

  main().catch(error => {
    logger.error('Fatal error in Stellar minter', { error: error.message });
    process.exit(1);
  });
}

module.exports = StellarMinter; 