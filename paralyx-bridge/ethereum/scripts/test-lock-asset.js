const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🔒 Testing Asset Lock on Paralyx Bridge...\n");

    // Contract details
    const CONTRACT_ADDRESS = "0x6164187652d6c123eB124e0b8b08ee42A10A7d86";
    const STETH_ADDRESS = "0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af"; // Lido stETH on Sepolia
    const STELLAR_ADDRESS = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";
    
    // Test amount: 0.001 stETH (minimum allowed)
    const LOCK_AMOUNT = ethers.parseEther("0.001");

    try {
        // Get signer
        const [signer] = await ethers.getSigners();
        console.log("🔑 Using account:", signer.address);
        
        // Check account balance
        const balance = await ethers.provider.getBalance(signer.address);
        console.log("💰 ETH balance:", ethers.formatEther(balance), "ETH");

        // Get contract instance
        const LSDLockbox = await ethers.getContractAt("LSDLockbox", CONTRACT_ADDRESS);
        
        // Check if token is supported
        const isSupported = await LSDLockbox.supportedTokens(STETH_ADDRESS);
        console.log("✅ stETH supported:", isSupported);
        
        if (!isSupported) {
            console.log("❌ stETH is not supported. Adding support...");
            
            // Add stETH support (only owner can do this)
            const tx = await LSDLockbox.setSupportedToken(
                STETH_ADDRESS,
                "s-stETH",
                true
            );
            await tx.wait();
            console.log("✅ stETH support added");
        }

        // Get stETH contract instance
        const stETH = await ethers.getContractAt("IERC20", STETH_ADDRESS);
        
        // Check stETH balance
        const stETHBalance = await stETH.balanceOf(signer.address);
        console.log("🪙 stETH balance:", ethers.formatEther(stETHBalance), "stETH");
        
        if (stETHBalance < LOCK_AMOUNT) {
            console.log("❌ Insufficient stETH balance for test");
            console.log("💡 You need at least 0.001 stETH to test");
            console.log("🔗 Get test stETH from Lido Sepolia testnet");
            return;
        }

        // Check allowance
        const allowance = await stETH.allowance(signer.address, CONTRACT_ADDRESS);
        console.log("📝 Current allowance:", ethers.formatEther(allowance), "stETH");
        
        if (allowance < LOCK_AMOUNT) {
            console.log("🔒 Approving stETH spending...");
            const approveTx = await stETH.approve(CONTRACT_ADDRESS, LOCK_AMOUNT);
            await approveTx.wait();
            console.log("✅ Approval confirmed");
        }

        // Check contract configuration
        const minLock = await LSDLockbox.minLockAmount();
        const maxLock = await LSDLockbox.maxLockAmount();
        console.log("📊 Min lock amount:", ethers.formatEther(minLock), "tokens");
        console.log("📊 Max lock amount:", ethers.formatEther(maxLock), "tokens");

        console.log("\n🚀 Locking assets...");
        console.log("📍 Contract:", CONTRACT_ADDRESS);
        console.log("🪙 Token:", STETH_ADDRESS, "(stETH)");
        console.log("💰 Amount:", ethers.formatEther(LOCK_AMOUNT), "stETH");
        console.log("🌟 Stellar Address:", STELLAR_ADDRESS);
        
        // Execute lock transaction
        const lockTx = await LSDLockbox.lockAsset(
            STETH_ADDRESS,
            LOCK_AMOUNT,
            STELLAR_ADDRESS,
            {
                gasLimit: 300000 // Set gas limit to avoid estimation issues
            }
        );
        
        console.log("⏳ Transaction submitted:", lockTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await lockTx.wait();
        
        console.log("\n✅ Asset Lock Successful!");
        console.log("🎯 Transaction hash:", receipt.hash);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        console.log("🆔 Block number:", receipt.blockNumber);
        
        // Parse the AssetLocked event
        const lockEvents = receipt.logs.filter(log => {
            try {
                const parsed = LSDLockbox.interface.parseLog(log);
                return parsed.name === "AssetLocked";
            } catch {
                return false;
            }
        });
        
        if (lockEvents.length > 0) {
            const parsedEvent = LSDLockbox.interface.parseLog(lockEvents[0]);
            console.log("\n📋 Lock Details:");
            console.log("👤 User:", parsedEvent.args.user);
            console.log("🪙 Token:", parsedEvent.args.token);
            console.log("💰 Amount:", ethers.formatEther(parsedEvent.args.amount), "stETH");
            console.log("🌟 Stellar Address:", parsedEvent.args.stellarAddress);
            console.log("🔗 Stellar Symbol:", parsedEvent.args.stellarSymbol);
            console.log("🆔 Lock ID:", parsedEvent.args.lockId.toString());
        }
        
        console.log("\n🌉 Bridge should now process this lock and mint s-stETH on Stellar!");
        console.log("📊 Monitor bridge logs: cd ../validator-node && tail -f logs/bridge.log");
        
    } catch (error) {
        console.error("❌ Error during asset lock test:", error.message);
        
        if (error.reason) {
            console.error("💡 Reason:", error.reason);
        }
        
        if (error.code === "CALL_EXCEPTION") {
            console.error("💡 This might be a contract call failure. Check:");
            console.error("   - Token support status");
            console.error("   - Minimum/maximum lock amounts");
            console.error("   - Token allowance");
            console.error("   - Account balance");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 