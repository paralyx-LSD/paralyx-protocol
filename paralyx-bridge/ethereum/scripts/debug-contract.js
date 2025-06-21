const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🔍 Debugging LSDLockbox Contract...\n");

    // Contract details
    const CONTRACT_ADDRESS = "0x6164187652d6c123eB124e0b8b08ee42A10A7d86";
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    const STELLAR_ADDRESS = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";

    try {
        // Get signer
        const [signer] = await ethers.getSigners();
        console.log("🔑 Using account:", signer.address);

        // Get contract instance
        const LSDLockbox = await ethers.getContractAt("LSDLockbox", CONTRACT_ADDRESS);
        
        console.log("📋 Contract State:");
        console.log("==================");
        
        // Check basic contract state
        const owner = await LSDLockbox.owner();
        console.log("👤 Owner:", owner);
        console.log("👤 Signer:", signer.address);
        console.log("🔑 Is owner?", owner.toLowerCase() === signer.address.toLowerCase());
        
        const paused = await LSDLockbox.paused();
        console.log("⏸️  Paused:", paused);
        
        // Check WETH support
        const isSupported = await LSDLockbox.supportedTokens(WETH_ADDRESS);
        console.log("✅ WETH supported:", isSupported);
        
        if (isSupported) {
            const stellarSymbol = await LSDLockbox.tokenToStellarSymbol(WETH_ADDRESS);
            console.log("🔗 Stellar symbol:", stellarSymbol);
        }
        
        // Check configuration
        const minLock = await LSDLockbox.minLockAmount();
        const maxLock = await LSDLockbox.maxLockAmount();
        console.log("📊 Min lock amount:", ethers.formatEther(minLock), "tokens");
        console.log("📊 Max lock amount:", ethers.formatEther(maxLock), "tokens");
        
        const requiredValidators = await LSDLockbox.requiredValidators();
        console.log("👥 Required validators:", requiredValidators.toString());
        
        // Check if signer is a validator
        const isValidator = await LSDLockbox.validators(signer.address);
        console.log("✅ Signer is validator:", isValidator);
        
        console.log("\n🪙 WETH Token Info:");
        console.log("===================");
        
        const WETH = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        const wethBalance = await WETH.balanceOf(signer.address);
        const allowance = await WETH.allowance(signer.address, CONTRACT_ADDRESS);
        
        console.log("💰 WETH balance:", ethers.formatEther(wethBalance), "WETH");
        console.log("📝 Allowance:", ethers.formatEther(allowance), "WETH");
        
        console.log("\n🌟 Stellar Address Validation:");
        console.log("==============================");
        console.log("📍 Address:", STELLAR_ADDRESS);
        console.log("📏 Length:", STELLAR_ADDRESS.length);
        console.log("🔤 First char:", STELLAR_ADDRESS[0]);
        console.log("✅ Starts with G:", STELLAR_ADDRESS.startsWith('G'));
        
        // Try to simulate the transaction to see what fails
        console.log("\n🧪 Simulating Transaction:");
        console.log("==========================");
        
        try {
            const result = await LSDLockbox.lockAsset.staticCall(
                WETH_ADDRESS,
                ethers.parseEther("0.001"),
                STELLAR_ADDRESS
            );
            console.log("✅ Static call successful:", result);
        } catch (error) {
            console.log("❌ Static call failed:", error.message);
            
            // Try to get more specific error
            if (error.data) {
                console.log("📊 Error data:", error.data);
            }
            
            if (error.reason) {
                console.log("💡 Error reason:", error.reason);
            }
        }
        
        // Check if we need to add WETH support
        if (!isSupported) {
            console.log("\n🔧 Adding WETH support...");
            try {
                const tx = await LSDLockbox.setSupportedToken(
                    WETH_ADDRESS,
                    "s-WETH",
                    true
                );
                await tx.wait();
                console.log("✅ WETH support added");
            } catch (error) {
                console.log("❌ Failed to add WETH support:", error.message);
            }
        }
        
        // Check total locked amounts
        const totalLocked = await LSDLockbox.totalLocked(WETH_ADDRESS);
        console.log("\n📊 Total locked WETH:", ethers.formatEther(totalLocked), "WETH");
        
        const userDeposits = await LSDLockbox.userDeposits(signer.address, WETH_ADDRESS);
        console.log("👤 User deposits:", ethers.formatEther(userDeposits), "WETH");
        
    } catch (error) {
        console.error("❌ Debug error:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 