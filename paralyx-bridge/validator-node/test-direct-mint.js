const StellarMinter = require('./stellar-minter');

async function testDirectMint() {
    console.log("Testing Direct Stellar Minting...\n");

    try {
        // Create stellar minter instance
        const stellarMinter = new StellarMinter();
        
        // Initialize the minter
        console.log("Initializing Stellar minter...");
        const initialized = await stellarMinter.initialize();
        
        if (!initialized) {
            console.log("Failed to initialize Stellar minter");
            return;
        }
        
        console.log("Stellar minter initialized successfully");
        
        // Test mint operation (simulating our bridge lock event)
        const testLockEvent = {
            lockId: "1",
            amount: "1000000000000000", // 0.001 ETH in wei (18 decimals)
            stellarAddress: "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN",
            stellarSymbol: "s-WETH",
            token: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
            user: "0x176e6B69F1e08b0A1f75036C6d574Cc7cbb06f60",
            transactionHash: "0xb2c50196f57a0120dea0d65c2a4c965aef8478fdeaa09010d94e1f71fabfb9de"
        };
        
        console.log("Test Lock Event:");
        console.log("  Lock ID:", testLockEvent.lockId);
        console.log("  Amount:", testLockEvent.amount, "wei");
        console.log("  Stellar Address:", testLockEvent.stellarAddress);
        console.log("  Symbol:", testLockEvent.stellarSymbol);
        
        // Queue the mint operation
        console.log("\nQueueing mint operation...");
        stellarMinter.queueMintOperation(testLockEvent);
        
        // Start the minter to process the queue
        console.log("Starting minter to process queue...");
        await stellarMinter.start();
        
        // Wait for processing
        console.log("Waiting for mint processing...");
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        // Check queue status
        const queueStatus = await stellarMinter.getQueueStatus();
        console.log("Queue Status:", queueStatus);
        
        // Stop the minter
        await stellarMinter.stop();
        
        console.log("Direct mint test completed!");
        
    } catch (error) {
        console.error("Error in direct mint test:", error.message);
        console.error("Stack trace:", error.stack);
    }
}

// Run the test
testDirectMint()
    .then(() => {
        console.log("\nTest finished");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Test failed:", error);
        process.exit(1);
    }); 