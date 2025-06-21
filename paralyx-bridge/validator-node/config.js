require('dotenv').config();

const config = {
  // Ethereum Configuration
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/f96264cf853c424ab5678e8301ca0462',
    chainId: process.env.ETHEREUM_CHAIN_ID || 11155111, // Sepolia testnet
    contractAddress: process.env.LOCKBOX_CONTRACT_ADDRESS,
    privateKey: process.env.VALIDATOR_PRIVATE_KEY,
    startBlock: process.env.START_BLOCK || 'latest',
    confirmations: parseInt(process.env.CONFIRMATIONS) || 3,
    gasLimit: process.env.GAS_LIMIT || '200000',
    gasPrice: process.env.GAS_PRICE || '20000000000', // 20 gwei
  },

  // Stellar Configuration
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet', // 'testnet' or 'mainnet'
    horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    rpcUrl: process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
    secretKey: process.env.STELLAR_SECRET_KEY,
    contractId: process.env.STELLAR_CONTRACT_ID,
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  },

  // Bridge Configuration
  bridge: {
    validatorAddress: process.env.VALIDATOR_ADDRESS,
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 5000, // 5 seconds
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 10000, // 10 seconds
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE) || 10,
  },

  // Redis Configuration (for event queue)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.REDIS_ENABLED === 'true',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/bridge.log',
  },

  // Security Configuration
  security: {
    maxAmount: process.env.MAX_BRIDGE_AMOUNT || '1000000000000000000000', // 1000 tokens
    minAmount: process.env.MIN_BRIDGE_AMOUNT || '1000000000000000', // 0.001 tokens
    enableWhitelist: process.env.ENABLE_WHITELIST === 'true',
    whitelistedTokens: process.env.WHITELISTED_TOKENS ? process.env.WHITELISTED_TOKENS.split(',') : [],
  },

  // Contract ABIs
  abis: {
    lockbox: [
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
          {"indexed": false, "internalType": "string", "name": "stellarAddress", "type": "string"},
          {"indexed": false, "internalType": "string", "name": "stellarSymbol", "type": "string"},
          {"indexed": true, "internalType": "uint256", "name": "lockId", "type": "uint256"}
        ],
        "name": "AssetLocked",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
          {"indexed": true, "internalType": "uint256", "name": "lockId", "type": "uint256"}
        ],
        "name": "AssetUnlocked",
        "type": "event"
      }
    ]
  }
};

// Validation
function validateConfig() {
  const required = [
    'ETHEREUM_RPC_URL',
    'LOCKBOX_CONTRACT_ADDRESS', 
    'VALIDATOR_PRIVATE_KEY',
    'STELLAR_SECRET_KEY',
    'STELLAR_CONTRACT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file');
    return false;
  }
  
  return true;
}

module.exports = {
  ...config,
  validateConfig
}; 