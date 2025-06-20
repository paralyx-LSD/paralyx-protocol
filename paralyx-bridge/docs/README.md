# Paralyx Protocol Cross-Chain Bridge

## Overview

The Paralyx Bridge enables secure transfer of Liquid Staking Derivatives (LSDs) from Ethereum to Stellar network, where they can be used as collateral in the Paralyx lending protocol. The bridge uses a lock-and-mint mechanism with validator consensus to ensure security and reliability.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Paralyx Cross-Chain Bridge                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐ │
│  │   Ethereum      │           │   Validator     │           │    Stellar      │ │
│  │                 │           │     Node        │           │                 │ │
│  │ ┌─────────────┐ │    Lock   │ ┌─────────────┐ │   Mint    │ ┌─────────────┐ │ │
│  │ │ LSDLockbox  │ │◄─────────►│ │ Bridge      │ │◄─────────►│ │ S-Token     │ │ │
│  │ │ Contract    │ │  Events   │ │ Coordinator │ │ Commands  │ │ Contract    │ │ │
│  │ └─────────────┘ │           │ └─────────────┘ │           │ └─────────────┘ │ │
│  │                 │           │                 │           │                 │ │
│  │ • Lock stETH    │           │ • Event Monitor │           │ • Mint s-stETH  │ │
│  │ • Emit Events   │           │ • Validation    │           │ • Track Supply  │ │
│  │ • Emergency     │           │ • Transaction   │           │ • Bridge Auth   │ │
│  │   Controls      │           │   Execution     │           │   Controls      │ │
│  └─────────────────┘           └─────────────────┘           └─────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Ethereum LSDLockbox Contract

**Purpose**: Securely lock ERC20 LSD tokens on Ethereum and emit events for bridge validators.

**Key Features**:
- Multi-token support (stETH, rETH, cbETH)
- Minimum/maximum amount validation
- Stellar address format validation
- Emergency controls and pause mechanism
- Validator authorization system

**Main Functions**:
- `lockAsset(token, amount, stellarAddress)` - Lock tokens and emit AssetLocked event
- `setSupportedToken(token, symbol, supported)` - Add/remove supported tokens
- `setValidator(validator, authorized)` - Manage authorized validators
- `emergencyUnlock(lockId)` - Emergency unlock (admin only)

### 2. Bridge Validator Node

**Purpose**: Monitor Ethereum events and execute corresponding actions on Stellar.

**Components**:
- **Ethereum Listener** (`eth-listener.js`): Monitors LSDLockbox for AssetLocked events
- **Stellar Minter** (`stellar-minter.js`): Mints wrapped tokens on Stellar
- **Bridge Coordinator** (`index.js`): Orchestrates the entire bridge operation

**Key Features**:
- Real-time event monitoring with confirmation requirements
- Robust retry mechanisms and error handling
- Transaction queuing and processing
- Health monitoring and statistics
- Graceful shutdown and restart capabilities

### 3. Stellar S-Token Contract Integration

**Purpose**: Mint wrapped tokens on Stellar when assets are locked on Ethereum.

**Integration Points**:
- Bridge validator calls `mint()` function
- Amount conversion (18 decimals → 7 decimals)
- Supply tracking and validation
- Access control for bridge operations

## Installation and Setup

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Ethereum RPC Access** (Infura, Alchemy, or local node)
3. **Stellar Account** with sufficient XLM for operations
4. **Deployed Contracts** on both networks

### Ethereum Contract Deployment

1. **Install dependencies**:
```bash
cd paralyx-bridge/ethereum
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your Ethereum RPC URL and private key
```

3. **Deploy contract**:
```bash
npm run deploy:sepolia
```

4. **Verify contract** (optional):
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Validator Node Setup

1. **Install dependencies**:
```bash
cd paralyx-bridge/validator-node
npm install
```

2. **Configure environment**:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Required Configuration**:
```bash
# Ethereum
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
LOCKBOX_CONTRACT_ADDRESS=0x... # From deployment step
VALIDATOR_PRIVATE_KEY=0x... # Authorized validator key

# Stellar
STELLAR_SECRET_KEY=S... # Validator's Stellar secret key
STELLAR_CONTRACT_ID=C... # S-Token contract address
```

4. **Start the bridge**:
```bash
npm start
```

## Bridge Operations

### Lock Assets on Ethereum

```javascript
// Using ethers.js
const lockbox = new ethers.Contract(contractAddress, abi, signer);

await lockbox.lockAsset(
  "0x...", // stETH token address
  ethers.utils.parseEther("1.0"), // 1 stETH
  "GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE" // Stellar address
);
```

### Monitor Bridge Operations

```bash
# Check bridge status
npm run status

# View logs
tail -f logs/bridge.log

# Monitor specific services
npm run eth-listener
npm run stellar-minter
```

### Query Operations

```javascript
// Check lock information
const lockInfo = await lockbox.getLockInfo(lockId);

// Check supported tokens
const [supported, symbol] = await lockbox.getTokenInfo(tokenAddress);

// Check user deposits
const deposits = await lockbox.getUserDeposits(userAddress, tokenAddress);
```

## Security Features

### Multi-Layer Validation

1. **Contract Level**:
   - Token whitelist validation
   - Amount range validation
   - Stellar address format validation
   - Reentrancy protection

2. **Bridge Level**:
   - Event confirmation requirements
   - Duplicate transaction prevention
   - Retry mechanisms with limits
   - Health monitoring

3. **Access Control**:
   - Validator authorization system
   - Admin emergency controls
   - Pausable operations

### Emergency Procedures

1. **Pause Bridge Operations**:
```bash
# Emergency pause (admin only)
await lockbox.pause();
```

2. **Emergency Unlock**:
```bash
# Unlock specific transaction (admin only)
await lockbox.emergencyUnlock(lockId);
```

3. **Bridge Restart**:
```bash
# Restart bridge coordinator
node index.js restart
```

## Monitoring and Maintenance

### Health Checks

The bridge coordinator performs automatic health checks every 30 seconds:
- Ethereum listener status
- Stellar minter queue status
- Network connectivity
- Transaction processing rates

### Logging

Comprehensive logging system with configurable levels:
- **Error**: Critical issues requiring attention
- **Warn**: Important events that may need monitoring
- **Info**: General operational information
- **Debug**: Detailed debugging information

### Metrics

Key metrics tracked:
- Total events processed
- Processing times
- Error rates
- Queue lengths
- Network latency

## Troubleshooting

### Common Issues

1. **Connection Errors**:
```bash
# Check RPC endpoints
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $ETHEREUM_RPC_URL
```

2. **Transaction Failures**:
```bash
# Check gas prices and limits
# Verify account balances
# Review transaction logs
```

3. **Event Processing Delays**:
```bash
# Check confirmation requirements
# Verify network congestion
# Review queue backlogs
```

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug npm start
```

### Recovery Procedures

1. **Manual Event Processing**:
   - Stop bridge
   - Note last processed block
   - Restart with specific start block
   - Monitor for missed events

2. **Transaction Recovery**:
   - Query pending mints
   - Check transaction status
   - Manual retry if needed

## Development

### Testing

```bash
# Run Ethereum contract tests
cd ethereum && npm test

# Run bridge integration tests
cd validator-node && npm test
```

### Local Development

1. **Start local Ethereum node**:
```bash
npx hardhat node
```

2. **Deploy contracts locally**:
```bash
npm run deploy:local
```

3. **Run bridge with test configuration**:
```bash
npm run dev
```

## Production Deployment

### Security Checklist

- [ ] Private keys securely stored
- [ ] RPC endpoints are reliable
- [ ] Monitoring and alerting configured
- [ ] Emergency procedures documented
- [ ] Validator authorization properly set
- [ ] Token whitelist configured
- [ ] Amount limits appropriate

### Scaling Considerations

- Multiple validator nodes for redundancy
- Load balancing for RPC calls
- Database for persistent storage
- Message queuing for high throughput
- Monitoring and alerting systems

## API Reference

### LSDLockbox Contract

#### Events

```solidity
event AssetLocked(
    address indexed user,
    address indexed token,
    uint256 amount,
    string stellarAddress,
    string stellarSymbol,
    uint256 indexed lockId
);

event AssetUnlocked(
    address indexed user,
    address indexed token,
    uint256 amount,
    uint256 indexed lockId
);
```

#### Functions

```solidity
function lockAsset(address token, uint256 amount, string calldata stellarAddress) external;
function setSupportedToken(address token, string calldata stellarSymbol, bool supported) external;
function setValidator(address validator, bool authorized) external;
function emergencyUnlock(uint256 lockId) external;
```

### Bridge API

#### Configuration

```javascript
const config = require('./config');
// Access all configuration options
```

#### Bridge Coordinator

```javascript
const BridgeCoordinator = require('./index');
const coordinator = new BridgeCoordinator();

await coordinator.initialize();
await coordinator.start();
const status = await coordinator.getStatus();
```

## Support

For technical support and questions:
- GitHub Issues: [Paralyx Protocol Issues](https://github.com/paralyx-protocol/issues)
- Documentation: [Bridge Documentation](https://docs.paralyx.fi/bridge)
- Community: [Discord](https://discord.gg/paralyx) 