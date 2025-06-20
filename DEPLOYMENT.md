# Paralyx Protocol - Testnet Deployment

## Deployment Summary

All Paralyx Protocol smart contracts have been successfully deployed to **Stellar Testnet**.

### Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **Price Oracle** | `CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR` | ✅ Deployed & Initialized |
| **S-Token (pstETH)** | `CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3` | ✅ Deployed & Initialized |
| **Lending Pool** | `CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP` | ✅ Deployed & Initialized |

### Admin Account
- **Address**: `GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE`
- **Alias**: `test-account`

## Contract Details

### 1. Price Oracle
- **Function**: Provides price feeds for assets (stETH, XLM, USDC)
- **Initial Prices**:
  - stETH: $1,500.00 (15000000000 stroops)
  - XLM: $0.12 (120000000 stroops)
  - USDC: $1.00 (10000000 stroops)
- **Explorer**: [View Contract](https://stellar.expert/explorer/testnet/contract/CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR)

### 2. S-Token (Interest-Bearing Token)
- **Name**: "Paralyx stETH"
- **Symbol**: "pstETH"
- **Decimals**: 7
- **Function**: Represents deposits in the lending pool, accrues interest over time
- **Explorer**: [View Contract](https://stellar.expert/explorer/testnet/contract/CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3)

### 3. Lending Pool
- **Function**: Core lending/borrowing logic
- **LTV Ratio**: 60%
- **Liquidation Threshold**: 80%
- **Connected Oracle**: Price Oracle contract
- **Connected S-Token**: pstETH contract
- **Explorer**: [View Contract](https://stellar.expert/explorer/testnet/contract/CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP)

## Transaction Links

- **Price Oracle Deploy**: [f1837d61...](https://stellar.expert/explorer/testnet/tx/f1837d612093790bcc8ce0975ede4d2b11e4fe470c6ee521ed07542403327b17)
- **S-Token Deploy**: [84accdd5...](https://stellar.expert/explorer/testnet/tx/84accdd5d5ff717e29101403cae38890a81a0e841e82ab0cc2e9cf475450331f)
- **Lending Pool Deploy**: [6835f5e2...](https://stellar.expert/explorer/testnet/tx/6835f5e2dca818af9e2cf0b4f05137432f3001eec7580772d3561b83de332d99)

## Testing the Deployment

### Prerequisites
```bash
# Ensure you have stellar-cli installed with opt features
cargo install --locked stellar-cli --features opt

# Set up the PATH
export PATH="/Users/baturalpguvenc/.cargo/bin:$PATH"
```

### Test Price Oracle
```bash
# Get stETH price
stellar contract invoke \
  --id CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR \
  --source test-account \
  --network testnet \
  -- get_price --asset stETH

# Expected output: "15000000000" (representing $1500.00)
```

### Test S-Token
```bash
# Get token name
stellar contract invoke \
  --id CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3 \
  --source test-account \
  --network testnet \
  -- name

# Expected output: "Paralyx stETH"

# Get token symbol
stellar contract invoke \
  --id CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3 \
  --source test-account \
  --network testnet \
  -- symbol

# Expected output: "pstETH"
```

### Test Lending Pool
```bash
# Check if contract is initialized (this will return admin address)
stellar contract invoke \
  --id CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP \
  --source test-account \
  --network testnet \
  -- admin

# Expected output: "GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE"
```

## Environment Variables for Development

```bash
export PRICE_ORACLE=CBGLQLNBO2S5MJYOVDF362KYLWQMAQ6BKCZDCX7QOGID4BDX3N4EEWNR
export S_TOKEN=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3
export LENDING_POOL=CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP
export ADMIN=GCN674MTGMHF53EANGGHNYUYZ7YDK236KNBVMD72Q6HMNO4CECQ3RDAE
export STELLAR_NETWORK=testnet
```

## Next Steps

1. **Asset Configuration**: Configure supported assets in the lending pool
2. **Interest Rate Testing**: Test dynamic interest rate calculations
3. **Deposit/Borrow Testing**: Test core lending functionality
4. **Liquidation Testing**: Verify liquidation mechanisms
5. **Frontend Integration**: Connect to user interface
6. **Bridge Development**: Implement Ethereum LSD bridge

## Contract Optimization Results

| Contract | Original Size | Optimized Size | Reduction |
|----------|---------------|----------------|-----------|
| Price Oracle | 7,529 bytes | 6,491 bytes | 13.8% |
| S-Token | 8,023 bytes | 6,733 bytes | 16.1% |
| Lending Pool | 12,929 bytes | 10,999 bytes | 14.9% |

---

**Deployment Date**: December 28, 2024  
**Network**: Stellar Testnet  
**SDK Version**: Soroban SDK v22.0.4  
**CLI Version**: stellar-cli v22.8.1 