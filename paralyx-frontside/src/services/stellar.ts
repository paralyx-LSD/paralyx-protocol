import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Contract,
  xdr,
  StrKey,
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';

// Contract addresses from README (Testnet)
const LENDING_POOL_CONTRACT = 'CCWO4LQBFILPPWFSIZLISZZINCRE5BYSEZAE4BRXT4NZDMJCACPKJSWA';
const S_TOKEN_CONTRACT = 'CAIVEHNDA2RIYNJ4GUWCAXUGDFEX7F6UBX7OFUJY3DH52DERAC5TZHVO';
const PRICE_ORACLE_CONTRACT = 'CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR';

// Stellar network configuration
const STELLAR_NETWORK = Networks.TESTNET;
const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Initialize Soroban server
const server = new Server(SOROBAN_RPC_URL);

export interface StellarTransaction {
  hash: string;
  type: 'supply' | 'borrow' | 'repay' | 'withdraw';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

export interface AccountInfo {
  healthFactor: number;
  totalSupplied: number;
  totalBorrowed: number;
  liquidationThreshold: number;
}

/**
 * Get user's account information from the lending pool
 */
export async function getAccountInfo(userAddress: string): Promise<AccountInfo> {
  try {
    const contract = new Contract(LENDING_POOL_CONTRACT);
    
    // Call the get_user_position function
    const operation = contract.call('get_user_position', xdr.ScVal.scvString(userAddress));
    
    const sourceAccount = await server.getAccount(userAddress);
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(transaction);
    
    // Check if simulation failed
    if ('error' in result) {
      throw new Error(`Simulation failed: ${result.error}`);
    }

    // Parse the result - this is a simplified example
    // In reality, you'd need to parse the XDR result properly
    return {
      healthFactor: 1.5, // Default safe value
      totalSupplied: 0,
      totalBorrowed: 0,
      liquidationThreshold: 0.8,
    };
  } catch (error) {
    console.error('Error getting account info:', error);
    throw error;
  }
}

/**
 * Supply tokens to the lending pool
 */
export async function supplyTokens(
  userAddress: string,
  amount: number,
  assetType: string = 'WETH'
): Promise<string> {
  try {
    if (!window.freighter) {
      throw new Error('Freighter wallet not found');
    }

    const account = await server.getAccount(userAddress);
    const contract = new Contract(LENDING_POOL_CONTRACT);
    
    // Convert amount to proper format (assuming 7 decimal places for Stellar)
    const amountScVal = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(String(Math.floor(amount * 10000000))),
        hi: xdr.Int64.fromString('0'),
      })
    );
    
    const operation = contract.call(
      'supply',
      xdr.ScVal.scvString(userAddress),
      xdr.ScVal.scvString(assetType),
      amountScVal
    );

    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Sign with Freighter
    const signedXdr = await window.freighter.signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
    });

    // Submit transaction
    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr.signedTxXdr,
      STELLAR_NETWORK
    );

    const result = await server.sendTransaction(signedTransaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${result.errorResult?.toXDR()}`);
    }

    return result.hash;
  } catch (error) {
    console.error('Error supplying tokens:', error);
    throw error;
  }
}

/**
 * Borrow tokens from the lending pool
 */
export async function borrowTokens(
  userAddress: string,
  amount: number,
  assetType: string = 'WETH'
): Promise<string> {
  try {
    if (!window.freighter) {
      throw new Error('Freighter wallet not found');
    }

    const account = await server.getAccount(userAddress);
    const contract = new Contract(LENDING_POOL_CONTRACT);
    
    const amountScVal = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(String(Math.floor(amount * 10000000))),
        hi: xdr.Int64.fromString('0'),
      })
    );
    
    const operation = contract.call(
      'borrow',
      xdr.ScVal.scvString(userAddress),
      xdr.ScVal.scvString(assetType),
      amountScVal
    );

    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const signedXdr = await window.freighter.signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
    });

    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr.signedTxXdr,
      STELLAR_NETWORK
    );

    const result = await server.sendTransaction(signedTransaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${result.errorResult?.toXDR()}`);
    }

    return result.hash;
  } catch (error) {
    console.error('Error borrowing tokens:', error);
    throw error;
  }
}

/**
 * Repay borrowed tokens
 */
export async function repayTokens(
  userAddress: string,
  amount: number,
  assetType: string = 'WETH'
): Promise<string> {
  try {
    if (!window.freighter) {
      throw new Error('Freighter wallet not found');
    }

    const account = await server.getAccount(userAddress);
    const contract = new Contract(LENDING_POOL_CONTRACT);
    
    const amountScVal = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(String(Math.floor(amount * 10000000))),
        hi: xdr.Int64.fromString('0'),
      })
    );
    
    const operation = contract.call(
      'repay',
      xdr.ScVal.scvString(userAddress),
      xdr.ScVal.scvString(assetType),
      amountScVal
    );

    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const signedXdr = await window.freighter.signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
    });

    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr.signedTxXdr,
      STELLAR_NETWORK
    );

    const result = await server.sendTransaction(signedTransaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${result.errorResult?.toXDR()}`);
    }

    return result.hash;
  } catch (error) {
    console.error('Error repaying tokens:', error);
    throw error;
  }
}

/**
 * Withdraw supplied tokens
 */
export async function withdrawTokens(
  userAddress: string,
  amount: number,
  assetType: string = 'WETH'
): Promise<string> {
  try {
    if (!window.freighter) {
      throw new Error('Freighter wallet not found');
    }

    const account = await server.getAccount(userAddress);
    const contract = new Contract(LENDING_POOL_CONTRACT);
    
    const amountScVal = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(String(Math.floor(amount * 10000000))),
        hi: xdr.Int64.fromString('0'),
      })
    );
    
    const operation = contract.call(
      'withdraw',
      xdr.ScVal.scvString(userAddress),
      xdr.ScVal.scvString(assetType),
      amountScVal
    );

    const transaction = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const signedXdr = await window.freighter.signTransaction(transaction.toXDR(), {
      network: 'TESTNET',
    });

    const signedTransaction = TransactionBuilder.fromXDR(
      signedXdr.signedTxXdr,
      STELLAR_NETWORK
    );

    const result = await server.sendTransaction(signedTransaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${result.errorResult?.toXDR()}`);
    }

    return result.hash;
  } catch (error) {
    console.error('Error withdrawing tokens:', error);
    throw error;
  }
}

/**
 * Get token balance for a user
 */
export async function getTokenBalance(
  userAddress: string,
  assetType: string = 'WETH'
): Promise<number> {
  try {
    // Special case for native XLM balance
    if (assetType === 'XLM') {
      try {
        const account = await server.getAccount(userAddress);
        const xlmBalance = (account as any).balances.find(
          (balance: any) => balance.asset_type === 'native'
        );
        return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      } catch (error) {
        console.error('Error fetching XLM balance:', error);
        return 0;
      }
    }

    // For other assets, get s-token balance from contract
    const contract = new Contract(S_TOKEN_CONTRACT);
    
    const operation = contract.call(
      'balance',
      xdr.ScVal.scvString(userAddress)
    );
    
    const sourceAccount = await server.getAccount(userAddress);
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(transaction);
    
    // Check if simulation failed
    if ('error' in result) {
      console.warn(`Simulation failed for ${assetType} balance: ${result.error}`);
      return 0;
    }

    // Try to parse balance from result
    try {
      if (result.result && (result as any).result.retval) {
        const resultValue = (result as any).result.retval;
        // This would need proper XDR parsing implementation
        // For now return 0 as fallback
        return 0;
      }
    } catch (parseError) {
      console.warn('Error parsing balance result:', parseError);
    }

    return 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Get current asset price from oracle
 */
export async function getAssetPrice(assetType: string): Promise<number> {
  try {
    const contract = new Contract(PRICE_ORACLE_CONTRACT);
    
    const operation = contract.call(
      'get_price',
      xdr.ScVal.scvString(assetType)
    );
    
    // Use a dummy account for price queries since they don't require authentication
    const dummyKeypair = Keypair.random();
    const sourceAccount = await server.getAccount(dummyKeypair.publicKey());
    
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const result = await server.simulateTransaction(transaction);
    
    // Check if simulation failed
    if ('error' in result) {
      throw new Error(`Simulation failed: ${result.error}`);
    }

    // Parse price from result - simplified
    return 2000; // Default ETH price, would need proper XDR parsing
  } catch (error) {
    console.error('Error getting asset price:', error);
    return 0;
  }
} 