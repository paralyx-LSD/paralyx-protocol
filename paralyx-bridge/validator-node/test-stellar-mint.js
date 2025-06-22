const StellarSdk = require('stellar-sdk');
require('dotenv').config();

async function testStellarMint() {
    console.log("🌟 Testing Stellar Minting Functionality...\n");

    try {
        // Stellar configuration
        const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        const rpcServer = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
        
        // Load minter account
        const minterKeypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_MINTER_PRIVATE_KEY);
        console.log("🔑 Minter account:", minterKeypair.publicKey());
        
        // Contract details
        const contractId = process.env.STELLAR_S_TOKEN_CONTRACT_ID;
        console.log("📋 S-Token Contract:", contractId);
        
        // Test parameters (simulating bridge lock)
        const testRecipient = "GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN";
        const testAmount = "1000000"; // 0.001 WETH in stroops (7 decimals)
        const lockId = "1";
        
        console.log("🎯 Test Parameters:");
        console.log("  👤 Recipient:", testRecipient);
        console.log("  💰 Amount:", testAmount, "stroops (0.001 WETH)");
        console.log("  🆔 Lock ID:", lockId);
        
        // Load minter account
        const minterAccount = await server.loadAccount(minterKeypair.publicKey());
        console.log("💰 Minter balance:", minterAccount.balances[0].balance, "XLM");
        
        // Create mint transaction
        console.log("\n🔄 Creating mint transaction...");
        
        const contract = new StellarSdk.Contract(contractId);
        
        // Build mint operation
        const mintOperation = contract.call(
            'mint',
            StellarSdk.Address.fromString(testRecipient).toScVal(),
            StellarSdk.nativeToScVal(testAmount, { type: 'i128' }),
            StellarSdk.nativeToScVal(lockId, { type: 'string' })
        );
        
        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(minterAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(mintOperation)
        .setTimeout(30)
        .build();
        
        console.log("📋 Transaction built successfully");
        
        // Simulate transaction first
        console.log("🧪 Simulating transaction...");
        const simulation = await rpcServer.simulateTransaction(transaction);
        
        if (simulation.error) {
            console.log("❌ Simulation failed:", simulation.error);
            return;
        }
        
        console.log("✅ Simulation successful");
        console.log("⛽ Estimated fee:", simulation.minResourceFee);
        
        // Prepare and sign transaction
        const preparedTransaction = StellarSdk.assembleTransaction(transaction, simulation);
        preparedTransaction.sign(minterKeypair);
        
        console.log("🔒 Transaction signed");
        
        // Submit transaction
        console.log("📤 Submitting transaction to Stellar...");
        const result = await rpcServer.sendTransaction(preparedTransaction);
        
        console.log("📋 Transaction result:");
        console.log("  🆔 Transaction ID:", result.hash);
        console.log("  📊 Status:", result.status);
        
        if (result.status === 'SUCCESS') {
            console.log("🎉 STELLAR MINTING SUCCESSFUL!");
            console.log("  🔗 Stellar Explorer:", `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
            
            // Wait for confirmation and check balance
            console.log("\n⏳ Waiting for confirmation...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check recipient balance
            console.log("🔍 Checking recipient s-WETH balance...");
            await checkTokenBalance(rpcServer, contractId, testRecipient);
            
        } else {
            console.log("❌ Transaction failed:", result);
        }
        
    } catch (error) {
        console.error("❌ Error in Stellar minting test:", error.message);
        if (error.response && error.response.data) {
            console.error("💡 Response data:", error.response.data);
        }
    }
}

async function checkTokenBalance(rpcServer, contractId, accountId) {
    try {
        const contract = new StellarSdk.Contract(contractId);
        
        // Build balance query
        const balanceOperation = contract.call(
            'balance',
            StellarSdk.Address.fromString(accountId).toScVal()
        );
        
        // Create a dummy transaction for the query
        const dummyKeypair = StellarSdk.Keypair.random();
        const dummyAccount = new StellarSdk.Account(dummyKeypair.publicKey(), "0");
        
        const queryTransaction = new StellarSdk.TransactionBuilder(dummyAccount, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(balanceOperation)
        .setTimeout(30)
        .build();
        
        // Simulate to get balance
        const simulation = await rpcServer.simulateTransaction(queryTransaction);
        
        if (simulation.result && simulation.result.retval) {
            const balance = StellarSdk.scValToNative(simulation.result.retval);
            console.log("💰 s-WETH Balance:", balance, "stroops");
            console.log("💰 s-WETH Balance (formatted):", (balance / 10000000).toFixed(7), "s-WETH");
        } else {
            console.log("❌ Could not retrieve balance");
        }
        
    } catch (error) {
        console.error("❌ Error checking balance:", error.message);
    }
}

// Run the test
testStellarMint()
    .then(() => {
        console.log("\n🎯 Stellar minting test completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 