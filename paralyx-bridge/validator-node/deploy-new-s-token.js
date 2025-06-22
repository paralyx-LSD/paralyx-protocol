require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');
const fs = require('fs');

async function deployNewSToken() {
  try {
    console.log('🚀 Deploying New S-Token Contract with public_mint');
    console.log('==================================================');
    
    // Setup
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Your keypair
    const deployerKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    console.log('👤 Deployer:', deployerKeypair.publicKey());
    
    // Load account
    const account = await server.loadAccount(deployerKeypair.publicKey());
    console.log('💰 Current sequence:', account.sequenceNumber());
    
    // Read the wasm file
    const wasmPath = '../../paralyx-protocol/target/wasm32-unknown-unknown/release/s_token.wasm';
    console.log('📁 Reading WASM from:', wasmPath);
    
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found at ${wasmPath}`);
    }
    
    const wasmBuffer = fs.readFileSync(wasmPath);
    console.log('📦 WASM size:', wasmBuffer.length, 'bytes');
    
    // Build transaction to upload wasm
    console.log('⬆️  Uploading contract WASM...');
    
    const uploadTransaction = new StellarSdk.TransactionBuilder(account, {
      fee: '1000000', // 1 XLM fee
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.uploadContractWasm({
        wasm: wasmBuffer,
      }))
      .setTimeout(300)
      .build();
    
    // Sign and submit upload
    uploadTransaction.sign(deployerKeypair);
    
    const uploadResult = await rpc.sendTransaction(uploadTransaction);
    console.log('📤 Upload transaction:', uploadResult.hash);
    
    // Wait for upload to complete
    let uploadResponse;
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      uploadResponse = await rpc.getTransaction(uploadResult.hash);
      if (uploadResponse.status !== 'NOT_FOUND') {
        break;
      }
      attempts++;
      console.log(`⏳ Waiting for upload... (${attempts}/20)`);
    }
    
    if (uploadResponse.status !== 'SUCCESS') {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    console.log('✅ WASM uploaded successfully!');
    
    // Get the wasm hash
    const wasmHash = uploadResponse.returnValue;
    console.log('🔑 WASM Hash:', wasmHash);
    
    // Deploy the contract
    console.log('🏗️  Deploying contract...');
    
    const deployAccount = await server.loadAccount(deployerKeypair.publicKey());
    
    const deployTransaction = new StellarSdk.TransactionBuilder(deployAccount, {
      fee: '1000000', // 1 XLM fee
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.createContract({
        wasmHash: wasmHash,
        address: deployerKeypair.publicKey(),
      }))
      .setTimeout(300)
      .build();
    
    // Sign and submit deploy
    deployTransaction.sign(deployerKeypair);
    
    const deployResult = await rpc.sendTransaction(deployTransaction);
    console.log('📤 Deploy transaction:', deployResult.hash);
    
    // Wait for deploy to complete
    let deployResponse;
    attempts = 0;
    while (attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      deployResponse = await rpc.getTransaction(deployResult.hash);
      if (deployResponse.status !== 'NOT_FOUND') {
        break;
      }
      attempts++;
      console.log(`⏳ Waiting for deployment... (${attempts}/20)`);
    }
    
    if (deployResponse.status !== 'SUCCESS') {
      throw new Error(`Deployment failed: ${deployResponse.status}`);
    }
    
    console.log('✅ Contract deployed successfully!');
    
    // Get the contract address
    const contractAddress = deployResponse.returnValue;
    console.log('');
    console.log('🎉 NEW S-TOKEN CONTRACT DEPLOYED!');
    console.log('==================================');
    console.log('📍 Contract Address:', contractAddress);
    console.log('🔑 WASM Hash:', wasmHash);
    console.log('👤 Deployer:', deployerKeypair.publicKey());
    console.log('');
    console.log('🔧 Next steps:');
    console.log('1. Update bridge systems to use this new contract address');
    console.log('2. Test public_mint function');
    console.log('3. Complete bridge transaction with new contract');
    
    return {
      contractAddress,
      wasmHash,
      deployer: deployerKeypair.publicKey()
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

// Run deployment
deployNewSToken()
  .then(result => {
    console.log('✅ Deployment completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }); 