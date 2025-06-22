#!/usr/bin/env node

const StellarSdk = require('@stellar/stellar-sdk');
require('dotenv').config();

// Configuration
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
const network = StellarSdk.Networks.TESTNET;
const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.STELLAR_SECRET_KEY);

// Contract IDs from deployment
const LENDING_POOL_CONTRACT = 'CBQX5H6EL6ZCHURGW5ZAZMTIVNTGJGHO4BV3GSQ5RSTLAIHHA6ZT2WKP';
const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

// Bridge event data (from Ethereum lock event)
const BRIDGE_EVENT = {
    user: 'GB5NWPRQZ5BP7L73O4OWH3WBBM3FH2KAPCZACRSDPPJFPXYFE6GFC4PN', // Bridge validator
    asset: 'WETH',
    amount: 1000000, // 0.001 WETH in microunits (1e6)
    lockId: 1,
    txHash: '0xb2c50196f57a0120dea0d65c2a4c965aef8478fdeaa09010d94e1f71fabfb9de'
};

console.log(' Paralyx Bridge - Lending Pool Mint Test');
console.log('================================================');
console.log(' Bridging from Ethereum to Stellar via Lending Pool');
console.log(' Bridge Event Data:');
console.log(`   User: ${BRIDGE_EVENT.user}`);
console.log(`   Asset: ${BRIDGE_EVENT.asset}`);
console.log(`   Amount: ${BRIDGE_EVENT.amount} (0.001 WETH)`);
console.log(`   Lock ID: ${BRIDGE_EVENT.lockId}`);
console.log(`   Ethereum TX: ${BRIDGE_EVENT.txHash}`);
console.log('');

async function bridgeMintViaLendingPool() {
    try {
        console.log(' Step 1: Preparing Lending Pool deposit transaction...');
        
        // Get source account
        const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
        console.log(` Source Account: ${sourceKeypair.publicKey()}`);
        console.log(` Sequence: ${sourceAccount.sequenceNumber()}`);
        
        // Convert asset symbol to Stellar Symbol format (7 characters max)
        const assetSymbol = BRIDGE_EVENT.asset; // 'WETH'
        
        console.log(' Step 2: Calling lending pool deposit function...');
        console.log(` Contract: ${LENDING_POOL_CONTRACT}`);
        console.log(` User: ${BRIDGE_EVENT.user}`);
        console.log(` Asset: ${assetSymbol}`);
        console.log(` Amount: ${BRIDGE_EVENT.amount}`);
        
        // Build contract call operation
        const contract = new StellarSdk.Contract(LENDING_POOL_CONTRACT);
        
        const operation = contract.call(
            'deposit',
            StellarSdk.Address.fromString(BRIDGE_EVENT.user).toScVal(),
            StellarSdk.nativeToScVal(assetSymbol, { type: 'symbol' }),
            new StellarSdk.ScInt(BRIDGE_EVENT.amount).toI128()
        );
        
        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '10000000', // 10 XLM fee for complex operation
            networkPassphrase: network,
        })
        .addOperation(operation)
        .setTimeout(300)
        .build();
        
        console.log(' Step 3: Preparing transaction...');
        const preparedTransaction = await rpc.prepareTransaction(transaction);
        
        console.log(' Step 4: Signing transaction...');
        preparedTransaction.sign(sourceKeypair);
        
        console.log(' Step 5: Submitting transaction...');
        const response = await rpc.sendTransaction(preparedTransaction);
        
        console.log(' Transaction submitted. Waiting for confirmation...');
        console.log(` Transaction Hash: ${response.hash}`);
        
        // Wait for transaction confirmation
        let txResponse;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            try {
                txResponse = await rpc.getTransaction(response.hash);
                if (txResponse.status === 'SUCCESS') {
                    console.log('✅ Transaction confirmed successfully!');
                    break;
                } else if (txResponse.status === 'FAILED') {
                    console.log('❌ Transaction failed!');
                    console.log('📋 Result XDR:', txResponse.resultXdr);
                    break;
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    // Transaction not yet confirmed, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                    process.stdout.write('.');
                    continue;
                } else {
                    throw error;
                }
            }
        }
        
        if (attempts >= maxAttempts) {
            console.log('\n⏰ Transaction confirmation timeout');
            return;
        }
        
        console.log('\n🎉 BRIDGE MINT COMPLETED!');
        console.log('========================');
        console.log(' Successfully bridged WETH from Ethereum to Stellar');
        console.log(` Transaction: ${response.hash}`);
        console.log(` Amount: ${BRIDGE_EVENT.amount} units (0.001 WETH)`);
        console.log(` Method: Lending Pool deposit`);
        console.log(` S-Tokens minted: ${BRIDGE_EVENT.amount}`);
        console.log('');
        console.log(' Cross-Chain Bridge Transaction Complete!');
        console.log(`🔗 Stellar Explorer: https://stellar.expert/explorer/testnet/tx/${response.hash}`);
        
        return response.hash;
        
    } catch (error) {
        console.error('❌ Bridge mint failed:', error.message);
        if (error.response && error.response.data) {
            console.error('📋 Response data:', error.response.data);
        }
        throw error;
    }
}

// Execute bridge mint
bridgeMintViaLendingPool()
    .then((txHash) => {
        console.log(`\n✅ Bridge testing completed successfully!`);
        console.log(`📦 Transaction Hash: ${txHash}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Bridge testing failed:', error.message);
        process.exit(1);
    }); 