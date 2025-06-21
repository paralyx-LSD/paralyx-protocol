const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🔒 Testing WETH Lock on Paralyx Bridge...\n");

    // Contract details
    const CONTRACT_ADDRESS = "0x6164187652d6c123eB124e0b8b08ee42A10A7d86";
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"; // WETH on Sepolia
    const STELLAR_ADDRESS = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";
    
    // Test amount: 0.001 WETH (minimum allowed)
    const LOCK_AMOUNT = ethers.parseEther("0.001");

    try {
        // Get signer
        const [signer] = await ethers.getSigners();
        console.log("🔑 Using account:", signer.address);
        
        // Check account balance
        const balance = await ethers.provider.getBalance(signer.address);
        console.log("💰 ETH balance:", ethers.formatEther(balance), "ETH");

        // Get contract instances
        const LSDLockbox = await ethers.getContractAt("LSDLockbox", CONTRACT_ADDRESS);
        const WETH = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        
        // Check if WETH is supported
        const isSupported = await LSDLockbox.supportedTokens(WETH_ADDRESS);
        console.log("✅ WETH supported:", isSupported);
        
        if (!isSupported) {
            console.log("❌ WETH is not supported. Adding support...");
            
            // Add WETH support (only owner can do this)
            const tx = await LSDLockbox.setSupportedToken(
                WETH_ADDRESS,
                "s-WETH",
                true
            );
            await tx.wait();
            console.log("✅ WETH support added");
        }

        // Check WETH balance
        let wethBalance = await WETH.balanceOf(signer.address);
        console.log("🪙 WETH balance:", ethers.formatEther(wethBalance), "WETH");
        
        // If we don't have enough WETH, wrap some ETH
        if (wethBalance < LOCK_AMOUNT) {
            console.log("🔄 Wrapping ETH to WETH...");
            
            // WETH contract has a deposit function to wrap ETH
            const wethContract = await ethers.getContractAt(
                ["function deposit() payable", "function balanceOf(address) view returns (uint256)"],
                WETH_ADDRESS
            );
            
            const wrapTx = await wethContract.deposit({ value: LOCK_AMOUNT });
            await wrapTx.wait();
            console.log("✅ ETH wrapped to WETH");
            
            // Check balance again
            wethBalance = await WETH.balanceOf(signer.address);
            console.log("🪙 New WETH balance:", ethers.formatEther(wethBalance), "WETH");
        }

        // Check allowance
        const allowance = await WETH.allowance(signer.address, CONTRACT_ADDRESS);
        console.log("📝 Current allowance:", ethers.formatEther(allowance), "WETH");
        
        if (allowance < LOCK_AMOUNT) {
            console.log("🔒 Approving WETH spending...");
            const approveTx = await WETH.approve(CONTRACT_ADDRESS, LOCK_AMOUNT);
            await approveTx.wait();
            console.log("✅ Approval confirmed");
        }

        // Check contract configuration
        const minLock = await LSDLockbox.minLockAmount();
        const maxLock = await LSDLockbox.maxLockAmount();
        console.log("📊 Min lock amount:", ethers.formatEther(minLock), "tokens");
        console.log("📊 Max lock amount:", ethers.formatEther(maxLock), "tokens");

        console.log("\n🚀 Locking WETH assets...");
        console.log("📍 Contract:", CONTRACT_ADDRESS);
        console.log("🪙 Token:", WETH_ADDRESS, "(WETH)");
        console.log("💰 Amount:", ethers.formatEther(LOCK_AMOUNT), "WETH");
        console.log("🌟 Stellar Address:", STELLAR_ADDRESS);
        
        // Execute lock transaction
        const lockTx = await LSDLockbox.lockAsset(
            WETH_ADDRESS,
            LOCK_AMOUNT,
            STELLAR_ADDRESS,
            {
                gasLimit: 300000 // Set gas limit to avoid estimation issues
            }
        );
        
        console.log("⏳ Transaction submitted:", lockTx.hash);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await lockTx.wait();
        
        console.log("\n✅ WETH Lock Successful!");
        console.log("🎯 Transaction hash:", receipt.hash);
        console.log("⛽ Gas used:", receipt.gasUsed.toString());
        console.log("🆔 Block number:", receipt.blockNumber);
        console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/tx/${receipt.hash}`);
        
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
            console.log("💰 Amount:", ethers.formatEther(parsedEvent.args.amount), "WETH");
            console.log("🌟 Stellar Address:", parsedEvent.args.stellarAddress);
            console.log("🔗 Stellar Symbol:", parsedEvent.args.stellarSymbol);
            console.log("🆔 Lock ID:", parsedEvent.args.lockId.toString());
        }
        
        console.log("\n🌉 Bridge should now detect this lock and mint s-WETH on Stellar!");
        console.log("📊 Monitor bridge logs:");
        console.log("   cd ../validator-node && tail -f logs/bridge.log");
        
    } catch (error) {
        console.error("❌ Error during WETH lock test:", error.message);
        
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