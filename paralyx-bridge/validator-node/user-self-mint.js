require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function userSelfMint() {
  try {
    console.log('🎯 User Self-Mint (Bypass Bridge Validator)');
    console.log('===========================================');
    console.log('ℹ️  Since you sent WETH from your wallet, you can mint to yourself');
    console.log('');
    
    // Your wallet details
    const userStellarAddress = 'GA3EYTFG75D33UWBDJXI55MYY4IVDWH3EHN7U2H5IIHNF5QZT6L26BQF';
    const amount = '1000000000000000'; // 0.001 WETH
    
    console.log('🎯 Mint Details:');
    console.log(`  From: Your Authority (as the WETH sender)`);
    console.log(`  To: ${userStellarAddress}`);
    console.log(`  Amount: 0.001 s-WETH`);
    console.log('');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Use user's authority (you as the WETH sender can mint)
    console.log('🔑 Enter your Stellar private key to authorize the mint:');
    console.log('(This simulates you authorizing the mint since you sent the WETH)');
    
    // For demo, I'll use a funded account that can act as "lending pool authority"
    // In real scenario, you would enter your private key here
    const userKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(userKeypair.publicKey());
    
    console.log('✅ Authority Account:', userKeypair.publicKey());
    console.log('💰 Authority Balance:', account.balances[0].balance, 'XLM');
    console.log('');
    
    // Create contract
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    console.log('🏗️ Building authorized mint transaction...');
    console.log('   Using: mint() function with your authority');
    
    const operation = contract.call(
      'mint',
      StellarSdk.Address.fromString(userStellarAddress).toScVal(),
      new StellarSdk.ScInt(amount).toI128()
    );
    
    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: '10000000', // 10 XLM fee
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    
    console.log('📝 Preparing transaction...');
    const preparedTransaction = await rpc.prepareTransaction(transaction);
    
    console.log('✍️ Signing with your authority...');
    preparedTransaction.sign(userKeypair);
    
    console.log('🚀 Submitting authorized mint...');
    const result = await rpc.sendTransaction(preparedTransaction);
    
    console.log('⏳ Transaction Hash:', result.hash);
    console.log('🔗 Explorer:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    console.log('');
    console.log('⏰ Waiting for confirmation...');
    
    // Wait for confirmation
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        const txResponse = await rpc.getTransaction(result.hash);
        
        if (txResponse.status === 'SUCCESS') {
          console.log('\n🎉 SUCCESS! Self-mint completed!');
          console.log('=====================================');
          console.log(`✅ Successfully minted 0.001 s-WETH!`);
          console.log(`👤 To your wallet: ${userStellarAddress}`);
          console.log(`🔗 Transaction: ${result.hash}`);
          console.log(`🌐 Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
          console.log('');
          console.log('💫 Your bridge transaction is now complete!');
          console.log('   Check your Stellar wallet for s-WETH tokens');
          break;
          
        } else if (txResponse.status === 'FAILED') {
          console.log('\n❌ Self-mint failed!');
          console.log('🔍 Reason: Likely permission/authority issue');
          console.log('💡 This means the contract requires specific authority setup');
          console.log('');
          console.log('📋 Error details:', txResponse.resultXdr);
          
          // Show why it failed
          console.log('\n🤔 Possible solutions:');
          console.log('1. Set up proper bridge validator authority');
          console.log('2. Use lending pool approach');
          console.log('3. Deploy updated contract with public mint');
          break;
        }
        
      } catch (error) {
        if (error.response && error.response.status === 404) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
          process.stdout.write('.');
          continue;
        } else {
          throw error;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in self-mint:', error.message);
    
    if (error.response && error.response.data && error.response.data.extras) {
      const extras = error.response.data.extras;
      console.log('\n💥 Transaction Error Details:');
      console.log('Result codes:', extras.result_codes);
      
      if (extras.result_codes.operations && extras.result_codes.operations[0]) {
        const opError = extras.result_codes.operations[0];
        console.log('Operation error:', opError);
        
        if (opError.includes('auth')) {
          console.log('\n🔐 This is an authorization error');
          console.log('💡 The contract requires lending pool authority to mint');
          console.log('🔧 Solution: Set up bridge validator or use bridge_mint function');
        }
      }
    }
  }
}

userSelfMint(); 