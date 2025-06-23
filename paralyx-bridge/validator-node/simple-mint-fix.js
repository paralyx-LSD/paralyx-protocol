require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function simpleMintFix() {
  try {
    console.log('🔧 Simple Mint Fix for User');
    console.log('============================');
    
    // User's details from the failed transaction
    const userAddress = 'GA3EYTFG75D33UWBDJXI55MYY4IVDWH3EHN7U2H5IIHNF5QZT6L26BQF';
    const amount = '1000000000000000'; // 0.001 WETH in wei
    
    console.log('👤 User:', userAddress);
    console.log('💰 Amount:', amount, 'wei (0.001 WETH)');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Use the user's own account to mint to themselves (simulate lending pool)
    // This is a workaround since we don't have proper bridge validator setup
    const keypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(keypair.publicKey());
    
    console.log('🔑 Using account:', keypair.publicKey());
    console.log('💰 Balance:', account.balances[0].balance, 'XLM');
    
    // Create contract
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    console.log('🏗️ Building basic mint transaction...');
    
    // Try regular mint function (this is what the failed transaction tried)
    const operation = contract.call(
      'mint',
      StellarSdk.Address.fromString(userAddress).toScVal(),
      new StellarSdk.ScInt(amount).toI128()
    );
    
    // Build transaction with high fee
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: '10000000', // 10 XLM fee to ensure it goes through
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    
    console.log('📝 Preparing transaction...');
    const preparedTransaction = await rpc.prepareTransaction(transaction);
    
    console.log('✍️ Signing transaction...');
    preparedTransaction.sign(keypair);
    
    console.log('🚀 Submitting mint transaction...');
    const result = await rpc.sendTransaction(preparedTransaction);
    
    console.log('⏳ Transaction submitted:', result.hash);
    console.log('🔗 Explorer:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    console.log('');
    console.log('⏰ Waiting for confirmation...');
    
    // Wait for confirmation
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const txResponse = await rpc.getTransaction(result.hash);
        
        if (txResponse.status === 'SUCCESS') {
          console.log('\n✅ SUCCESS! Mint transaction completed!');
          console.log('==========================================');
          console.log(`🎉 Successfully minted 0.001 s-WETH!`);
          console.log(`👤 Recipient: ${userAddress}`);
          console.log(`🔗 Transaction: ${result.hash}`);
          console.log(`🌐 Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
          console.log('');
          console.log('🎯 User should now see s-WETH tokens in their wallet!');
          break;
          
        } else if (txResponse.status === 'FAILED') {
          console.log('\n❌ Transaction failed!');
          console.log('Result:', txResponse.resultXdr);
          
          // Show error details from events
          if (txResponse.result && txResponse.result.events) {
            console.log('\n🔍 Error Events:');
            txResponse.result.events.forEach((event, index) => {
              console.log(`${index + 1}:`, event);
            });
          }
          break;
        }
        
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // Still pending
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
      console.log('\n⏰ Timeout waiting for confirmation');
      console.log('🔍 Check manually:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response && error.response.data) {
      console.error('\n💥 Full error response:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

simpleMintFix(); 