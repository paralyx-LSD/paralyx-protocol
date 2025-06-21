const { ethers } = require("hardhat");
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("🔍 Simple Deploy Account Test...\n");

    try {
        // Debug environment
        console.log("🔧 PRIVATE_KEY exists:", !!process.env.PRIVATE_KEY);
        if (process.env.PRIVATE_KEY) {
            console.log("🔧 PRIVATE_KEY length:", process.env.PRIVATE_KEY.length);
        }
        
        // Get signers
        const signers = await ethers.getSigners();
        console.log("📋 Number of signers:", signers.length);
        
        if (signers.length > 0) {
            const signer = signers[0];
            console.log("🔑 Signer address:", signer.address);
            
            const balance = await ethers.provider.getBalance(signer.address);
            console.log("💰 ETH balance:", ethers.formatEther(balance), "ETH");
            
            const network = await ethers.provider.getNetwork();
            console.log("🌐 Network:", network.name, "| Chain ID:", network.chainId.toString());
            
            console.log("✅ Connection successful!");
        } else {
            console.log("❌ No signers found");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 