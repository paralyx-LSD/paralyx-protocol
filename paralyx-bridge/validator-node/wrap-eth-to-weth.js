const { ethers } = require('ethers');

// Configuration for Sepolia testnet
const config = {
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  wethAddress: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
  bridgeAddress: '0xb8339d7F9F6b81413094AEaEBB75f41009d889bd',
  wrapAmount: '0.5' // Amount to wrap in ETH
};

// WETH ABI
const WETH_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

async function wrapEthToWeth() {
  console.log('\n🔄 ETH → WETH Wrapper Tool');
  console.log('=================================\n');

  try {
    // Connect to provider
    console.log('🚀 Connecting to Sepolia...');
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Check if wallet is available
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log('❌ No Web3 wallet detected. This script needs to be run in a browser with MetaMask');
      console.log('\n📋 Manual Steps:');
      console.log('1. Go to: https://sepolia.etherscan.io/address/0x7b79995e5f793a07bc00c21412e50ecae098e7f9#writeContract');
      console.log('2. Connect your MetaMask wallet');
      console.log('3. Click "Connect to Web3"');
      console.log('4. Find the "deposit" function');
      console.log(`5. Enter ${config.wrapAmount} ETH as payable amount`);
      console.log('6. Click "Write" and confirm the transaction');
      console.log('\n🔗 Alternative: Use frontend at http://localhost:5173/bridge');
      return;
    }

    // Connect wallet
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const web3Provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await web3Provider.getSigner();
    const userAddress = await signer.getAddress();
    
    console.log(`👤 Connected: ${userAddress}`);
    
    // Get WETH contract
    const wethContract = new ethers.Contract(config.wethAddress, WETH_ABI, signer);
    
    // Check current balances
    console.log('\n💰 Current Balances:');
    const ethBalance = await provider.getBalance(userAddress);
    const wethBalance = await wethContract.balanceOf(userAddress);
    
    console.log(`   ETH: ${ethers.formatEther(ethBalance)} ETH`);
    console.log(`   WETH: ${ethers.formatEther(wethBalance)} WETH`);
    
    // Convert wrap amount to wei
    const wrapAmountWei = ethers.parseEther(config.wrapAmount);
    
    // Check if user has enough ETH
    if (ethBalance < wrapAmountWei) {
      console.log(`❌ Insufficient ETH balance. Need ${config.wrapAmount} ETH`);
      return;
    }
    
    console.log(`\n🔄 Wrapping ${config.wrapAmount} ETH to WETH...`);
    
    // Estimate gas
    const gasEstimate = await wethContract.deposit.estimateGas({ value: wrapAmountWei });
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    
    // Execute wrap transaction
    const tx = await wethContract.deposit({ 
      value: wrapAmountWei,
      gasLimit: gasEstimate + BigInt(10000) // Add buffer
    });
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ Transaction confirmed!');
      console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
      
      // Check new balances
      console.log('\n💰 New Balances:');
      const newEthBalance = await provider.getBalance(userAddress);
      const newWethBalance = await wethContract.balanceOf(userAddress);
      
      console.log(`   ETH: ${ethers.formatEther(newEthBalance)} ETH`);
      console.log(`   WETH: ${ethers.formatEther(newWethBalance)} WETH`);
      
      console.log(`\n🎉 Successfully wrapped ${config.wrapAmount} ETH to WETH!`);
      console.log('\n🌉 Next Steps:');
      console.log('1. ✅ You now have WETH for bridge testing');
      console.log('2. 🔗 Go to bridge: http://localhost:5173/bridge');
      console.log('3. 🚀 Test the bridge with your new WETH');
      
    } else {
      console.log('❌ Transaction failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('user rejected')) {
      console.log('\n💡 Transaction was cancelled by user');
    } else if (error.message.includes('insufficient funds')) {
      console.log('\n💡 Insufficient ETH for gas fees');
    } else {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure MetaMask is connected');
      console.log('2. Switch to Sepolia testnet');
      console.log('3. Ensure you have enough ETH for gas');
      console.log('4. Try refreshing the page');
    }
  }
}

// For browser usage
if (typeof window !== 'undefined') {
  window.wrapEthToWeth = wrapEthToWeth;
}

// For Node.js - provide instructions
if (typeof window === 'undefined') {
  wrapEthToWeth();
}

module.exports = { wrapEthToWeth }; 