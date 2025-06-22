const { ethers } = require('ethers');

// Configuration for Sepolia testnet
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
  wrapAmount: '0.5', // Amount to wrap in ETH
  userPrivateKey: '0xde408dc12652f3924ec62c25c8053ea80dfa0ec85a1acd37dcd2e7bff14bf1bb' // User's Ethereum private key
};

// WETH ABI
const WETH_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function createProvider() {
  console.log('🔗 Connecting to Ethereum Sepolia...');
  
  for (const rpcUrl of [config.primaryRpc, ...config.fallbackRpcs]) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber(); // Test connection
      console.log(`✅ Connected to ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.log(`❌ Failed to connect to ${rpcUrl}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All RPC providers failed');
}

async function autoWrapEth() {
  console.log('\n🤖 AUTOMATED ETH → WETH WRAPPER');
  console.log('=================================\n');

  try {
    // 1. Connect to Ethereum
    const provider = await createProvider();
    const wallet = new ethers.Wallet(config.userPrivateKey, provider);
    console.log(`🔑 Using wallet: ${wallet.address}`);
    
    // 2. Get contracts
    const wethContract = new ethers.Contract(config.wethAddress, WETH_ABI, wallet);
    
    // 3. Check balances (parallel)
    console.log('\n📊 Checking current balances...');
    const [ethBalance, wethBalance] = await Promise.all([
      provider.getBalance(wallet.address),
      wethContract.balanceOf(wallet.address)
    ]);
    
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    const wethBalanceFormatted = ethers.formatEther(wethBalance);
    
    console.log(`💰 Current ETH Balance: ${ethBalanceFormatted} ETH`);
    console.log(`🪙 Current WETH Balance: ${wethBalanceFormatted} WETH`);
    
    // 4. Check if we have enough ETH
    const wrapAmountWei = ethers.parseEther(config.wrapAmount);
    if (ethBalance < wrapAmountWei) {
      console.log(`❌ Insufficient ETH! Need ${config.wrapAmount} ETH, have ${ethBalanceFormatted} ETH`);
      return;
    }
    
    console.log(`\n🎯 Proceeding to wrap ${config.wrapAmount} ETH → WETH...`);
    
    // 5. Estimate gas for deposit
    console.log('⛽ Estimating gas...');
    const gasEstimate = await wethContract.deposit.estimateGas({ value: wrapAmountWei });
    const gasPrice = await provider.getFeeData();
    
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    console.log(`💸 Gas price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
    
    // 6. Execute deposit transaction
    console.log('\n🚀 Executing WETH deposit...');
    const depositTx = await wethContract.deposit({
      value: wrapAmountWei,
      gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
      gasPrice: gasPrice.gasPrice
    });
    
    console.log(`📝 Transaction hash: ${depositTx.hash}`);
    console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${depositTx.hash}`);
    
    // 7. Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    const receipt = await depositTx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ WETH deposit successful! Block: ${receipt.blockNumber}`);
      
      // 8. Check new balances
      console.log('\n📊 Checking new balances...');
      const [newEthBalance, newWethBalance] = await Promise.all([
        provider.getBalance(wallet.address),
        wethContract.balanceOf(wallet.address)
      ]);
      
      console.log(`💰 New ETH Balance: ${ethers.formatEther(newEthBalance)} ETH`);
      console.log(`🪙 New WETH Balance: ${ethers.formatEther(newWethBalance)} WETH`);
      
      // 9. Approve WETH for bridge (if needed)
      console.log('\n🌉 Checking bridge approval...');
      const currentAllowance = await wethContract.allowance(wallet.address, config.bridgeAddress);
      const requiredAllowance = ethers.parseEther("10"); // Approve 10 WETH for multiple bridges
      
      if (currentAllowance < requiredAllowance) {
        console.log('📝 Approving WETH for bridge...');
        const approveTx = await wethContract.approve(config.bridgeAddress, requiredAllowance);
        console.log(`📝 Approval hash: ${approveTx.hash}`);
        
        await approveTx.wait();
        console.log('✅ Bridge approval successful!');
      } else {
        console.log('✅ WETH already approved for bridge');
      }
      
      // 10. Success summary
      console.log('\n🎉 AUTOMATION COMPLETE!');
      console.log('========================');
      console.log(`✅ Wrapped: ${config.wrapAmount} ETH → WETH`);
      console.log(`✅ Total WETH: ${ethers.formatEther(newWethBalance)} WETH`);
      console.log(`✅ Bridge approved: ${ethers.formatEther(requiredAllowance)} WETH`);
      console.log('\n🌉 Ready for bridge transactions!');
      console.log(`🔗 Frontend: http://localhost:5173/bridge`);
      
    } else {
      console.log('❌ Transaction failed!');
    }
    
  } catch (error) {
    console.error('\n❌ Automation failed:', error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💸 Insufficient funds for gas fees');
    } else if (error.code === 'NETWORK_ERROR') {
      console.log('🌐 Network connection issues');
    } else {
      console.log('🔍 Full error:', error);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  autoWrapEth().catch(console.error);
}

module.exports = { autoWrapEth, config }; 