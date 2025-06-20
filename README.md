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

### Testnet Deployment

1. Generate and fund a test account:
```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
```

2. Install and deploy contracts:
```bash
# Install WASM files
stellar contract install --wasm target/wasm32-unknown-unknown/release/price_oracle.wasm --source-account deployer --network testnet
stellar contract install --wasm target/wasm32-unknown-unknown/release/s_token.wasm --source-account deployer --network testnet
stellar contract install --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm --source-account deployer --network testnet

# Deploy with aliases
stellar contract deploy --wasm-hash <PRICE_ORACLE_HASH> --source-account deployer --network testnet --alias price-oracle
stellar contract deploy --wasm-hash <S_TOKEN_HASH> --source-account deployer --network testnet --alias s-token
stellar contract deploy --wasm-hash <LENDING_POOL_HASH> --source-account deployer --network testnet --alias lending-pool
```

3. Initialize contracts:
```bash
# Initialize price oracle
stellar contract invoke --id <PRICE_ORACLE_ID> --source-account deployer --network testnet -- initialize --admin <ADMIN_ADDRESS>

# Initialize sToken
stellar contract invoke --id <S_TOKEN_ID> --source-account deployer --network testnet -- initialize --admin <ADMIN_ADDRESS> --lending_pool <LENDING_POOL_ID> --underlying_asset <ASSET_ADDRESS> --name "Paralyx stETH" --symbol "pstETH" --decimals 7

# Initialize lending pool
stellar contract invoke --id <LENDING_POOL_ID> --source-account deployer --network testnet -- initialize --admin <ADMIN_ADDRESS> --s_token_contract <S_TOKEN_ID> --price_oracle <PRICE_ORACLE_ID>
```

## Usage

### For Users

#### Depositing Assets

```bash
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- deposit --user <USER_ADDRESS> --amount 1000000000
```

#### Withdrawing Assets

```bash
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- withdraw --user <USER_ADDRESS> --amount 500000000
```

#### Borrowing Against Collateral

```bash
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- borrow --user <USER_ADDRESS> --amount 300000000
```

#### Repaying Loans

```bash
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- repay --user <USER_ADDRESS> --amount 100000000
```

### For Developers

#### Querying User Positions

```bash
# Get user's deposit balance
stellar contract invoke --id <S_TOKEN_ID> --source-account user --network testnet -- balance --user <USER_ADDRESS>

# Get user's borrow balance
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- get_borrow_balance --user <USER_ADDRESS>

# Check health factor
stellar contract invoke --id <LENDING_POOL_ID> --source-account user --network testnet -- get_health_factor --user <USER_ADDRESS>
```

#### Price Oracle Operations

```bash
# Set asset price (admin only)
stellar contract invoke --id <PRICE_ORACLE_ID> --source-account admin --network testnet -- set_price --asset stETH --price 1500000000

# Get current price
stellar contract invoke --id <PRICE_ORACLE_ID> --source-account user --network testnet -- get_price --asset stETH
```

## Contract Addresses

### Testnet Deployment

| Contract | Address | WASM Hash |
|----------|---------|-----------|
| PriceOracle | TBD | `f5ac05c99d232ba7546b5257336e257c226d1085516bea7d58535fb4a9baf38e` |
| SToken | TBD | TBD |
| LendingPool | TBD | TBD |

*Addresses will be updated upon successful deployment*

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