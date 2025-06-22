const { ethers } = require('ethers');

// Configuration for Sepolia testnet - Fast and reliable RPC
const config = {
  // Primary fast RPC (proven reliable)
  primaryRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  // Fallback RPCs
  fallbackRpcs: [
    'https://rpc.sepolia.org',
    'https://sepolia.gateway.tenderly.co'
  ],
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

// Cache for faster subsequent runs
let cache = {
  timestamp: 0,
  data: null
};

const CACHE_DURATION = 30000; // 30 seconds

// Fast provider instance
let provider = null;

async function getProvider() {
  if (provider) return provider;
  
  console.log('🚀 Connecting to Sepolia RPC...');
  
  // Try primary RPC first
  try {
    provider = new ethers.JsonRpcProvider(config.primaryRpc);
    // Quick test
    await provider.getBlockNumber();
    console.log('✅ Connected to primary RPC');
    return provider;
  } catch (error) {
    console.log('⚠️  Primary RPC failed, trying fallbacks...');
  }
  
  // Try fallback RPCs
  for (let i = 0; i < config.fallbackRpcs.length; i++) {
    try {
      provider = new ethers.JsonRpcProvider(config.fallbackRpcs[i]);
      await provider.getBlockNumber();
      console.log(`✅ Connected to fallback RPC ${i + 1}`);
      return provider;
    } catch (error) {
      console.log(`❌ Fallback RPC ${i + 1} failed`);
    }
  }
  
  throw new Error('All RPC providers failed. Check your internet connection.');
}

async function checkBalancesAndRequirements() {
  try {
    console.log('🔍 Checking WETH balance and bridge requirements...\n');
    
    // Check cache first
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached data (refresh in 30s)...\n');
      displayResults(cache.data);
      return cache.data;
    }
    
    // Get provider
    const rpcProvider = await getProvider();
    const wethContract = new ethers.Contract(config.wethAddress, WETH_ABI, rpcProvider);
    
    console.log('⚡ Fetching data (parallel calls)...');
    
    // Make ALL calls in parallel for maximum speed
    const [ethBalance, wethBalance, allowance] = await Promise.all([
      rpcProvider.getBalance(config.userAddress),
      wethContract.balanceOf(config.userAddress),
      wethContract.allowance(config.userAddress, config.bridgeAddress)
    ]);
    
    const results = {
      ethBalance,
      wethBalance,
      allowance,
      timestamp: now
    };
    
    // Cache results
    cache = { timestamp: now, data: results };
    
    displayResults(results);
    return results;
    
  } catch (error) {
    console.error('❌ Error checking balances:', error.message);
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n💡 Network troubleshooting:');
      console.log('   • Check your internet connection');
      console.log('   • Try again in a few seconds');
      console.log('   • Some RPC providers may be temporarily down');
    }
    
    if (error.message.includes('RPC')) {
      console.log('\n🔄 You can also try:');
      console.log('   • VPN connection if in restricted region');
      console.log('   • Different network connection');
    }
    
    throw error;
  }
}

function displayResults(results) {
  const { ethBalance, wethBalance, allowance } = results;
  
  console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`🔗 WETH Balance: ${ethers.formatEther(wethBalance)} WETH`);
  console.log(`✅ Bridge Allowance: ${ethers.formatEther(allowance)} WETH`);
  
  console.log('\n📋 Status Check:');
  
  const hasEnoughEth = ethBalance >= ethers.parseEther("0.005");
  const hasEnoughWeth = wethBalance >= ethers.parseEther("0.001");
  const hasAllowance = allowance >= ethers.parseEther("0.001");
  
  console.log(`${hasEnoughEth ? '✅' : '❌'} ETH: ${hasEnoughEth ? 'Sufficient' : 'Need more (min 0.005 ETH)'}`);
  console.log(`${hasEnoughWeth ? '✅' : '❌'} WETH: ${hasEnoughWeth ? 'Sufficient' : 'Need to wrap ETH'}`);
  console.log(`${hasAllowance ? '✅' : '❌'} Allowance: ${hasAllowance ? 'Approved' : 'Need approval'}`);
  
  const readyToBridge = hasEnoughEth && hasEnoughWeth && hasAllowance;
  console.log(`\n🌉 Bridge Status: ${readyToBridge ? '✅ READY TO BRIDGE!' : '❌ Setup required'}`);
  
  if (!readyToBridge) {
    console.log('\n🔧 Next Steps:');
    if (!hasEnoughEth) console.log('   1. Get Sepolia ETH from faucet');
    if (!hasEnoughWeth) console.log('   2. Wrap ETH to WETH');
    if (!hasAllowance) console.log('   3. Approve WETH for bridge');
  }
}

async function generateQuickActions() {
  console.log('\n⚡ Quick Actions:\n');
  
  console.log('🚰 Get Sepolia ETH (choose fastest):');
  console.log('   • https://sepoliafaucet.com/ (Alchemy)');
  console.log('   • https://faucet.quicknode.com/ethereum/sepolia');
  console.log('   • https://www.infura.io/faucet/sepolia\n');
  
  console.log('🔗 Quick WETH Wrap:');
  console.log(`   • Contract: ${config.wethAddress}`);
  console.log('   • Method: deposit()');
  console.log('   • Send ETH: 0.01 ETH (or more)');
  console.log(`   • Quick link: https://sepolia.etherscan.io/address/${config.wethAddress}#writeContract\n`);
  
  console.log('✅ Quick Approve:');
  console.log(`   • Contract: ${config.wethAddress}`);
  console.log('   • Method: approve()');
  console.log(`   • Spender: ${config.bridgeAddress}`);
  console.log('   • Amount: 10000000000000000000000 (10000 WETH)\n');
  
  console.log('🧪 Test Commands:');
  console.log('   • Check again: node get-weth-for-testing.js');
  console.log('   • Wrap helper: node wrap-weth-sepolia.js');
  console.log('   • Frontend: http://localhost:5173/bridge\n');
}

async function main() {
  const startTime = Date.now();
  
  console.log('🌉 Paralyx Bridge - WETH Testing Helper (Optimized)\n');
  console.log('===================================================\n');
  
  try {
    await checkBalancesAndRequirements();
    await generateQuickActions();
    
    const duration = Date.now() - startTime;
    console.log(`⚡ Completed in ${duration}ms`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    console.log('\n🔄 Try running again or check network connection');
    process.exit(1);
  }
}

// Clear cache on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Cache cleared, exiting...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkBalancesAndRequirements,
  generateQuickActions,
  getProvider,
  config
}; 