const ethers = require('ethers');
const EventEmitter = require('events');
require('dotenv').config();

class ForceEventDetection extends EventEmitter {
    constructor() {
        super();
        this.provider = null;
        this.contract = null;
    }

    async initialize() {
        console.log("🔍 Initializing Force Event Detection...\n");

        try {
            // Setup provider
            this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
            
            // Contract ABI for AssetLocked event
            const contractABI = [
                "event AssetLocked(address indexed user, address indexed token, uint256 amount, string stellarAddress, string stellarSymbol, uint256 indexed lockId)"
            ];
            
            // Create contract instance
            this.contract = new ethers.Contract(
                process.env.LOCKBOX_CONTRACT_ADDRESS,
                contractABI,
                this.provider
            );
            
            console.log("✅ Connected to Ethereum network");
            console.log("📋 Contract:", process.env.LOCKBOX_CONTRACT_ADDRESS);
            console.log("🌐 Network:", await this.provider.getNetwork());
            
            return true;
        } catch (error) {
            console.error("❌ Failed to initialize:", error.message);
            return false;
        }
    }

    async scanForEvents(fromBlock = null, toBlock = null) {
        try {
            const currentBlock = await this.provider.getBlockNumber();
            
            if (!fromBlock) fromBlock = Math.max(0, currentBlock - 100);
            if (!toBlock) toBlock = currentBlock;
            
            console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock} for AssetLocked events...`);
            
            // Get events
            const filter = this.contract.filters.AssetLocked();
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);
            
            console.log(`📋 Found ${events.length} AssetLocked events`);
            
            for (const event of events) {
                await this.processEvent(event);
            }
            
            return events.length;
        } catch (error) {
            console.error("❌ Error scanning for events:", error.message);
            return 0;
        }
    }

    async processEvent(event) {
        try {
            const args = event.args;
            
            console.log(`\n🔒 Processing AssetLocked Event:`);
            console.log(`  📦 Transaction: ${event.transactionHash}`);
            console.log(`  📍 Block: ${event.blockNumber}`);
            console.log(`  👤 User: ${args.user}`);
            console.log(`  🪙 Token: ${args.token}`);
            console.log(`  💰 Amount: ${ethers.formatEther(args.amount)} tokens`);
            console.log(`  ⭐ Stellar Address: ${args.stellarAddress}`);
            console.log(`  🏷️ Stellar Symbol: ${args.stellarSymbol}`);
            console.log(`  🆔 Lock ID: ${args.lockId.toString()}`);
            
            // Create lock event object for stellar minter
            const lockEvent = {
                lockId: args.lockId.toString(),
                amount: args.amount.toString(),
                stellarAddress: args.stellarAddress,
                stellarSymbol: args.stellarSymbol,
                token: args.token,
                user: args.user,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            };
            
            // Emit the event to trigger stellar minting
            console.log("📤 Emitting assetLocked event for stellar minter...");
            process.emit('assetLocked', lockEvent);
            
            // Also trigger the bridge coordinator
            this.emit('assetLocked', lockEvent);
            
            console.log("✅ Event processed and emitted");
            
        } catch (error) {
            console.error("❌ Error processing event:", error.message);
        }
    }

    async watchForNewEvents() {
        console.log("👀 Starting real-time event monitoring...");
        
        try {
            // Listen for new AssetLocked events
            this.contract.on('AssetLocked', async (user, token, amount, stellarAddress, stellarSymbol, lockId, event) => {
                console.log("\n🚨 NEW AssetLocked EVENT DETECTED!");
                
                const lockEvent = {
                    lockId: lockId.toString(),
                    amount: amount.toString(),
                    stellarAddress: stellarAddress,
                    stellarSymbol: stellarSymbol,
                    token: token,
                    user: user,
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber
                };
                
                await this.processEvent(event);
            });
            
            console.log("✅ Real-time event monitoring started");
            
        } catch (error) {
            console.error("❌ Error setting up event monitoring:", error.message);
        }
    }
}

async function main() {
    console.log("🌉 Force Bridge Event Detection\n");
    
    try {
        const detector = new ForceEventDetection();
        
        // Initialize
        const initialized = await detector.initialize();
        if (!initialized) {
            console.log("❌ Failed to initialize event detector");
            return;
        }
        
        // Scan for existing events
        console.log("🔍 Scanning for existing events...");
        const eventCount = await detector.scanForEvents();
        
        if (eventCount === 0) {
            console.log("❌ No events found. Checking specific transaction...");
            
            // Check our specific transaction
            const txHash = "0xb2c50196f57a0120dea0d65c2a4c965aef8478fdeaa09010d94e1f71fabfb9de";
            console.log(`🔍 Checking transaction: ${txHash}`);
            
            try {
                const receipt = await detector.provider.getTransactionReceipt(txHash);
                if (receipt) {
                    console.log("✅ Transaction found:");
                    console.log(`  📍 Block: ${receipt.blockNumber}`);
                    console.log(`  ✅ Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
                    console.log(`  📋 Logs: ${receipt.logs.length}`);
                    
                    // Parse logs manually
                    for (const log of receipt.logs) {
                        try {
                            const parsed = detector.contract.interface.parseLog(log);
                            if (parsed && parsed.name === 'AssetLocked') {
                                console.log("🎉 Found AssetLocked event in transaction!");
                                await detector.processEvent({
                                    args: parsed.args,
                                    transactionHash: txHash,
                                    blockNumber: receipt.blockNumber
                                });
                            }
                        } catch (e) {
                            // Skip non-matching logs
                        }
                    }
                }
            } catch (error) {
                console.error("❌ Error checking transaction:", error.message);
            }
        }
        
        // Start real-time monitoring
        await detector.watchForNewEvents();
        
        console.log("\n🎯 Event detection is now running...");
        console.log("💡 Press Ctrl+C to stop");
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log("\n👋 Stopping event detection...");
            process.exit(0);
        });
        
        // Keep alive
        setInterval(() => {
            console.log("💓 Event detector heartbeat...");
        }, 30000);
        
    } catch (error) {
        console.error("❌ Error in force event detection:", error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ForceEventDetection; 