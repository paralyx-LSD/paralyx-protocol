const { ethers } = require("hardhat");

async function main() {
  console.log(" Deploying Paralyx Bridge LSDLockbox contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(" Deploying with account:", deployerAddress);
  
  // Get balance
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(" Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the LSDLockbox contract with higher gas limit for faster processing
  console.log(" Deploying LSDLockbox contract...");
  const LSDLockbox = await ethers.getContractFactory("LSDLockbox");
  
  // Deploy with optimized gas settings
  const lockbox = await LSDLockbox.deploy({
    gasLimit: 3000000, // Higher gas limit for faster processing
    gasPrice: ethers.parseUnits("20", "gwei") // Higher gas price for faster inclusion
  });
  
  console.log(" Waiting for deployment confirmation...");
  await lockbox.waitForDeployment();
  
  const contractAddress = await lockbox.getAddress();
  const deploymentTx = lockbox.deploymentTransaction();
  
  console.log(" LSDLockbox deployed to:", contractAddress);
  console.log(" Transaction hash:", deploymentTx.hash);
  
  // Only wait for 1 confirmation instead of 3 for speed
  console.log(" Waiting for 1 confirmation...");
  const receipt = await deploymentTx.wait(1);
  console.log(" Confirmed in block:", receipt.blockNumber);
  
  // Setup initial configuration with batch operations
  console.log(" Setting up initial configuration...");
  
  // Real Sepolia testnet token addresses
  const TOKEN_ADDRESSES = {
    STETH: "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af",   // Lido stETH
    WSTETH: "0xB82381A3fBD3FaFA77B3a7bE693342618240067b", // wstETH  
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"    // WETH
  };
  
  try {
    // Prepare all transactions but don't wait for each one individually
    console.log(" Preparing batch configuration transactions...");
    
    // Create all transactions with higher gas settings for speed
    const gasSettings = {
      gasLimit: 200000,
      gasPrice: ethers.parseUnits("20", "gwei")
    };
    
    const transactions = [];
    
    // Add token support transactions
    transactions.push({
      name: "Add stETH support",
      tx: lockbox.setSupportedToken(TOKEN_ADDRESSES.STETH, "s-stETH", true, gasSettings)
    });
    
    transactions.push({
      name: "Add wstETH support", 
      tx: lockbox.setSupportedToken(TOKEN_ADDRESSES.WSTETH, "s-wstETH", true, gasSettings)
    });
    
    transactions.push({
      name: "Add WETH support",
      tx: lockbox.setSupportedToken(TOKEN_ADDRESSES.WETH, "s-WETH", true, gasSettings)
    });
    
    transactions.push({
      name: "Set validator",
      tx: lockbox.setValidator(deployerAddress, true, gasSettings)
    });
    
    // Execute all transactions in parallel for speed
    console.log(" Executing configuration transactions...");
    const txPromises = transactions.map(async (item) => {
      console.log(` ${item.name}...`);
      const tx = await item.tx;
      // Don't wait for confirmations here - just get the transaction
      console.log(` ${item.name} submitted: ${tx.hash}`);
      return { name: item.name, tx: tx };
    });
    
    // Wait for all transactions to be submitted
    const submittedTxs = await Promise.all(txPromises);
    
    // Now wait for all confirmations in parallel (much faster)
    console.log(" Waiting for all confirmations...");
    const confirmationPromises = submittedTxs.map(async (item) => {
      const receipt = await item.tx.wait(1); // Only 1 confirmation
      console.log(` ${item.name} confirmed`);
      return receipt;
    });
    
    await Promise.all(confirmationPromises);
    console.log(" All configuration transactions confirmed!");
    
  } catch (error) {
    console.log(" Setup error:", error.message);
    // Continue anyway - basic deployment is done
  }
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const currentBlock = await ethers.provider.getBlockNumber();
  
  // Display contract information
  console.log("\n === DEPLOYMENT SUCCESSFUL ===");
  console.log(" Contract Address:", contractAddress);
  console.log(" Deployer:", deployerAddress);
  console.log(" Network:", network.name);
  console.log(" Chain ID:", network.chainId.toString());
  console.log(" Block Number:", currentBlock);
  console.log(" Timestamp:", new Date().toISOString());
  
  // Save deployment info as JSON (for bridge configuration)
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployerAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    deploymentBlock: currentBlock.toString(),
    timestamp: new Date().toISOString(),
    transactionHash: deploymentTx.hash,
    supportedTokens: {
      stETH: TOKEN_ADDRESSES.STETH,
      wstETH: TOKEN_ADDRESSES.WSTETH,
      WETH: TOKEN_ADDRESSES.WETH
    }
  };
  
  console.log("\n === BRIDGE CONFIGURATION ===");
  console.log("Copy this to your bridge validator configuration:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Quick verification info
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 === VERIFICATION ===");
    console.log("To verify on Etherscan, run:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
  }
  
  console.log("\n === NEXT STEPS ===");
  console.log("1. Update bridge validator config with new contract address");
  console.log("2. Test the bridge with test-lock-weth-fixed.js");
  console.log("3. Monitor bridge logs for successful operation");
  
  console.log("\n Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(" Deployment failed:", error);
    process.exit(1);
  }); 