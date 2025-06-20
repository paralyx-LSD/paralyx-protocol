const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Paralyx Bridge LSDLockbox contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", await deployer.getAddress());
  
  // Get balance using provider
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the LSDLockbox contract
  const LSDLockbox = await ethers.getContractFactory("LSDLockbox");
  const lockbox = await LSDLockbox.deploy();
  
  await lockbox.waitForDeployment();
  
  console.log("LSDLockbox deployed to:", await lockbox.getAddress());
  console.log("Transaction hash:", lockbox.deploymentTransaction().hash);
  
  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await lockbox.deploymentTransaction().wait(3);
  
  // Setup initial configuration
  console.log("Setting up initial configuration...");
  
  // Real Sepolia testnet token addresses
  const TOKEN_ADDRESSES = {
    // Lido stETH on Sepolia testnet
    STETH: "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af",
    // wstETH on Sepolia testnet  
    WSTETH: "0xB82381A3fBD3FaFA77B3a7bE693342618240067b",
    // Sepolia WETH
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
  };
  
  try {
    // Add support for real Sepolia testnet tokens
    console.log("Adding real testnet token support...");
    
    // Add Lido stETH
    const addStETHTx = await lockbox.setSupportedToken(
      TOKEN_ADDRESSES.STETH,
      "s-stETH", // Symbol for wrapped token on Stellar
      true
    );
    await addStETHTx.wait();
    console.log("Lido stETH token support added");
    
    // Add wstETH 
    const addWstETHTx = await lockbox.setSupportedToken(
      TOKEN_ADDRESSES.WSTETH,
      "s-wstETH", // Symbol for wrapped token on Stellar
      true
    );
    await addWstETHTx.wait();
    console.log("Lido wstETH token support added");
    
    // Add WETH
    const addWETHTx = await lockbox.setSupportedToken(
      TOKEN_ADDRESSES.WETH,
      "s-WETH", // Symbol for wrapped token on Stellar
      true
    );
    await addWETHTx.wait();
    console.log("WETH token support added");
    
    // Set the deployer as an authorized validator initially
    console.log("Setting up validator...");
    const setValidatorTx = await lockbox.setValidator(deployerAddress, true);
    await setValidatorTx.wait();
    console.log("Validator set:", deployerAddress);
    
  } catch (error) {
    console.log("Setup error:", error.message);
  }
  
  // Display contract information
  console.log("\n=== Deployment Summary ===");
  console.log("Contract Address:", await lockbox.getAddress());
  console.log("Deployer:", deployerAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Block Number:", await ethers.provider.getBlockNumber());
  
  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    contractAddress: await lockbox.getAddress(),
    deployer: deployerAddress,
    network: network.name,
    chainId: network.chainId.toString(), // Convert BigInt to string
    deploymentBlock: (await ethers.provider.getBlockNumber()).toString(), // Convert to string
    timestamp: new Date().toISOString(),
    transactionHash: lockbox.deploymentTransaction().hash
  };
  
  console.log("\n=== Contract ABI and Address for Bridge ===");
  console.log("Save this information for the validator node configuration:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying contract on Etherscan...");
    console.log("Run this command to verify:");
    console.log(`npx hardhat verify --network sepolia ${await lockbox.getAddress()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 