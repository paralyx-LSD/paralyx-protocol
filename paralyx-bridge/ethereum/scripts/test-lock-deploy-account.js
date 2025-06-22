const { ethers } = require("hardhat");
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("Testing WETH Lock with Deploy Account...\n");

    // Contract details - Latest deployment: 2025-06-20T23:11:50.849Z
    const CONTRACT_ADDRESS = "0x6164187652d6c123eB124e0b8b08ee42A10A7d86";
    const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
    const STELLAR_ADDRESS = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";
    
    // Test amount: 0.001 WETH (minimum allowed)
    const LOCK_AMOUNT = ethers.parseEther("0.001");

    try {
        // Use the deploy account (from hardhat config)
        const [signer] = await ethers.getSigners();
        console.log(" Using deploy account:", signer.address);
        
        // Check account balance
        const balance = await ethers.provider.getBalance(signer.address);
        console.log("ETH balance:", ethers.formatEther(balance), "ETH");

        // Get contract instances
        const LSDLockbox = new ethers.Contract(CONTRACT_ADDRESS, [
            "function lockAsset(address token, uint256 amount, string memory stellarAddress) external",
            "function supportedTokens(address) view returns (bool)",
            "event AssetLocked(address indexed user, address indexed token, uint256 amount, string stellarAddress, string stellarSymbol, uint256 indexed lockId)"
        ], signer);
        
        const WETH = new ethers.Contract(WETH_ADDRESS, [
            "function balanceOf(address) view returns (uint256)",
            "function allowance(address, address) view returns (uint256)",
            "function approve(address, uint256) returns (bool)",
            "function deposit() payable"
        ], signer);
        
        // Verify prerequisites
        console.log("Verifying prerequisites...");
        
        const isSupported = await LSDLockbox.supportedTokens(WETH_ADDRESS);
        console.log("WETH supported:", isSupported);
        
        const wethBalance = await WETH.balanceOf(signer.address);
        console.log("WETH balance:", ethers.formatEther(wethBalance), "WETH");
        
        const allowance = await WETH.allowance(signer.address, CONTRACT_ADDRESS);
        console.log("Allowance:", ethers.formatEther(allowance), "WETH");
        
        // Ensure we have enough WETH and allowance
        if (wethBalance < LOCK_AMOUNT) {
            console.log("Wrapping ETH to WETH...");
            const wrapTx = await WETH.deposit({ value: LOCK_AMOUNT });
            await wrapTx.wait();
            console.log("ETH wrapped to WETH");
        }
        
        if (allowance < LOCK_AMOUNT) {
            console.log("Approving WETH spending...");
            const approveTx = await WETH.approve(CONTRACT_ADDRESS, LOCK_AMOUNT);
            await approveTx.wait();
            console.log("Approval confirmed");
        }

        console.log("\nExecuting asset lock...");
        
        // Estimate gas first
        let gasEstimate;
        try {
            gasEstimate = await LSDLockbox.lockAsset.estimateGas(
                WETH_ADDRESS,
                LOCK_AMOUNT,
                STELLAR_ADDRESS
            );
            console.log("Estimated gas:", gasEstimate.toString());
        } catch (error) {
            console.log("Gas estimation failed:", error.message);
            gasEstimate = 500000n; // Fallback gas limit
        }

        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate + (gasEstimate * 20n / 100n);
        console.log("Using gas limit:", gasLimit.toString());
        
        // Execute lock transaction with proper gas limit
        const lockTx = await LSDLockbox.lockAsset(
            WETH_ADDRESS,
            LOCK_AMOUNT,
            STELLAR_ADDRESS,
            {
                gasLimit: gasLimit
            }
        );
        
        console.log("Transaction submitted:", lockTx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await lockTx.wait();
        
        if (receipt.status === 1) {
            console.log("\nWETH Lock Successful!");
            console.log("Transaction hash:", receipt.hash);
            console.log("Gas used:", receipt.gasUsed.toString());
            console.log("Block number:", receipt.blockNumber);
            console.log("Etherscan:", `https://sepolia.etherscan.io/tx/${receipt.hash}`);
            
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
                console.log("\nLock Event Details:");
                console.log("User:", parsedEvent.args.user);
                console.log("Token:", parsedEvent.args.token);
                console.log("Amount:", ethers.formatEther(parsedEvent.args.amount), "WETH");
                console.log("Stellar Address:", parsedEvent.args.stellarAddress);
                console.log("Stellar Symbol:", parsedEvent.args.stellarSymbol);
                console.log("Lock ID:", parsedEvent.args.lockId.toString());
                
                console.log("\nSUCCESS! Bridge should now process this lock and mint s-WETH on Stellar!");
                console.log("Monitor bridge logs with:");
                console.log("   cd ../validator-node && tail -f logs/bridge.log");
            } else {
                console.log("No AssetLocked event found in transaction logs");
            }
        } else {
            console.log("Transaction failed with status:", receipt.status);
        }
        
    } catch (error) {
        console.error("Error during WETH lock test:", error.message);
        
        if (error.receipt) {
            console.log("Transaction receipt:", error.receipt);
        }
        
        if (error.reason) {
            console.error("Reason:", error.reason);
        }
        
        if (error.code === "CALL_EXCEPTION") {
            console.error("This is a contract call failure. Possible causes:");
            console.error("   - Insufficient token balance or allowance");
            console.error("   - Token not supported");
            console.error("   - Amount outside min/max limits");
            console.error("   - Invalid Stellar address format");
            console.error("   - Contract is paused");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 