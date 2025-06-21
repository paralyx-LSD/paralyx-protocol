const { ethers } = require("hardhat");
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("⚙️ Setting up token support on LSDLockbox...\n");

    // Contract details - Latest deployment: 2025-06-20T23:11:50.849Z
    const CONTRACT_ADDRESS = "0xcB0260dc37eb2577D1fF538690296c49823F25B8";
    
    // Real Sepolia testnet token addresses
    const TOKEN_ADDRESSES = {
        STETH: "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af",   // Lido stETH
        WSTETH: "0xB82381A3fBD3FaFA77B3a7bE693342618240067b", // wstETH  
        WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"    // WETH
    };

    try {
        // Get signer
        const [signer] = await ethers.getSigners();
        console.log("🔑 Using account:", signer.address);
        
        // Get contract instance
        const LSDLockbox = await ethers.getContractAt("LSDLockbox", CONTRACT_ADDRESS);
        
        // Check current owner
        const owner = await LSDLockbox.owner();
        console.log("👤 Contract owner:", owner);
        console.log("🔓 Signer is owner:", signer.address.toLowerCase() === owner.toLowerCase());
        
        if (signer.address.toLowerCase() !== owner.toLowerCase()) {
            console.log("❌ Error: Signer is not the contract owner!");
            return;
        }
        
        console.log("\n📦 Setting up token support...");
        
        // Add token support with higher gas settings for speed
        const gasSettings = {
            gasLimit: 200000,
            gasPrice: ethers.parseUnits("20", "gwei")
        };
        
        const transactions = [];
        
        // Add stETH support
        console.log("⏳ Adding stETH support...");
        const addStETHTx = await LSDLockbox.setSupportedToken(
            TOKEN_ADDRESSES.STETH,
            "s-stETH", // Symbol for wrapped token on Stellar
            true,
            gasSettings
        );
        transactions.push({ name: "stETH", tx: addStETHTx });
        
        // Add wstETH support
        console.log("⏳ Adding wstETH support...");
        const addWstETHTx = await LSDLockbox.setSupportedToken(
            TOKEN_ADDRESSES.WSTETH,
            "s-wstETH", // Symbol for wrapped token on Stellar
            true,
            gasSettings
        );
        transactions.push({ name: "wstETH", tx: addWstETHTx });
        
        // Add WETH support
        console.log("⏳ Adding WETH support...");
        const addWETHTx = await LSDLockbox.setSupportedToken(
            TOKEN_ADDRESSES.WETH,
            "s-WETH", // Symbol for wrapped token on Stellar
            true,
            gasSettings
        );
        transactions.push({ name: "WETH", tx: addWETHTx });
        
        // Set validator
        console.log("⏳ Setting validator...");
        const setValidatorTx = await LSDLockbox.setValidator(signer.address, true, gasSettings);
        transactions.push({ name: "Validator", tx: setValidatorTx });
        
        // Wait for all confirmations
        console.log("\n⏳ Waiting for confirmations...");
        for (const item of transactions) {
            console.log(`📝 ${item.name}: ${item.tx.hash}`);
            await item.tx.wait(1);
            console.log(`✅ ${item.name} confirmed`);
        }
        
        console.log("\n🎉 Token setup completed successfully!");
        
        // Verify setup
        console.log("\n🔍 Verifying setup...");
        const wethSupported = await LSDLockbox.supportedTokens(TOKEN_ADDRESSES.WETH);
        const stethSupported = await LSDLockbox.supportedTokens(TOKEN_ADDRESSES.STETH);
        const wstethSupported = await LSDLockbox.supportedTokens(TOKEN_ADDRESSES.WSTETH);
        const isValidator = await LSDLockbox.authorizedValidators(signer.address);
        
        console.log("✅ WETH supported:", wethSupported);
        console.log("✅ stETH supported:", stethSupported);
        console.log("✅ wstETH supported:", wstethSupported);
        console.log("✅ Validator authorized:", isValidator);
        
        if (wethSupported && stethSupported && wstethSupported && isValidator) {
            console.log("\n🎯 All tokens and validator configured successfully!");
            console.log("📋 Ready for bridge testing!");
        } else {
            console.log("\n  Some configurations may have failed!");
        }
        
    } catch (error) {
        console.error("❌ Error during setup:", error.message);
        if (error.reason) {
            console.error("💡 Reason:", error.reason);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 