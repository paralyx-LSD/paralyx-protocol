const { ethers } = require("hardhat");

async function main() {
    console.log("Wrapping ETH to WETH for testing...");
    
    const [signer] = await ethers.getSigners();
    console.log("Using account:", signer.address);
    
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    const WRAP_AMOUNT = ethers.parseEther("0.01"); // 0.01 ETH
    
    // Get ETH balance
    const ethBalance = await ethers.provider.getBalance(signer.address);
    console.log("ETH balance:", ethers.formatEther(ethBalance), "ETH");
    
    // Get WETH contract
    const weth = await ethers.getContractAt(
        ["function deposit() payable", "function balanceOf(address) view returns (uint256)"],
        WETH_ADDRESS
    );
    
    // Check current WETH balance
    const wethBalanceBefore = await weth.balanceOf(signer.address);
    console.log("WETH balance before:", ethers.formatEther(wethBalanceBefore), "WETH");
    
    // Wrap ETH to WETH
    console.log("Wrapping", ethers.formatEther(WRAP_AMOUNT), "ETH to WETH...");
    const tx = await weth.deposit({ value: WRAP_AMOUNT });
    console.log("Transaction submitted:", tx.hash);
    
    await tx.wait();
    console.log("Transaction confirmed");
    
    // Check new WETH balance
    const wethBalanceAfter = await weth.balanceOf(signer.address);
    console.log("WETH balance after:", ethers.formatEther(wethBalanceAfter), "WETH");
    
    const wrapped = wethBalanceAfter - wethBalanceBefore;
    console.log("Successfully wrapped:", ethers.formatEther(wrapped), "ETH to WETH");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    }); 