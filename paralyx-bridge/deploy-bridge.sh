#!/bin/bash

# Paralyx Bridge Deployment Script
set -e

echo "🚀 Paralyx Bridge Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "ethereum" ] || [ ! -d "validator-node" ]; then
    echo -e "${RED}Error: Must be run from paralyx-bridge directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Deploying Ethereum Contract${NC}"
echo "-----------------------------------"

cd ethereum

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit ethereum/.env with your credentials:${NC}"
    echo "   - PRIVATE_KEY (without 0x prefix)"
    echo "   - SEPOLIA_RPC_URL"
    echo "   - ETHERSCAN_API_KEY (optional)"
    echo ""
    echo -e "${YELLOW}After editing, run this script again.${NC}"
    exit 1
fi

# Check if required vars are set
source .env
if [ -z "$PRIVATE_KEY" ] || [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}❌ Missing required environment variables in ethereum/.env${NC}"
    echo "Required: PRIVATE_KEY, SEPOLIA_RPC_URL"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"

# Install dependencies
echo -e "${BLUE}Installing Ethereum dependencies...${NC}"
npm install

# Compile contracts
echo -e "${BLUE}Compiling contracts...${NC}"
npx hardhat compile

# Deploy to Sepolia
echo -e "${BLUE}Deploying to Sepolia testnet...${NC}"
npm run deploy:sepolia > deployment.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
    
    # Extract contract address from deployment log
    CONTRACT_ADDRESS=$(grep "Contract Address:" deployment.log | awk '{print $3}')
    
    if [ -n "$CONTRACT_ADDRESS" ]; then
        echo -e "${GREEN}📋 Contract Address: $CONTRACT_ADDRESS${NC}"
        
        # Save to file for validator setup
        echo "LOCKBOX_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" > ../contract-address.env
        
    else
        echo -e "${RED}❌ Could not extract contract address from deployment${NC}"
        echo "Check deployment.log for details"
        exit 1
    fi
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Check deployment.log for details:"
    tail -20 deployment.log
    exit 1
fi

cd ..

echo ""
echo -e "${BLUE}Step 2: Configuring Validator Node${NC}"
echo "-----------------------------------"

cd validator-node

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating validator .env file...${NC}"
    cp env.example .env
fi

# Add contract address to validator .env
if [ -f "../contract-address.env" ]; then
    echo -e "${BLUE}Adding contract address to validator configuration...${NC}"
    
    # Remove existing LOCKBOX_CONTRACT_ADDRESS line and add new one
    grep -v "LOCKBOX_CONTRACT_ADDRESS=" .env > .env.tmp || true
    cat ../contract-address.env >> .env.tmp
    mv .env.tmp .env
    
    echo -e "${GREEN}✅ Contract address configured${NC}"
fi

# Install dependencies
echo -e "${BLUE}Installing validator dependencies...${NC}"
npm install

# Validate configuration
echo -e "${BLUE}Validating configuration...${NC}"
if node -e "
const config = require('./config.js');
if (config.validateConfig()) {
  console.log('✅ Configuration is valid');
  process.exit(0);
} else {
  console.log('❌ Configuration is invalid');
  process.exit(1);
}
"; then
    echo -e "${GREEN}✅ Validator configuration is valid${NC}"
else
    echo -e "${RED}❌ Validator configuration is invalid${NC}"
    echo ""
    echo -e "${YELLOW}Please edit validator-node/.env with the following required values:${NC}"
    echo "   - ETHEREUM_RPC_URL"
    echo "   - VALIDATOR_PRIVATE_KEY"
    echo "   - STELLAR_SECRET_KEY"
    echo "   - STELLAR_CONTRACT_ID"
    echo ""
    echo -e "${BLUE}Example configuration:${NC}"
    echo "ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
    echo "VALIDATOR_PRIVATE_KEY=your_ethereum_private_key"
    echo "STELLAR_SECRET_KEY=your_stellar_secret_key"
    echo "STELLAR_CONTRACT_ID=CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}🎉 Bridge Deployment Complete!${NC}"
echo "=============================="
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "   Contract Address: $CONTRACT_ADDRESS"
echo "   Network: Sepolia Testnet"
echo "   Validator Node: Configured and Ready"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "   1. Start the validator node:"
echo "      cd validator-node && npm start"
echo ""
echo "   2. Monitor the bridge operations:"
echo "      cd validator-node && tail -f logs/bridge.log"
echo ""
echo "   3. Test the bridge:"
echo "      - Lock some stETH on Ethereum"
echo "      - Check for minted s-stETH on Stellar"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - Ethereum Contract: ethereum/contracts/LSDLockbox.sol"
echo "   - Validator Guide: validator-node/deploy-instructions.md"
echo "   - Bridge Docs: docs/README.md"
echo ""
echo -e "${GREEN}✅ Happy bridging! 🌉${NC}" 