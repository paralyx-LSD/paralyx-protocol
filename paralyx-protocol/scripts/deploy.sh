#!/bin/bash

# Paralyx Protocol Deployment Script
# Deploy contracts to Stellar testnet

set -e

echo "🚀 Deploying Paralyx Protocol to Stellar Testnet..."

# Configuration
NETWORK="testnet"
SOURCE_ACCOUNT="alice"  # Change this to your account name

echo "📦 Building contracts..."
stellar contract build

echo "🔧 Optimizing contracts..."
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/price_oracle.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/s_token.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/lending_pool.wasm

echo "🌐 Deploying Price Oracle..."
PRICE_ORACLE_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/price_oracle.optimized.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  --alias price_oracle)

echo "📈 Price Oracle deployed: $PRICE_ORACLE_ID"

echo "🪙 Deploying sToken (for XLM)..."
STOKEN_XLM_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/s_token.optimized.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  --alias stoken_xlm)

echo "🪙 sToken XLM deployed: $STOKEN_XLM_ID"

echo "🏦 Deploying Lending Pool..."
LENDING_POOL_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lending_pool.optimized.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  --alias lending_pool)

echo "🏦 Lending Pool deployed: $LENDING_POOL_ID"

echo ""
echo "✅ All contracts deployed successfully!"
echo ""
echo "📋 Contract Addresses:"
echo "  Price Oracle: $PRICE_ORACLE_ID"
echo "  sToken XLM:   $STOKEN_XLM_ID" 
echo "  Lending Pool: $LENDING_POOL_ID"
echo ""
echo "🔧 Next steps:"
echo "1. Initialize Price Oracle"
echo "2. Initialize sToken"  
echo "3. Initialize Lending Pool"
echo "4. Add XLM asset to Lending Pool"
echo "5. Set initial prices in oracle"
echo ""
echo "💡 Use the following commands to initialize:"
echo ""
echo "# Initialize Price Oracle"
echo "stellar contract invoke --id $PRICE_ORACLE_ID --source $SOURCE_ACCOUNT --network $NETWORK -- initialize --admin [YOUR_ADDRESS]"
echo ""
echo "# Initialize sToken"
echo "stellar contract invoke --id $STOKEN_XLM_ID --source $SOURCE_ACCOUNT --network $NETWORK -- initialize --admin [YOUR_ADDRESS] --lending_pool $LENDING_POOL_ID --underlying_asset [XLM_TOKEN_ADDRESS] --name \"Paralyx XLM\" --symbol \"pXLM\" --decimals 7"
echo ""
echo "# Initialize Lending Pool"
echo "stellar contract invoke --id $LENDING_POOL_ID --source $SOURCE_ACCOUNT --network $NETWORK -- initialize --admin [YOUR_ADDRESS] --price_oracle $PRICE_ORACLE_ID"
echo ""

# Save addresses to file
cat > deployed_addresses.txt << EOF
Price Oracle: $PRICE_ORACLE_ID
sToken XLM: $STOKEN_XLM_ID
Lending Pool: $LENDING_POOL_ID
EOF

echo "📁 Contract addresses saved to deployed_addresses.txt" 