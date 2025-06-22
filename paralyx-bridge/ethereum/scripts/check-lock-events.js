const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
    console.log("🔍 Checking for AssetLocked events...\n");

    // Contract details
    const CONTRACT_ADDRESS = "0xb8339d7F9F6b81413094AEaEBB75f41009d889bd";
    const WETH_ADDRESS = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
    
    try {
        // Get contract instance
        const LSDLockbox = await ethers.getContractAt("LSDLockbox", CONTRACT_ADDRESS);
        
        // Get current block number
        const currentBlock = await ethers.provider.getBlockNumber();
        console.log("📊 Current block:", currentBlock);
        
        // Check events from last 500 blocks (wider range)
        const fromBlock = Math.max(0, currentBlock - 500);
        console.log("🔍 Searching events from block:", fromBlock, "to", currentBlock);
        
        // Get AssetLocked events
        const filter = LSDLockbox.filters.AssetLocked();
        const events = await LSDLockbox.queryFilter(filter, fromBlock, currentBlock);
        
        console.log("📋 Found", events.length, "AssetLocked events:");
        
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const args = event.args;
            
            console.log(`\n🔒 Event ${i + 1}:`);
            console.log("  📦 Transaction:", event.transactionHash);
            console.log("  📍 Block:", event.blockNumber);
            console.log("  👤 User:", args.user);
            console.log("  🪙 Token:", args.token);
            console.log("  💰 Amount:", ethers.formatEther(args.amount), "tokens");
            console.log("  ⭐ Stellar Address:", args.stellarAddress);
            console.log("  🏷️ Stellar Symbol:", args.stellarSymbol);
            console.log("  🆔 Lock ID:", args.lockId.toString());
            console.log("  🔗 Etherscan:", `https://sepolia.etherscan.io/tx/${event.transactionHash}`);
            
            // Check if it's our WETH event
            if (args.token.toLowerCase() === WETH_ADDRESS.toLowerCase()) {
                console.log("  ✅ This is our WETH lock event!");
            }
        }
        
        // Also check all events from deployment block
        console.log("\n🔍 Checking all events since contract deployment...");
        const deploymentBlock = 8599452; // From our deployment
        const allEvents = await LSDLockbox.queryFilter(filter, deploymentBlock, currentBlock);
        console.log("📋 Total events since deployment:", allEvents.length);
        
        if (allEvents.length > events.length) {
            console.log("📋 Additional events found in full history:");
            for (let i = events.length; i < allEvents.length; i++) {
                const event = allEvents[i];
                const args = event.args;
                console.log(`\n🔒 Historical Event ${i + 1}:`);
                console.log("  📦 Transaction:", event.transactionHash);
                console.log("  📍 Block:", event.blockNumber);
                console.log("  🆔 Lock ID:", args.lockId.toString());
            }
        }
        
        if (events.length === 0) {
            console.log("❌ No AssetLocked events found");
            console.log("💡 Let's try a manual lock transaction...");
            
            // Try a simple lock transaction
            console.log("\n🔄 Attempting a new lock transaction...");
            await attemptLockTransaction(LSDLockbox, WETH_ADDRESS);
        }
        
    } catch (error) {
        console.error("❌ Error checking events:", error.message);
    }
}

async function attemptLockTransaction(lockboxContract, wethAddress) {
    try {
        const [signer] = await ethers.getSigners();
        const WETH = await ethers.getContractAt("IERC20", wethAddress);
        const STELLAR_ADDRESS = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";
        const LOCK_AMOUNT = ethers.parseEther("0.001");
        
        // Check WETH balance
        const wethBalance = await WETH.balanceOf(signer.address);
        console.log("🪙 WETH balance:", ethers.formatEther(wethBalance), "WETH");
        
        if (wethBalance >= LOCK_AMOUNT) {
            // Check allowance
            const allowance = await WETH.allowance(signer.address, await lockboxContract.getAddress());
            console.log("🔒 Allowance:", ethers.formatEther(allowance), "WETH");
            
            if (allowance < LOCK_AMOUNT) {
                console.log("🔒 Approving WETH...");
                const approveTx = await WETH.approve(await lockboxContract.getAddress(), LOCK_AMOUNT);
                await approveTx.wait();
                console.log("✅ Approval confirmed");
            }
            
            console.log("🔒 Executing lock transaction...");
            const lockTx = await lockboxContract.lockAsset(
                wethAddress,
                LOCK_AMOUNT,
                STELLAR_ADDRESS,
                {
                    gasLimit: 400000,
                    gasPrice: ethers.parseUnits("25", "gwei")
                }
            );
            
            console.log("⏳ Transaction submitted:", lockTx.hash);
            const receipt = await lockTx.wait();
            
            if (receipt.status === 1) {
                console.log("✅ Lock transaction successful!");
                console.log("📍 Block:", receipt.blockNumber);
                console.log("⛽ Gas used:", receipt.gasUsed.toString());
                console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/tx/${receipt.hash}`);
                
                // Parse events
                const lockEvents = receipt.logs.filter(log => {
                    try {
                        const parsed = lockboxContract.interface.parseLog(log);
                        return parsed.name === "AssetLocked";
                    } catch {
                        return false;
                    }
                });
                
                if (lockEvents.length > 0) {
                    const parsedEvent = lockboxContract.interface.parseLog(lockEvents[0]);
                    console.log("\n🎉 AssetLocked Event Generated:");
                    console.log("  🆔 Lock ID:", parsedEvent.args.lockId.toString());
                    console.log("  💰 Amount:", ethers.formatEther(parsedEvent.args.amount), "WETH");
                    console.log("  ⭐ Stellar Address:", parsedEvent.args.stellarAddress);
                    console.log("  🏷️ Stellar Symbol:", parsedEvent.args.stellarSymbol);
                }
            }
        } else {
            console.log("❌ Insufficient WETH balance for lock");
        }
        
    } catch (error) {
        console.error("❌ Error in lock transaction:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 