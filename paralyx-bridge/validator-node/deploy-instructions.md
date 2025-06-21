# Paralyx Bridge Validator Node Deployment Instructions

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Ethereum wallet** with testnet ETH for deployments
4. **Stellar testnet account** with XLM for transactions
5. **Redis** (optional, for production scaling)

## Step 1: Deploy Ethereum Contract

First, deploy the LSDLockbox contract to Sepolia testnet:

```bash
cd ../ethereum

# Create .env file from example
cp .env.example .env

# Edit .env file with your credentials:
# PRIVATE_KEY=your_ethereum_private_key_without_0x
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# ETHERSCAN_API_KEY=your_etherscan_api_key

# Install dependencies
npm install

# Deploy contract
npm run deploy:sepolia
```

After deployment, note the contract address from the output.

## Step 2: Configure Validator Node

```bash
cd ../validator-node

# Create .env file from example
cp env.example .env

# Edit .env file with the following required values:
```

### Required Environment Variables

```bash
# Ethereum Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
LOCKBOX_CONTRACT_ADDRESS=0x... # Contract address from step 1
VALIDATOR_PRIVATE_KEY=your_ethereum_private_key

# Stellar Configuration  
STELLAR_SECRET_KEY=your_stellar_secret_key
STELLAR_CONTRACT_ID=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3

# Bridge Configuration
VALIDATOR_ADDRESS=your_ethereum_address
POLL_INTERVAL=5000
CONFIRMATIONS=3
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Test Configuration

```bash
# Test configuration
node -e "
const config = require('./config.js');
if (config.validateConfig()) {
  console.log('✅ Configuration is valid');
} else {
  console.log('❌ Configuration is invalid');
}
"
```

## Step 5: Start Validator Node

```bash
# Development mode (with detailed logging)
npm run dev

# Production mode
npm start

# Background mode
npm run start:background
```

## Step 6: Monitor Operations

The validator node will:

1. **Listen for AssetLocked events** on Ethereum
2. **Process events** with required confirmations
3. **Mint wrapped tokens** on Stellar
4. **Log all operations** to console and files

### Health Check

```bash
# Check if validator is running
curl http://localhost:3001/health

# Check bridge statistics
curl http://localhost:3001/stats
```

## Directory Structure

```
validator-node/
├── config.js              # Configuration management
├── eth-listener.js         # Ethereum event listener
├── stellar-minter.js       # Stellar token minter
├── index.js               # Main coordinator
├── package.json           # Dependencies
├── env.example            # Environment template
├── .env                   # Your configuration (create this)
└── logs/                  # Log files (auto-created)
    ├── bridge.log
    ├── errors.log
    └── transactions.log
```

## Troubleshooting

### Common Issues

1. **"Missing contract address"**
   - Ensure LOCKBOX_CONTRACT_ADDRESS is set in .env
   - Verify the contract is deployed on Sepolia

2. **"Invalid private key"**
   - Check VALIDATOR_PRIVATE_KEY format (no 0x prefix)
   - Ensure the account has testnet ETH

3. **"Stellar transaction failed"**
   - Verify STELLAR_SECRET_KEY is correct
   - Check STELLAR_CONTRACT_ID is valid
   - Ensure testnet XLM balance

4. **"RPC connection failed"**
   - Verify ETHEREUM_RPC_URL is accessible
   - Check API key limits

### Log Locations

- **Bridge operations**: `./logs/bridge.log`
- **Error details**: `./logs/errors.log`
- **Transaction hashes**: `./logs/transactions.log`

## Security Notes

1. **Never commit .env files** to version control
2. **Use separate keys** for testnet and mainnet
3. **Monitor gas costs** for Ethereum transactions
4. **Set appropriate amount limits** in configuration
5. **Enable Redis** for production environments
6. **Use process managers** (PM2) for production deployment

## Production Deployment

For production use:

1. **Use Redis** for event queue management
2. **Set up monitoring** with Prometheus/Grafana
3. **Configure multiple validators** for decentralization
4. **Use proper secrets management** (HashiCorp Vault, AWS Secrets Manager)
5. **Set up alerting** for failed transactions
6. **Use load balancers** for RPC endpoints

## Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify all environment variables are correct
3. Ensure all dependencies are properly installed
4. Test network connectivity to both Ethereum and Stellar
5. Check account balances for both networks 