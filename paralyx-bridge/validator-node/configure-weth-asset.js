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

console.log('Paralyx Bridge - WETH Asset Configuration');
console.log('==========================================');
console.log('Configuring WETH asset in lending pool...');
console.log('');

async function configureWETHAsset() {
    try {
        console.log('Step 1: Loading source account...');
        
        // Get source account
        const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
        console.log(`Source Account: ${sourceKeypair.publicKey()}`);
        console.log(`Sequence: ${sourceAccount.sequenceNumber()}`);
        
        console.log('Step 2: Preparing asset configuration...');
        
        // Asset configuration for WETH
        const assetConfig = {
            asset: 'WETH',
            ltv_ratio: 8000,      // 80% LTV
            liquidation_threshold: 8500,  // 85% liquidation threshold  
            reserve_factor: 1000   // 10% reserve factor
        };
        
        console.log(`Asset: ${assetConfig.asset}`);
        console.log(`LTV Ratio: ${assetConfig.ltv_ratio / 100}%`);
        console.log(`Liquidation Threshold: ${assetConfig.liquidation_threshold / 100}%`);
        console.log(`Reserve Factor: ${assetConfig.reserve_factor / 100}%`);
        
        console.log('Step 3: Building configuration transaction...');
        
        // Build contract call operation
        const contract = new StellarSdk.Contract(LENDING_POOL_CONTRACT);
        
        const operation = contract.call(
            'configure_asset',
            StellarSdk.nativeToScVal(assetConfig.asset, { type: 'symbol' }),
            StellarSdk.nativeToScVal(assetConfig.ltv_ratio, { type: 'u32' }),
            StellarSdk.nativeToScVal(assetConfig.liquidation_threshold, { type: 'u32' }),
            StellarSdk.nativeToScVal(assetConfig.reserve_factor, { type: 'u32' })
        );
        
        // Build transaction
        const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: '1000000', // 1 XLM fee
            networkPassphrase: network,
        })
        .addOperation(operation)
        .setTimeout(300)
        .build();
        
        console.log('Step 4: Preparing transaction...');
        const preparedTransaction = await rpc.prepareTransaction(transaction);
        
        console.log('Step 5: Signing transaction...');
        preparedTransaction.sign(sourceKeypair);
        
        console.log('Step 6: Submitting transaction...');
        const response = await rpc.sendTransaction(preparedTransaction);
        
        console.log('Transaction submitted. Waiting for confirmation...');
        console.log(`Transaction Hash: ${response.hash}`);
        
        // Wait for transaction confirmation
        let txResponse;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            try {
                txResponse = await rpc.getTransaction(response.hash);
                if (txResponse.status === 'SUCCESS') {
                    console.log('Transaction confirmed successfully!');
                    break;
                } else if (txResponse.status === 'FAILED') {
                    console.log('Transaction failed!');
                    console.log('Result XDR:', txResponse.resultXdr);
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
            console.log('\nTransaction confirmation timeout');
            return;
        }
        
        console.log('\nWETH Asset Configuration Completed!');
        console.log('===================================');
        console.log('Successfully configured WETH asset in lending pool');
        console.log(`Transaction: ${response.hash}`);
        console.log(`Asset: ${assetConfig.asset}`);
        console.log(`Configuration: ${assetConfig.ltv_ratio / 100}% LTV, ${assetConfig.liquidation_threshold / 100}% liquidation`);
        console.log('');
        console.log('WETH asset is now ready for lending pool operations!');
        console.log(`Stellar Explorer: https://stellar.expert/explorer/testnet/tx/${response.hash}`);
        
        return response.hash;
        
    } catch (error) {
        console.error('Asset configuration failed:', error.message);
        if (error.response && error.response.data) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

// Execute asset configuration
configureWETHAsset()
    .then((txHash) => {
        console.log(`\nAsset configuration completed successfully!`);
        console.log(`Transaction Hash: ${txHash}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nAsset configuration failed:', error.message);
        process.exit(1);
    }); 