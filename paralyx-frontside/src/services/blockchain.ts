import { 
    Server, 
    Networks, 
    TransactionBuilder, 
    Operation, 
    Asset, 
    Account,
    Keypair,
    Contract,
    SorobanRpc,
    xdr,
    Address,
    nativeToScVal,
    scValToNative
  } from '@stellar/stellar-sdk';
  
  // Configuration
  const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK || 'testnet';
  const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
  const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
  
  // Contract addresses
  const CONTRACTS = {
    LENDING_POOL: import.meta.env.VITE_LENDING_POOL_CONTRACT,
    S_TOKEN: import.meta.env.VITE_S_TOKEN_CONTRACT,
    PRICE_ORACLE: import.meta.env.VITE_PRICE_ORACLE_CONTRACT,
  };
  
  // Initialize servers
  const server = new Server(HORIZON_URL);
  const sorobanServer = new SorobanRpc.Server(SOROBAN_RPC_URL);
  
  // Network configuration
  const network = STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  
  /**
   * Get account information from Stellar network
   */
  export const getAccountInfo = async (publicKey: string) => {
    try {
      const account = await server.loadAccount(publicKey);
      return {
        accountId: account.accountId(),
        sequence: account.sequenceNumber(),
        balances: account.balances.map(balance => ({
          asset: balance.asset_type === 'native' ? 'XLM' : `${balance.asset_code}:${balance.asset_issuer}`,
          balance: balance.balance,
          limit: balance.limit || null
        }))
      };
    } catch (error) {
      console.error('Error loading account:', error);
      throw new Error('Failed to load account information');
    }
  };
  
  /**
   * Get contract balance for a specific token
   */
  export const getContractBalance = async (walletAddress: string, contractAddress: string) => {
    try {
      const contract = new Contract(contractAddress);
      const account = await server.loadAccount(walletAddress);
      
      const operation = contract.call(
        'balance',
        Address.fromString(walletAddress).toScVal()
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      const result = await sorobanServer.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationSuccess(result)) {
        return scValToNative(result.result!.retval);
      }
      
      throw new Error('Failed to get contract balance');
    } catch (error) {
      console.error('Error getting contract balance:', error);
      return 0;
    }
  };
  
  /**
   * Supply tokens to the lending pool
   */
  export const supplyToLendingPool = async (
    walletAddress: string,
    amount: number,
    signTransaction: (xdr: string) => Promise<string>
  ) => {
    try {
      const account = await server.loadAccount(walletAddress);
      const contract = new Contract(CONTRACTS.LENDING_POOL);
      
      // Convert amount to contract format (7 decimal places)
      const contractAmount = Math.floor(amount * 10000000);
      
      const operation = contract.call(
        'supply',
        Address.fromString(walletAddress).toScVal(),
        nativeToScVal(contractAmount, { type: 'i128' })
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100000', // Higher fee for contract calls
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();
      
      // Sign transaction with wallet
      const signedXdr = await signTransaction(transaction.toXDR());
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, network);
      
      // Submit transaction
      const result = await server.submitTransaction(signedTransaction);
      
      return {
        hash: result.hash,
        success: result.successful,
        result: result
      };
      
    } catch (error) {
      console.error('Error supplying to lending pool:', error);
      throw error;
    }
  };
  
  /**
   * Borrow tokens from the lending pool
   */
  export const borrowFromLendingPool = async (
    walletAddress: string,
    amount: number,
    signTransaction: (xdr: string) => Promise<string>
  ) => {
    try {
      const account = await server.loadAccount(walletAddress);
      const contract = new Contract(CONTRACTS.LENDING_POOL);
      
      // Convert amount to contract format
      const contractAmount = Math.floor(amount * 10000000);
      
      const operation = contract.call(
        'borrow',
        Address.fromString(walletAddress).toScVal(),
        nativeToScVal(contractAmount, { type: 'i128' })
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();
      
      const signedXdr = await signTransaction(transaction.toXDR());
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, network);
      
      const result = await server.submitTransaction(signedTransaction);
      
      return {
        hash: result.hash,
        success: result.successful,
        result: result
      };
      
    } catch (error) {
      console.error('Error borrowing from lending pool:', error);
      throw error;
    }
  };
  
  /**
   * Repay borrowed tokens
   */
  export const repayToLendingPool = async (
    walletAddress: string,
    amount: number,
    signTransaction: (xdr: string) => Promise<string>
  ) => {
    try {
      const account = await server.loadAccount(walletAddress);
      const contract = new Contract(CONTRACTS.LENDING_POOL);
      
      const contractAmount = Math.floor(amount * 10000000);
      
      const operation = contract.call(
        'repay',
        Address.fromString(walletAddress).toScVal(),
        nativeToScVal(contractAmount, { type: 'i128' })
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();
      
      const signedXdr = await signTransaction(transaction.toXDR());
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, network);
      
      const result = await server.submitTransaction(signedTransaction);
      
      return {
        hash: result.hash,
        success: result.successful,
        result: result
      };
      
    } catch (error) {
      console.error('Error repaying to lending pool:', error);
      throw error;
    }
  };
  
  /**
   * Withdraw supplied tokens
   */
  export const withdrawFromLendingPool = async (
    walletAddress: string,
    amount: number,
    signTransaction: (xdr: string) => Promise<string>
  ) => {
    try {
      const account = await server.loadAccount(walletAddress);
      const contract = new Contract(CONTRACTS.LENDING_POOL);
      
      const contractAmount = Math.floor(amount * 10000000);
      
      const operation = contract.call(
        'withdraw',
        Address.fromString(walletAddress).toScVal(),
        nativeToScVal(contractAmount, { type: 'i128' })
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();
      
      const signedXdr = await signTransaction(transaction.toXDR());
      const signedTransaction = TransactionBuilder.fromXDR(signedXdr, network);
      
      const result = await server.submitTransaction(signedTransaction);
      
      return {
        hash: result.hash,
        success: result.successful,
        result: result
      };
      
    } catch (error) {
      console.error('Error withdrawing from lending pool:', error);
      throw error;
    }
  };
  
  /**
   * Get user position from lending pool contract
   */
  export const getUserPositionFromContract = async (walletAddress: string) => {
    try {
      const contract = new Contract(CONTRACTS.LENDING_POOL);
      const account = await server.loadAccount(walletAddress);
      
      const operation = contract.call(
        'user_position',
        Address.fromString(walletAddress).toScVal()
      );
      
      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: network,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      
      const result = await sorobanServer.simulateTransaction(transaction);
      
      if (SorobanRpc.Api.isSimulationSuccess(result)) {
        return scValToNative(result.result!.retval);
      }
      
      throw new Error('Failed to get user position');
    } catch (error) {
      console.error('Error getting user position:', error);
      return null;
    }
  };
  
  /**
   * Check if wallet has sufficient balance for transaction
   */
  export const checkSufficientBalance = async (
    walletAddress: string,
    amount: number,
    assetType: 'XLM' | 'CONTRACT'
  ) => {
    try {
      if (assetType === 'XLM') {
        const accountInfo = await getAccountInfo(walletAddress);
        const xlmBalance = accountInfo.balances.find(b => b.asset === 'XLM');
        return xlmBalance ? parseFloat(xlmBalance.balance) >= amount : false;
      } else {
        const contractBalance = await getContractBalance(walletAddress, CONTRACTS.S_TOKEN);
        return contractBalance >= amount * 10000000; // Contract uses 7 decimal places
      }
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  };
  
  /**
   * Monitor transaction status
   */
  export const monitorTransaction = async (hash: string) => {
    try {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          const transaction = await server.transactions().transaction(hash).call();
          return {
            hash: transaction.hash,
            successful: transaction.successful,
            ledger: transaction.ledger,
            createdAt: transaction.created_at
          };
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      throw error;
    }
  };
  
  // Export configuration for use in components
  export const blockchainConfig = {
    network: STELLAR_NETWORK,
    horizonUrl: HORIZON_URL,
    sorobanUrl: SOROBAN_RPC_URL,
    contracts: CONTRACTS
  };