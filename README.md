# Paralyx Protocol

A decentralized lending and borrowing protocol built on the Stellar blockchain, enabling users to collateralize Liquid Staking Derivatives (LSDs) to access liquidity without selling their underlying staked assets.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Smart Contracts](#smart-contracts)
4. [Installation](#installation)
5. [Building the Project](#building-the-project)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Usage](#usage)
9. [Contract Addresses](#contract-addresses)
10. [API Reference](#api-reference)
11. [Contributing](#contributing)
12. [License](#license)

## Overview

Paralyx Protocol addresses the capital inefficiency problem in the liquid staking ecosystem by creating a bridge between Ethereum's mature LSD market and Stellar's fast, low-cost infrastructure. The protocol enables users to:

- Deposit assets as collateral to earn interest
- Borrow against their collateral up to a specified Loan-to-Value (LTV) ratio
- Receive interest-bearing tokens (sTokens) representing their deposits
- Participate in automated liquidation mechanisms to maintain protocol solvency

### Key Features

- **Over-collateralized Lending**: Users must provide collateral worth more than their borrowed amount
- **Dynamic Interest Rates**: Rates adjust based on supply and demand (utilization rates)
- **Interest-bearing Tokens**: Depositors receive sTokens that accrue interest over time
- **Real-time Price Oracles**: Reliable price feeds for accurate asset valuation
- **Automated Liquidation**: Protects protocol solvency through threshold-based liquidations
- **Cross-chain Compatibility**: Designed for bridged assets from Ethereum

## Architecture

The protocol consists of three main smart contracts deployed on the Stellar network:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PriceOracle   │    │   LendingPool   │    │     SToken      │
│                 │    │                 │    │                 │
│ - Price feeds   │◄───┤ - Deposits      │────┤ - Interest      │
│ - Freshness     │    │ - Withdrawals   │    │   bearing       │
│ - Admin control │    │ - Borrowing     │    │ - Exchange rate │
│                 │    │ - Liquidations  │    │ - Mint/burn     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Protocol Flow

1. **Price Oracle**: Provides real-time asset prices with freshness validation
2. **Lending Pool**: Core contract managing all deposits, withdrawals, and borrowing
3. **SToken**: Interest-bearing token representing user shares in the lending pool

## Smart Contracts

### 1. LendingPool Contract

The main contract orchestrating all lending and borrowing operations.

**Key Functions:**
- `initialize()`: Sets up the pool with initial parameters
- `deposit()`: Allows users to deposit assets and receive sTokens
- `withdraw()`: Enables withdrawal of assets by burning sTokens
- `borrow()`: Permits borrowing against collateral
- `repay()`: Allows loan repayment
- `liquidate()`: Liquidates under-collateralized positions

**Configuration Parameters:**
- LTV Ratio: 60% (users can borrow up to 60% of collateral value)
- Liquidation Threshold: 80% (positions liquidated when LTV exceeds 80%)
- Reserve Factor: 10% (percentage of interest kept as protocol reserves)

### 2. SToken Contract

Interest-bearing token contract that represents user deposits in the lending pool.

**Key Functions:**
- `mint()`: Creates new sTokens (only callable by lending pool)
- `burn()`: Destroys sTokens (only callable by lending pool)
- `underlying_to_s_token()`: Converts underlying asset amount to sToken amount
- `s_token_to_underlying()`: Converts sToken amount to underlying asset amount
- `update_exchange_rate()`: Updates the exchange rate based on accrued interest

**Features:**
- Automatic interest accrual through exchange rate updates
- ERC-20 compatible interface
- Restricted minting/burning to lending pool contract

### 3. PriceOracle Contract

Provides reliable price feeds for all supported assets.

**Key Functions:**
- `set_price()`: Sets price for a specific asset (admin only)
- `set_prices()`: Batch price setting for multiple assets
- `get_price()`: Retrieves current price with freshness check
- `get_price_unchecked()`: Retrieves price without freshness validation
- `convert_to_usd()`: Converts asset amount to USD value
- `convert_from_usd()`: Converts USD value to asset amount

**Price Management:**
- Prices stored with 7 decimal precision
- Freshness validation (1-hour staleness threshold)
- Admin-controlled price updates
- Initial mock prices for testing

## Installation

### Prerequisites

- Rust 1.70+ with `wasm32-unknown-unknown` target
- Stellar CLI (`stellar`)
- Soroban CLI (`soroban`)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/paralyx-LSD/paralyx-protocol.git
cd paralyx-protocol
```

2. Install Rust and add the WebAssembly target:
```bash
rustup target add wasm32-unknown-unknown
```

3. Install Stellar CLI:
```bash
cargo install --locked stellar-cli
```

## Building the Project

Build all contracts using the Stellar CLI:

```bash
cd paralyx-protocol
stellar contract build
```

This generates WASM files in `target/wasm32-unknown-unknown/release/`:
- `lending_pool.wasm`
- `price_oracle.wasm`
- `s_token.wasm`

## Testing

Run the comprehensive test suite:

```bash
cargo test
```

Individual contract tests:
```bash
cargo test -p lending_pool
cargo test -p price_oracle
cargo test -p s_token
```

### Test Coverage

- **Unit Tests**: Individual function testing for each contract
- **Integration Tests**: Cross-contract interaction scenarios
- **Edge Cases**: Boundary conditions and error scenarios
- **Liquidation Tests**: Complete liquidation flow testing

## Deployment

### Live Testnet Deployment

The Paralyx Protocol has been successfully deployed to Stellar Testnet with full contract optimization and initialization.

#### Deployment Process

1. **Contract Optimization**: All WASM files were optimized using `stellar contract optimize` to reduce size and gas costs:
   - Price Oracle: 7,529 bytes → 6,491 bytes (13.8% reduction)
   - S-Token: 8,023 bytes → 6,733 bytes (16.1% reduction)
   - Lending Pool: 12,929 bytes → 10,999 bytes (14.9% reduction)

2. **Sequential Deployment**: Contracts deployed in dependency order to ensure proper initialization

3. **Contract Initialization**: Each contract initialized with proper admin controls and inter-contract references

#### Live Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **Price Oracle** | `CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR` | Deployed & Initialized |
| **S-Token (pstETH)** | `CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3` | Deployed & Initialized |
| **Lending Pool** | `CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BDX3GSQ5RSTLAIHHA6ZT2WKP` | Deployed & Initialized |

#### Admin Account
- **Address**: `GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE`
- **Account Alias**: `test-account`

#### Transaction History

**Price Oracle Deployment**
```
Transaction: f1837d612093790bcc8ce0975ede4d2b11e4fe470c6ee521ed07542403327b17
WASM Hash: 3f00d39b073bf53521dd295f880a89fb38d42686485b0d5f7c54a5db176068ca
Explorer: https://stellar.expert/explorer/testnet/tx/f1837d612093790bcc8ce0975ede4d2b11e4fe470c6ee521ed07542403327b17
```

**S-Token Deployment**
```
Transaction: 84accdd5d5ff717e29101403cae38890a81a0e841e82ab0cc2e9cf475450331f
WASM Hash: 1efa7bec4d5a472e09ccc7633fdf2c1c510cf70f3982ea8d704fdfff7f15e6a5
Explorer: https://stellar.expert/explorer/testnet/tx/84accdd5d5ff717e29101403cae38890a81a0e841e82ab0cc2e9cf475450331f
```

**Lending Pool Deployment**
```
Transaction: 6835f5e2dca818af9e2cf0b4f05137432f3001eec7580772d3561b83de332d99
WASM Hash: ec9bed8c3ef1228938618494af96cbd2194a2be22c544f5b247b021b3f00a518
Explorer: https://stellar.expert/explorer/testnet/tx/6835f5e2dca818af9e2cf0b4f05137432f3001eec7580772d3561b83de332d99
```

#### Post-Deployment Initialization Transactions

**Price Oracle Initialization**
```
Transaction: 901d2d4a8f6be09bbc05a2dde628d20b217fad16f0a28bb8cbe8f14ba650e49b
Purpose: Initialize admin controls and set initial mock prices
Initial Prices Set:
- stETH: $1,500.00 (15000000000 stroops)
- XLM: $0.12 (120000000 stroops)  
- USDC: $1.00 (10000000 stroops)
Rationale: Establishes baseline prices for testing and provides realistic market values for protocol calculations
```

**S-Token Initialization**
```
Transaction: d38dfbe98214cdae83d4c68f42d0e3a97082f24f61a0e6b302a4fcc4a31b3047
Purpose: Configure interest-bearing token parameters
Configuration:
- Name: "Paralyx stETH"
- Symbol: "pstETH"  
- Decimals: 7
- Admin: GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE
- Lending Pool: CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BDX3GSQ5RSTLAIHHA6ZT2WKP
Rationale: Links S-Token to lending pool for minting/burning control and establishes token metadata for user interfaces
```

**Lending Pool Initialization**
```
Transaction: d69517b8a2b66eee6485293e0d4cd879cf5752d04b4f2f3cdcbefd5691756367
Purpose: Connect core lending contract to oracle and token contracts
Configuration:
- Admin: GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE
- Price Oracle: CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR
- S-Token Contract: CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
Rationale: Establishes inter-contract communication for price feeds and token operations, enabling full protocol functionality
```

#### Deployment Verification

Post-deployment tests confirmed:
- Price Oracle returns correct asset prices (stETH: "15000000000")
- S-Token displays proper name ("Paralyx stETH") and symbol ("pstETH")
- Lending Pool recognizes admin address correctly
- All contract inter-dependencies properly established

#### Manual Deployment Guide

For replicating this deployment:

1. **Optimize contracts**:
```bash
cargo install --locked stellar-cli --features opt
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/price_oracle.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/s_token.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm
```

2. **Deploy optimized contracts**:
```bash
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/price_oracle.optimized.wasm --source test-account --network testnet --alias price-oracle
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/s_token.optimized.wasm --source test-account --network testnet --alias s-token
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/lending_pool.optimized.wasm --source test-account --network testnet --alias lending-pool
```

3. **Initialize contracts**:
```bash
# Get admin address
ADMIN=$(stellar keys address test-account)

# Initialize price oracle with admin and default prices
stellar contract invoke --id price-oracle --source test-account --network testnet -- initialize --admin $ADMIN

# Initialize s-token with lending pool reference
stellar contract invoke --id s-token --source test-account --network testnet -- initialize --admin $ADMIN --lending_pool LENDING_POOL_ADDRESS --underlying_asset ORACLE_ADDRESS --name "Paralyx stETH" --symbol "pstETH" --decimals 7

# Initialize lending pool with oracle and token references  
stellar contract invoke --id lending-pool --source test-account --network testnet -- initialize --admin $ADMIN --price_oracle ORACLE_ADDRESS --s_token_contract TOKEN_ADDRESS
```

## Usage

### For Users

#### Depositing Assets

```bash
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- deposit --user <USER_ADDRESS> --amount 1000000000
```

#### Withdrawing Assets

```bash
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- withdraw --user <USER_ADDRESS> --amount 500000000
```

#### Borrowing Against Collateral

```bash
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- borrow --user <USER_ADDRESS> --amount 300000000
```

#### Repaying Loans

```bash
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- repay --user <USER_ADDRESS> --amount 100000000
```

### For Developers

#### Querying User Positions

```bash
# Get user's deposit balance
stellar contract invoke --id CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3 --source-account user --network testnet -- balance --user <USER_ADDRESS>

# Get user's borrow balance
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- get_borrow_balance --user <USER_ADDRESS>

# Check health factor
stellar contract invoke --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP --source-account user --network testnet -- get_health_factor --user <USER_ADDRESS>
```

#### Price Oracle Operations

```bash
# Set asset price (admin only)
stellar contract invoke --id CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR --source-account test-account --network testnet -- set_price --asset stETH --price 1500000000

# Get current price
stellar contract invoke --id CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR --source-account user --network testnet -- get_price --asset stETH
```

#### Working with Environment Variables

For easier command execution, set up environment variables:

```bash
# Set environment variables
export PRICE_ORACLE=CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR
export S_TOKEN=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
export LENDING_POOL=CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP
export ADMIN=GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE

# Then use variables in commands
stellar contract invoke --id $PRICE_ORACLE --source-account user --network testnet -- get_price --asset stETH
stellar contract invoke --id $S_TOKEN --source-account user --network testnet -- name
stellar contract invoke --id $LENDING_POOL --source-account user --network testnet -- admin
```

## Contract Addresses

### Testnet Deployment

| Contract | Address | WASM Hash |
|----------|---------|-----------|
| **Price Oracle** | `CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR` | `3f00d39b073bf53521dd295f880a89fb38d42686485b0d5f7c54a5db176068ca` |
| **S-Token (pstETH)** | `CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3` | `1efa7bec4d5a472e09ccc7633fdf2c1c510cf70f3982ea8d704fdfff7f15e6a5` |
| **Lending Pool** | `CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BDX3GSQ5RSTLAIHHA6ZT2WKP` | `ec9bed8c3ef1228938618494af96cbd2194a2be22c544f5b247b021b3f00a518` |

### Environment Variables

For easy contract interaction during development and testing:

```bash
export PRICE_ORACLE=CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR
export S_TOKEN=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
export LENDING_POOL=CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BDX3GSQ5RSTLAIHHA6ZT2WKP
export ADMIN=GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE
export STELLAR_NETWORK=testnet
```

### Contract Verification

You can verify the deployment by testing basic functions:

```bash
# Test Price Oracle
stellar contract invoke --id $PRICE_ORACLE --source test-account --network testnet -- get_price --asset stETH

# Test S-Token  
stellar contract invoke --id $S_TOKEN --source test-account --network testnet -- name

# Test Lending Pool
stellar contract invoke --id $LENDING_POOL --source test-account --network testnet -- admin
```

### Contract Explorer Links

- **Price Oracle**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR)
- **S-Token**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3)
- **Lending Pool**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BDX3GSQ5RSTLAIHHA6ZT2WKP)

## API Reference

### LendingPool Contract

#### Asset Configuration

```rust
pub struct AssetConfig {
    pub ltv_ratio: u32,           // 6000 = 60%
    pub liquidation_threshold: u32, // 8000 = 80%
    pub reserve_factor: u32,       // 1000 = 10%
    pub is_active: bool,
    pub is_collateral: bool,
}
```

#### Interest Rate Model

The protocol uses a utilization-based interest rate model:
- Base Rate: 2% APY
- Utilization Multiplier: Increases with pool utilization
- Maximum Rate: 100% APY at 100% utilization

### Error Codes

| Code | Error | Description |
|------|-------|-------------|
| 1 | `AlreadyInitialized` | Contract already initialized |
| 2 | `NotInitialized` | Contract not yet initialized |
| 3 | `InsufficientBalance` | User has insufficient balance |
| 4 | `InsufficientCollateral` | Collateral insufficient for borrow |
| 5 | `HealthFactorTooLow` | Position below liquidation threshold |
| 6 | `PriceNotFound` | Asset price not available |
| 7 | `Unauthorized` | Caller not authorized |

## Security Considerations

### Protocol Security

- **Over-collateralization**: All loans require >100% collateral
- **Liquidation Mechanism**: Automated liquidations protect protocol solvency
- **Price Oracle Security**: Admin-controlled with freshness validation
- **Access Controls**: Restricted administrative functions

### Audit Status

This protocol is currently in development and has not undergone a security audit. Use at your own risk on testnet only.

## Contributing

We welcome contributions to the Paralyx Protocol. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write comprehensive tests
4. Submit a pull request with detailed description

### Development Guidelines

- Follow Rust best practices
- Maintain test coverage above 90%
- Document all public functions
- Use semantic versioning for releases

## Roadmap

### Phase 1 (Current)
- Core lending and borrowing functionality
- Manual price oracle
- Testnet deployment

### Phase 2
- Cross-chain bridge integration
- Automated oracle feeds
- Advanced liquidation mechanisms

### Phase 3
- Governance token and DAO
- Flash loans
- Additional asset support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is provided "as is" without warranty. Users are responsible for understanding the risks involved in DeFi protocols. Do not use with funds you cannot afford to lose.

## Support

For technical support and community discussion:
- GitHub Issues: [Create an issue](https://github.com/paralyx-LSD/paralyx-protocol/issues)
- Documentation: [docs.md](docs.md)

---

**Built with Stellar and Soroban** | **Connecting Ethereum LSDs to Stellar DeFi**