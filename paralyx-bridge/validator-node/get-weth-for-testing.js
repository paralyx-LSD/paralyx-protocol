const { ethers } = require('ethers');

// Configuration for Sepolia testnet
const config = {
  rpcUrl: 'https://rpc.sepolia.org',
  wethAddress: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
  bridgeAddress: '0xb8339d7F9F6b81413094AEaEBB75f41009d889bd',
  userAddress: '0x176e6B69F1e08b0A1f75036C6d574Cc7cbb06f60'
};

// WETH ABI (simplified)
const WETH_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Bridge ABI (minimal for checking minimum)
const BRIDGE_ABI = [
  "function lockAsset(address token, uint256 amount, string memory stellarAddress) payable"
];

async function checkBalancesAndRequirements() {
  try {
    console.log('🔍 Checking WETH balance and bridge requirements...\n');
    
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wethContract = new ethers.Contract(config.wethAddress, WETH_ABI, provider);
    
    // Check ETH balance
    const ethBalance = await provider.getBalance(config.userAddress);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Check WETH balance
    const wethBalance = await wethContract.balanceOf(config.userAddress);
    console.log(`🔗 WETH Balance: ${ethers.formatEther(wethBalance)} WETH`);
    
    // Check WETH allowance for bridge
    const allowance = await wethContract.allowance(config.userAddress, config.bridgeAddress);
    console.log(`✅ Bridge Allowance: ${ethers.formatEther(allowance)} WETH`);
    
    console.log('\n📋 Recommendations:');
    
    if (ethBalance < ethers.parseEther("0.01")) {
      console.log('❌ Need more Sepolia ETH! Get from: https://sepoliafaucet.com/');
    } else {
      console.log('✅ ETH balance sufficient');
    }
    
    if (wethBalance < ethers.parseEther("0.001")) {
      console.log('❌ Need to wrap ETH to WETH');
      console.log('💡 Recommendation: Wrap at least 0.01 ETH to WETH');
    } else {
      console.log('✅ WETH balance sufficient');
    }
    
    if (allowance < ethers.parseEther("0.001")) {
      console.log('❌ Need to approve WETH spending for bridge');
      console.log('💡 Recommendation: Approve at least 0.01 WETH');
    } else {
      console.log('✅ Bridge allowance sufficient');
    }
    
  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
  }
}

async function generateWrapInstructions() {
  console.log('\n🔧 Instructions to get WETH for testing:\n');
  
  console.log('1️⃣ Get Sepolia ETH:');
  console.log('   • Visit: https://sepoliafaucet.com/');
  console.log('   • Or: https://faucet.quicknode.com/ethereum/sepolia');
  console.log('   • Connect your wallet and request testnet ETH\n');
  
  console.log('2️⃣ Wrap ETH to WETH:');
  console.log(`   • Visit WETH contract: https://sepolia.etherscan.io/address/${config.wethAddress}`);
  console.log('   • Go to "Write Contract" tab');
  console.log('   • Connect your wallet');
  console.log('   • Use "deposit" function with amount (e.g., 0.01 ETH)\n');
  
  console.log('3️⃣ Alternative - Use this manual transaction:');
  console.log(`   • To: ${config.wethAddress}`);
  console.log('   • Value: 0.01 ETH (or desired amount)');
  console.log('   • Data: 0xd0e30db0');
  console.log('   • Gas Limit: 50000\n');
  
  console.log('4️⃣ Approve WETH for bridge:');
  console.log(`   • WETH Contract: ${config.wethAddress}`);
  console.log('   • Function: approve');
  console.log(`   • Spender: ${config.bridgeAddress}`);
  console.log('   • Amount: 10000000000000000000 (10 WETH in wei)\n');
  
  console.log('5️⃣ Test bridge transaction:');
  console.log('   • Use frontend bridge form');
  console.log('   • Try bridging 0.001 WETH');
  console.log('   • Check transaction status\n');
}

async function main() {
  console.log('🌉 Paralyx Bridge - WETH Testing Helper\n');
  console.log('========================================\n');
  
  await checkBalancesAndRequirements();
  await generateWrapInstructions();
  
  console.log('💡 Quick Commands:');
  console.log('   • Check balances: node get-weth-for-testing.js');
  console.log('   • Wrap script: node wrap-weth-sepolia.js');
  console.log('   • Bridge test: Use frontend at http://localhost:5173\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkBalancesAndRequirements,
  generateWrapInstructions,
  config
}; 