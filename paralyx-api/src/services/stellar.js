const { 
  StellarSdk, 
  Contract, 
  Address,
  nativeToScVal, 
  scValToNative 
} = require('@stellar/stellar-sdk');
const axios = require('axios');
const logger = require('../utils/logger');

class StellarService {
  constructor() {
    this.network = process.env.STELLAR_NETWORK || 'testnet';
    this.horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    this.rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    this.networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
    
    // Contract addresses from environment
    this.contracts = {
      lendingPool: process.env.LENDING_POOL_CONTRACT,
      sToken: process.env.S_TOKEN_CONTRACT,
      priceOracle: process.env.PRICE_ORACLE_CONTRACT
    };
    
    // Initialize clients
    this.server = new StellarSdk.Horizon.Server(this.horizonUrl);
    this.rpcServer = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    
    logger.info('Stellar service initialized', {
      network: this.network,
      contracts: this.contracts
    });
  }

  // Helper to call contract view functions
  async callContract(contractId, method, params = [], caller = null) {
    const start = Date.now();
    
    try {
      // Create contract instance
      const contract = new Contract(contractId);
      
      // Use a dummy source account for view calls
      const sourceKeypair = StellarSdk.Keypair.random();
      const sourceAccount = new StellarSdk.Account(sourceKeypair.publicKey(), '0');
      
      // Build transaction with operation
      const operation = contract.call(method, ...params);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      // Simulate the transaction
      const result = await this.rpcServer.simulateTransaction(transaction);
      
      if (result.error) {
        throw new Error(`Contract call failed: ${result.error}`);
      }
      
      const duration = Date.now() - start;
      logger.logBlockchainCall(`${method}@${contractId}`, 'stellar', result, duration);
      
      // Parse result
      if (result.result?.retval) {
        return scValToNative(result.result.retval);
      }
      
      return null;
      
    } catch (error) {
      const duration = Date.now() - start;
      logger.logBlockchainCall(`${method}@${contractId}`, 'stellar', { error: error.message }, duration);
      throw error;
    }
  }

  // Get user position in lending pool
  async getUserPosition(walletAddress) {
    try {
      const userAddr = Address.fromString(walletAddress);
      
      // Get user balance in lending pool
      const balance = await this.callContract(
        this.contracts.lendingPool,
        'get_user_balance',
        [userAddr.toScVal()]
      );
      
      // Get user debt
      const debt = await this.callContract(
        this.contracts.lendingPool,
        'get_user_debt',
        [userAddr.toScVal()]
      );
      
      // Get user collateral
      const collateral = await this.callContract(
        this.contracts.lendingPool,
        'get_user_collateral',
        [userAddr.toScVal()]
      );
      
      // Get health factor
      const healthFactor = await this.callContract(
        this.contracts.lendingPool,
        'get_health_factor',
        [userAddr.toScVal()]
      );
      
      return {
        walletAddress,
        balance: balance || 0,
        debt: debt || 0,
        collateral: collateral || 0,
        healthFactor: healthFactor || 0,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error fetching user position:', error);
      throw error;
    }
  }

  // Get protocol statistics
  async getProtocolStats() {
    try {
      // Get total supply
      const totalSupply = await this.callContract(
        this.contracts.lendingPool,
        'get_total_supply'
      );
      
      // Get total debt
      const totalDebt = await this.callContract(
        this.contracts.lendingPool,
        'get_total_debt'
      );
      
      // Get utilization rate
      const utilizationRate = await this.callContract(
        this.contracts.lendingPool,
        'get_utilization_rate'
      );
      
      // Get current exchange rate for s-tokens
      const exchangeRate = await this.callContract(
        this.contracts.sToken,
        'get_exchange_rate'
      );
      
      return {
        totalSupply: totalSupply || 0,
        totalDebt: totalDebt || 0,
        utilizationRate: utilizationRate || 0,
        exchangeRate: exchangeRate || 1000000, // 1.0 in 7-decimal format
        totalLiquidity: Math.max(0, (totalSupply || 0) - (totalDebt || 0)),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error fetching protocol stats:', error);
      throw error;
    }
  }

  // Get asset prices from oracle
  async getAssetPrices() {
    try {
      const assets = ['stETH', 'XLM', 'USDC'];
      const prices = {};
      
      for (const asset of assets) {
        try {
          const price = await this.callContract(
            this.contracts.priceOracle,
            'get_price',
            [nativeToScVal(asset, { type: 'string' })]
          );
          prices[asset] = price || 0;
        } catch (error) {
          logger.warn(`Failed to get price for ${asset}:`, error.message);
          prices[asset] = 0;
        }
      }
      
      return {
        prices,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error fetching asset prices:', error);
      throw error;
    }
  }

  // Get current interest rates
  async getInterestRates() {
    try {
      // Get current borrow rate
      const borrowRate = await this.callContract(
        this.contracts.lendingPool,
        'get_borrow_rate'
      );
      
      // Get current supply rate  
      const supplyRate = await this.callContract(
        this.contracts.lendingPool,
        'get_supply_rate'
      );
      
      // Calculate APYs (assuming rates are annual percentages in basis points)
      const borrowAPY = borrowRate ? (borrowRate / 100) : 0; // Convert from basis points to percentage
      const supplyAPY = supplyRate ? (supplyRate / 100) : 0;
      
      return {
        borrowRate: borrowRate || 0,
        supplyRate: supplyRate || 0,
        borrowAPY,
        supplyAPY,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error fetching interest rates:', error);
      throw error;
    }
  }

  // Get user transaction history
  async getUserTransactions(walletAddress, limit = 50, cursor = null) {
    try {
      let query = this.server
        .transactions()
        .forAccount(walletAddress)
        .order('desc')
        .limit(limit);
        
      if (cursor) {
        query = query.cursor(cursor);
      }
      
      const response = await query.call();
      
      // Filter for contract interactions
      const transactions = response.records
        .filter(tx => tx.operation_count > 0)
        .map(tx => ({
          id: tx.id,
          hash: tx.hash,
          created_at: tx.created_at,
          fee_charged: tx.fee_charged,
          operation_count: tx.operation_count,
          successful: tx.successful
        }));
      
      return {
        transactions,
        hasMore: response.records.length === limit,
        nextCursor: response.records.length > 0 ? response.records[response.records.length - 1].paging_token : null
      };
      
    } catch (error) {
      logger.error('Error fetching user transactions:', error);
      throw error;
    }
  }

  // Get account info from Horizon
  async getAccountInfo(walletAddress) {
    try {
      const account = await this.server.loadAccount(walletAddress);
      
      return {
        id: account.id,
        sequence: account.sequence,
        balances: account.balances.map(balance => ({
          asset_type: balance.asset_type,
          asset_code: balance.asset_code,
          asset_issuer: balance.asset_issuer,
          balance: balance.balance
        })),
        signers: account.signers,
        flags: account.flags,
        data: account.data
      };
      
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Account not found on Stellar network');
      }
      logger.error('Error fetching account info:', error);
      throw error;
    }
  }

  // Get network info
  async getNetworkInfo() {
    try {
      const networkInfo = await this.rpcServer.getNetwork();
      const horizonInfo = await axios.get(`${this.horizonUrl}/`);
      
      return {
        network: this.network,
        soroban: {
          friendbotUrl: networkInfo.friendbotUrl,
          passphrase: networkInfo.passphrase
        },
        horizon: {
          version: horizonInfo.data.horizon_version,
          coreVersion: horizonInfo.data.core_version,
          networkPassphrase: horizonInfo.data.network_passphrase
        },
        contracts: this.contracts,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Error fetching network info:', error);
      throw error;
    }
  }

  // Health check for Stellar connectivity
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Test Horizon
      const horizonPromise = this.server.ledgers().limit(1).call();
      
      // Test Soroban RPC
      const rpcPromise = this.rpcServer.getNetwork();
      
      const [horizonResult, rpcResult] = await Promise.all([
        horizonPromise.catch(err => ({ error: err.message })),
        rpcPromise.catch(err => ({ error: err.message }))
      ]);
      
      const duration = Date.now() - start;
      
      return {
        healthy: !horizonResult.error && !rpcResult.error,
        duration: `${duration}ms`,
        horizon: {
          status: horizonResult.error ? 'error' : 'ok',
          error: horizonResult.error
        },
        soroban: {
          status: rpcResult.error ? 'error' : 'ok',
          error: rpcResult.error
        },
        contracts: this.contracts,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Stellar health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const stellarService = new StellarService();

module.exports = stellarService; 