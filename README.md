# Paralyx Protocol

<div align="center">
  <img src="https://github.com/user-attachments/assets/bd6cac15-b5eb-42f4-a575-2ea209358683" alt="paralyx" width="250"/>
</div>

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-blue.svg)](https://www.stellar.org/)
[![Soroban](https://img.shields.io/badge/Smart%20Contracts-Soroban-purple.svg)](https://soroban.stellar.org/)

</div>

A decentralized cross-chain lending protocol that bridges Ethereum's Liquid Staking Derivatives (LSDs) to Stellar's high-speed, low-cost infrastructure. Paralyx unlocks the potential of $40+ billion in Ethereum LSDs by enabling them as collateral in a sophisticated lending market on Stellar.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployments](#deployments)
4. [Core Features](#core-features)
5. [Repository Structure](#repository-structure)
6. [Installation & Setup](#installation--setup)
7. [Usage Guide](#usage-guide)
8. [Testing](#testing)
9. [Configuration](#configuration)
10. [API Reference](#api-reference)
11. [Error Codes](#error-codes)
12. [Security](#security)
13. [Roadmap](#roadmap)
14. [Contributing](#contributing)
15. [License](#license)

## Overview

Paralyx Protocol addresses the capital inefficiency problem in the liquid staking ecosystem by creating a secure bridge between Ethereum's mature LSD market and Stellar's fast, low-cost infrastructure. The protocol enables users to:

- **Cross-Chain Asset Bridge**: Securely transfer Ethereum LSDs (stETH, wstETH, WETH) to Stellar
- **Interest Earning**: Deposit bridged assets as collateral to earn lending interest
- **Liquidity Access**: Borrow against collateral up to 60% LTV ratio without selling staked assets
- **Automated Operations**: Benefit from automated liquidation mechanisms and dynamic interest rates
- **Cost Efficiency**: Leverage Stellar's sub-penny transaction fees for DeFi operations

## Architecture

### System Components

The protocol consists of a sophisticated multi-chain architecture connecting Ethereum and Stellar networks through a secure bridge validator system.

```
Ethereum Network          Bridge Infrastructure          Stellar Network
┌─────────────────┐      ┌─────────────────┐           ┌─────────────────┐
│ LSDLockbox      │─────▶│ Event Monitor   │──────────▶│ S-Token Minting │
│ Contract        │      │ Validator Node  │           │ Contract        │
│                 │      │                 │           │                 │
│ • Asset Locking │      │ • Event Listen  │           │ • Token Mint    │
│ • Security      │      │ • Validation    │           │ • Supply Track  │
│ • Emergency     │      │ • Cross-Chain   │           │ • Bridge Auth   │
└─────────────────┘      └─────────────────┘           └─────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Lending Protocol│
                         │                 │
                         │ • Collateral    │
                         │ • Borrowing     │
                         │ • Liquidation   │
                         │ • Interest      │
                         └─────────────────┘
```

### Cross-Chain Bridge Flow

1. **Asset Locking**: User locks stETH/wstETH on Ethereum LSDLockbox contract
2. **Event Monitoring**: Bridge validator detects AssetLocked events with block confirmations
3. **Token Minting**: Validator authorizes minting of wrapped tokens (s-stETH) on Stellar
4. **Lending Integration**: User can now use s-stETH as collateral in Stellar lending pool

## Deployments

### Production Testnet Deployment

#### Stellar Testnet Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **Lending Pool** | `CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP` | Deployed & Active |
| **S-Token (pstETH)** | `CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3` | Deployed & Active |
| **Price Oracle** | `CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR` | Deployed & Active |

#### Ethereum Sepolia Testnet

| Component | Address | Status |
|-----------|---------|--------|
| **LSDLockbox Contract** | `0x6164187652d6c123eB124e0b8b08ee42A10A7d86` | Deployed & Active |
| **Bridge Validator** | `GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN` | Running |

#### Supported Assets

| Ethereum Asset | Contract Address | Stellar Wrapper |
|----------------|------------------|----------------|
| **Lido stETH** | `0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af` | s-stETH |
| **Lido wstETH** | `0xB82381A3fBD3FaFA77B3a7bE693342618240067b` | s-wstETH |
| **WETH** | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | s-WETH |

### Contract Verification

**Ethereum (Sepolia)**:
- [LSDLockbox Contract](https://sepolia.etherscan.io/address/0x6164187652d6c123eB124e0b8b08ee42A10A7d86)
- [Deployment Transaction](https://sepolia.etherscan.io/tx/0xbc6dc58ef112b95ed8f53a11e72a10553146f53c0d89b2dc5f77c0c832b1aa01)

**Stellar (Testnet)**:
- [Lending Pool](https://stellar.expert/explorer/testnet/contract/CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP)
- [S-Token](https://stellar.expert/explorer/testnet/contract/CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3)
- [Price Oracle](https://stellar.expert/explorer/testnet/contract/CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR)

## Core Features

### Cross-Chain Asset Bridge
- **Secure Lock-and-Mint Mechanism**: Ethereum assets locked in audited smart contract
- **Real-time Event Monitoring**: Bridge validator with multi-block confirmation system
- **Multi-Asset Support**: stETH, wstETH, WETH with modular expansion capability
- **Emergency Controls**: Pause mechanisms and administrative override capabilities

### Advanced Lending Protocol
- **Over-collateralized Lending**: 60% LTV ratio for conservative risk management
- **Dynamic Interest Rate Model**: Algorithmic rates based on utilization (2-100% APY)
- **Interest-bearing Token System**: S-tokens automatically accrue interest over time
- **Automated Liquidation Engine**: 80% liquidation threshold protects protocol solvency

### Price and Risk Management
- **Real-time Price Oracles**: Accurate price feeds with staleness validation
- **Health Factor Monitoring**: Continuous position health tracking and alerts
- **Reserve Fund Management**: 10% reserve factor for protocol sustainability
- **Liquidation Incentive System**: Competitive liquidation bonuses for participants

## Repository Structure

```
paralyx-protocol/
├── paralyx-protocol/          # Core Stellar contracts
│   ├── contracts/
│   │   ├── lending_pool/      # Main lending logic
│   │   ├── s_token/          # Interest-bearing token
│   │   └── price_oracle/     # Price feed management
│   └── scripts/              # Deployment scripts
├── paralyx-bridge/           # Cross-chain bridge
│   ├── ethereum/             # Ethereum contracts
│   │   ├── contracts/        # LSDLockbox.sol
│   │   └── scripts/          # Deployment scripts
│   └── validator-node/       # Bridge validator
│       ├── eth-listener.js   # Event monitoring
│       ├── stellar-minter.js # Token minting
│       └── index.js         # Coordinator
└── docs/                    # Documentation
```

## Installation & Setup

### System Requirements

- **Rust 1.70+** with `wasm32-unknown-unknown` target
- **Stellar CLI** (latest version)
- **Node.js 18+** and npm
- **Git** version control

### Installation Commands

```bash
# Install Rust and WebAssembly target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli

# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18 && nvm use 18
```

### Project Setup

1. **Clone Repository**:
```bash
git clone https://github.com/paralyx-LSD/paralyx-protocol.git
cd paralyx-protocol
```

2. **Build Stellar Contracts**:
```bash
cd paralyx-protocol
stellar contract build
```

3. **Setup Bridge Validator** (Optional):
```bash
cd ../paralyx-bridge/validator-node
npm install
cp env.example .env
# Configure your keys in .env file
```

4. **Start Bridge Validator**:
```bash
npm start
```

## Usage Guide

### Cross-Chain Bridge Operations

#### Bridging Assets from Ethereum

```javascript
// Example using ethers.js
const lockboxContract = new ethers.Contract(
  "0x6164187652d6c123eB124e0b8b08ee42A10A7d86",
  lockboxABI,
  signer
);

await lockboxContract.lockAsset(
  "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af", // stETH token address
  ethers.parseEther("1.0"), // 1 stETH
  "GDEXAMPLE...YOUR_STELLAR_ADDRESS" // Destination Stellar address
);
```

#### Monitoring Bridge Operations

```bash
# Navigate to validator node directory
cd paralyx-bridge/validator-node

# Monitor bridge logs
tail -f logs/bridge.log

# Check bridge status
npm run status
```

### Lending Protocol Operations

#### Deposit Collateral

```bash
stellar contract invoke \
  --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP \
  --source-account your-account \
  --network testnet \
  -- deposit \
  --user GDEXAMPLE...YOUR_ADDRESS \
  --amount 10000000000  # 1,000 s-stETH (7 decimals)
```

#### Borrow Against Collateral

```bash
stellar contract invoke \
  --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP \
  --source-account your-account \
  --network testnet \
  -- borrow \
  --user GDEXAMPLE...YOUR_ADDRESS \
  --amount 6000000000  # 600 XLM (60% of collateral value)
```

#### Position Management

```bash
# Check health factor
stellar contract invoke \
  --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP \
  --source-account your-account \
  --network testnet \
  -- get_health_factor \
  --user GDEXAMPLE...YOUR_ADDRESS

# Check s-token balance
stellar contract invoke \
  --id CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3 \
  --source-account your-account \
  --network testnet \
  -- balance \
  --user GDEXAMPLE...YOUR_ADDRESS

# Repay loan
stellar contract invoke \
  --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP \
  --source-account your-account \
  --network testnet \
  -- repay \
  --user GDEXAMPLE...YOUR_ADDRESS \
  --amount 3000000000  # 300 XLM repayment
```

## Testing

### Smart Contract Testing

```bash
# Run all contract tests
cd paralyx-protocol
cargo test

# Run individual contract tests
cargo test -p lending_pool
cargo test -p price_oracle  
cargo test -p s_token

# Run tests with output
cargo test -- --nocapture
```

### Bridge Infrastructure Testing

```bash
# Navigate to bridge validator
cd paralyx-bridge/validator-node

# Install dependencies and run tests
npm install
npm test

# Run integration tests
npm run test:integration

# Manual bridge testing
npm run test:bridge
```

### End-to-End Testing

```bash
# Test complete flow: lock → bridge → lend
npm run test:e2e

# Load testing
npm run test:load
```

## Configuration

### Environment Variables

```bash
# Stellar Network Configuration
export STELLAR_NETWORK=testnet
export PRICE_ORACLE=CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR
export S_TOKEN=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
export LENDING_POOL=CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP

# Bridge Configuration
export ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
export ETH_CONTRACT_ADDRESS=0x6164187652d6c123eB124e0b8b08ee42A10A7d86
export STELLAR_ACCOUNT_SECRET=SXXXXXXXXXXXXXXX
export VALIDATOR_PRIVATE_KEY=0xxxxxxxxxxxxxxxx

# Security Configuration
export BRIDGE_CONFIRMATION_BLOCKS=12
export MAX_DAILY_BRIDGE_AMOUNT=1000000000000000000  # 1 ETH equivalent
export EMERGENCY_PAUSE_ENABLED=true
```

### Protocol Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Loan-to-Value Ratio** | 60% | Maximum borrowing percentage against collateral |
| **Liquidation Threshold** | 80% | Position liquidated when LTV exceeds this threshold |
| **Reserve Factor** | 10% | Protocol fee on interest payments |
| **Base Interest Rate** | 2% APY | Minimum borrowing rate |
| **Maximum Interest Rate** | 100% APY | Maximum rate at 100% utilization |
| **Liquidation Bonus** | 5% | Incentive for liquidators |
| **Bridge Confirmation Blocks** | 12 | Required confirmations for bridge operations |

## API Reference

### LendingPool Contract Interface

```rust
#[contractimpl]
impl LendingPoolContract {
    // Core lending functions
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<(), Error>;
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<(), Error>;
    pub fn borrow(env: Env, user: Address, amount: i128) -> Result<(), Error>;
    pub fn repay(env: Env, user: Address, amount: i128) -> Result<(), Error>;
    pub fn liquidate(env: Env, liquidator: Address, borrower: Address, amount: i128) -> Result<(), Error>;

    // View functions
    pub fn get_user_collateral(env: Env, user: Address) -> i128;
    pub fn get_user_debt(env: Env, user: Address) -> i128;
    pub fn get_health_factor(env: Env, user: Address) -> i128;
    pub fn get_interest_rate(env: Env) -> i128;
    pub fn get_utilization_rate(env: Env) -> i128;
}
```

### Price Oracle Contract Interface

```rust
#[contractimpl]
impl PriceOracleContract {
    // Price management
    pub fn set_price(env: Env, asset: Symbol, price: i128) -> Result<(), Error>;
    pub fn set_prices(env: Env, assets: Vec<Symbol>, prices: Vec<i128>) -> Result<(), Error>;
    pub fn get_price(env: Env, asset: Symbol) -> Result<i128, Error>;
    pub fn get_price_unchecked(env: Env, asset: Symbol) -> i128;
    pub fn convert_to_usd(env: Env, asset: Symbol, amount: i128) -> Result<i128, Error>;
    pub fn convert_from_usd(env: Env, asset: Symbol, usd_amount: i128) -> Result<i128, Error>;
}
```

### S-Token Contract Interface

```rust
#[contractimpl]
impl STokenContract {
    // Token operations
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error>;
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error>;
    pub fn underlying_to_s_token(env: Env, amount: i128) -> i128;
    pub fn s_token_to_underlying(env: Env, amount: i128) -> i128;
    pub fn update_exchange_rate(env: Env) -> Result<(), Error>;
    
    // Standard token interface
    pub fn balance(env: Env, user: Address) -> i128;
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error>;
}
```

## Error Codes

| Code | Error Name | Description |
|------|------------|-------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized |
| 2 | `NotInitialized` | Contract has not been initialized |
| 3 | `InsufficientBalance` | User has insufficient balance for operation |
| 4 | `InsufficientCollateral` | Collateral insufficient for borrow amount |
| 5 | `HealthFactorTooLow` | Position below liquidation threshold |
| 6 | `PriceNotFound` | Asset price not available in oracle |
| 7 | `Unauthorized` | Caller not authorized for this operation |
| 8 | `BridgeNotAuthorized` | Bridge validator not authorized |
| 9 | `AssetNotSupported` | Asset not whitelisted for protocol |
| 10 | `AmountTooLarge` | Transaction amount exceeds limits |
| 11 | `MarketPaused` | Market operations are currently paused |
| 12 | `PriceStale` | Oracle price data is stale |

## Security

### Protocol Security Framework

- **Over-collateralization**: All loans require greater than 100% collateral value
- **Automated Liquidation System**: Positions liquidated before protocol insolvency
- **Multi-signature Admin Controls**: Critical functions require multiple signatures
- **Oracle Price Validation**: Multiple price feed sources with staleness checks
- **Emergency Pause Mechanisms**: Circuit breakers for unusual market conditions

### Bridge Security Architecture

- **Multi-block Confirmations**: 12 block confirmations before processing
- **Multi-layer Validation**: Contract-level and bridge-level verification
- **Emergency Controls**: Administrative pause mechanisms for security incidents
- **Transaction Limits**: Daily and per-transaction amount limitations
- **Asset Whitelist System**: Only approved tokens can be bridged

### Security Considerations

- **Smart Contract Risk**: Contracts interact with external protocols and oracles
- **Bridge Risk**: Cross-chain operations involve additional complexity
- **Oracle Risk**: Price feeds could be manipulated or become unavailable
- **Liquidation Risk**: Market volatility could cause liquidations
- **Regulatory Risk**: DeFi protocols may face regulatory changes

### Audit Status

**Current Status**: This protocol is in active development on testnet and has not undergone professional security audits. It is not recommended for production use with mainnet funds.

**Planned Audits**: Security audits are planned before mainnet deployment through reputable blockchain security firms.

## Roadmap

### Phase 1: Core Protocol (Completed)
- Stellar smart contracts development (lending pool, s-token, price oracle)
- Basic lending and borrowing functionality implementation
- Comprehensive testing suite development
- Testnet deployment and validation

### Phase 2: Cross-Chain Bridge (Completed)
- Ethereum LSDLockbox contract development
- Bridge validator infrastructure implementation
- Real-time event monitoring system
- Production deployment on testnets
- Security framework implementation

### Phase 3: Advanced Features (In Development)
- Flash loan functionality implementation
- Governance token design and distribution
- Advanced liquidation strategies
- Additional LSD integrations (rETH, cbETH, ankrETH)
- Yield optimization strategies

### Phase 4: Mainnet Preparation (Planned Q2 2024)
- Comprehensive security audits
- Formal verification of critical functions
- Stress testing and load testing
- Bug bounty program launch
- Documentation completion

### Phase 5: Mainnet Launch (Planned Q3 2024)
- Mainnet deployment on Ethereum and Stellar
- Decentralized validator network establishment
- Insurance fund implementation
- Protocol treasury setup
- Community governance activation

### Phase 6: Ecosystem Expansion (Planned Q4 2024)
- Additional blockchain integrations
- Institutional partnership development
- Advanced financial products
- Mobile application development
- Analytics and reporting tools

## Contributing

### Development Guidelines

We welcome contributions from developers, researchers, and community members. Please follow these guidelines:

1. **Code Quality**: Follow Rust best practices and maintain high code quality standards
2. **Testing**: Ensure >90% test coverage for new features and bug fixes
3. **Documentation**: Document all public functions with comprehensive comments
4. **Security**: Consider security implications of all changes
5. **Compatibility**: Ensure backward compatibility unless breaking changes are necessary

### Contribution Process

1. **Fork the Repository**: Create your own fork of the project
2. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
3. **Implement Changes**: Write clean, well-tested code
4. **Write Tests**: Ensure comprehensive test coverage
5. **Update Documentation**: Keep documentation current with changes
6. **Submit Pull Request**: Provide detailed description of changes
7. **Code Review**: Address feedback from maintainers
8. **Merge**: Approved changes will be merged to main branch

### Development Environment

```bash
# Setup development environment
git clone https://github.com/paralyx-LSD/paralyx-protocol.git
cd paralyx-protocol

# Install dependencies
make install

# Run development server
make dev

# Run tests
make test

# Lint code
make lint
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for complete details.

```
MIT License

Copyright (c) 2024 Paralyx Protocol

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## Disclaimer

**Important Notice**: This software is provided "as is" without warranty of any kind, express or implied. Users are solely responsible for understanding the risks involved in decentralized finance (DeFi) protocols. 

**Risk Factors**:
- Smart contract vulnerabilities
- Market volatility and liquidation risk
- Cross-chain bridge complexity
- Regulatory uncertainty
- Oracle manipulation risks

**Recommendation**: Do not use this protocol with funds you cannot afford to lose. Always conduct thorough research and consider consulting with financial advisors before participating in DeFi protocols.

## Support & Documentation

### Technical Documentation
- **Protocol Documentation**: [docs.md](docs.md)
- **Bridge Architecture Guide**: [paralyx-bridge/docs/README.md](paralyx-bridge/docs/README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Reference**: Available in contract documentation

### Community Support
- **GitHub Issues**: [Create an issue](https://github.com/paralyx-LSD/paralyx-protocol/issues)
- **Bug Reports**: Use GitHub issues with detailed reproduction steps
- **Feature Requests**: Submit enhancement proposals through GitHub
- **Technical Questions**: Tag issues with appropriate labels

### Professional Support
- **Enterprise Integration**: Contact for institutional partnerships
- **Security Audits**: Available upon request for serious integrations
- **Custom Development**: Consulting services for protocol modifications

---

<div align="center">

**Built with Stellar and Soroban | Connecting Ethereum LSDs to Stellar DeFi**

[Documentation](docs.md) • [GitHub](https://github.com/paralyx-LSD/paralyx-protocol) • [Issues](https://github.com/paralyx-LSD/paralyx-protocol/issues)

</div>