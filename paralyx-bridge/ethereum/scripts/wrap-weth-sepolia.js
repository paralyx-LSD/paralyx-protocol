const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("Wrapping ETH to WETH on Sepolia...\n");

    // Real Sepolia WETH contract address
    const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
    const WRAP_AMOUNT = ethers.parseEther("0.01"); // Wrap 0.01 ETH

    try {
        // Get signer
        const [signer] = await ethers.getSigners();
        console.log(" Using account:", signer.address);
        
        // Check ETH balance
        const ethBalance = await ethers.provider.getBalance(signer.address);
        console.log(" ETH balance:", ethers.formatEther(ethBalance), "ETH");
        
        if (ethBalance < WRAP_AMOUNT) {
            console.log(" Insufficient ETH balance for wrapping");
            return;
        }

        // Get WETH contract instance
        const WETH = await ethers.getContractAt([
            "function deposit() payable",
            "function balanceOf(address) view returns (uint256)",
            "function withdraw(uint256) external"
        ], WETH_ADDRESS);
        
        // Check current WETH balance
        const wethBalanceBefore = await WETH.balanceOf(signer.address);
        console.log(" WETH balance before:", ethers.formatEther(wethBalanceBefore), "WETH");
        
        console.log(`🔄 Wrapping ${ethers.formatEther(WRAP_AMOUNT)} ETH to WETH...`);
        
        // Wrap ETH to WETH
        const wrapTx = await WETH.deposit({ 
            value: WRAP_AMOUNT,
            gasLimit: 100000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        
        console.log(" Transaction submitted:", wrapTx.hash);
        console.log(" Waiting for confirmation...");
        
        const receipt = await wrapTx.wait();
        
        if (receipt.status === 1) {
            console.log(" WETH wrap successful!");
            console.log(" Transaction hash:", receipt.hash);
            console.log(" Gas used:", receipt.gasUsed.toString());
            console.log(" Etherscan:", `https://sepolia.etherscan.io/tx/${receipt.hash}`);
            
            // Check new WETH balance
            const wethBalanceAfter = await WETH.balanceOf(signer.address);
            console.log(" WETH balance after:", ethers.formatEther(wethBalanceAfter), "WETH");
            console.log(" WETH gained:", ethers.formatEther(wethBalanceAfter - wethBalanceBefore), "WETH");
            
            console.log("\n Ready for bridge testing!");
            console.log(" You can now run: npx hardhat run scripts/test-lock-weth-fixed.js --network sepolia");
            
        } else {
            console.log("❌ Transaction failed with status:", receipt.status);
        }
        
    } catch (error) {
        console.error("❌ Error during WETH wrapping:", error.message);
        
        if (error.reason) {
            console.error("💡 Reason:", error.reason);
        }
        
        if (error.code === "CALL_EXCEPTION") {
            console.error("💡 This is a contract call failure. Possible causes:");
            console.error("   - Insufficient ETH balance");
            console.error("   - Gas estimation failed");
            console.error("   - Network connectivity issues");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 