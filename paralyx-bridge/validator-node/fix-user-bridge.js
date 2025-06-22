require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function fixUserBridge() {
  try {
    console.log('🔧 Fixing User Bridge Transaction');
    console.log('=================================');
    
    // User's bridge details (from the failed Ethereum transaction)
    const bridgeData = {
      stellarAddress: 'GCHVT3BOXV2EC7IR3TUFX4OFGCSOLOV3SAFFXGVZBHBJHHGD3657BRNM',
      amount: '1000000000000000', // 0.001 WETH in wei
      lockId: '7',
      ethTxHash: '0xef17d6a0c90003485fef54c567b09e438930ffc5fa318d7998141cef97b5b379'
    };
    
    console.log('🎯 Bridge Data:');
    console.log(`  User Address: ${bridgeData.stellarAddress}`);
    console.log(`  Amount: ${bridgeData.amount} wei (0.001 WETH)`);
    console.log(`  Lock ID: ${bridgeData.lockId}`);
    console.log(`  Ethereum TX: ${bridgeData.ethTxHash}`);
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Use bridge validator account
    const bridgeKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(bridgeKeypair.publicKey());
    
    console.log('🔑 Bridge Validator:', bridgeKeypair.publicKey());
    console.log('💰 Bridge Balance:', account.balances[0].balance, 'XLM');
    
    // Create contract and operation
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    console.log('🏗️ Building mint transaction with public_mint()...');
    
    const operation = contract.call(
      'public_mint',
      StellarSdk.Address.fromString(bridgeData.stellarAddress).toScVal(),
      new StellarSdk.ScInt(bridgeData.amount).toI128()
    );
    
    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: '5000000', // 5 XLM fee for contract operation
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    
    console.log('📝 Preparing transaction...');
    const preparedTransaction = await rpc.prepareTransaction(transaction);
    
    console.log('✍️ Signing transaction...');
    preparedTransaction.sign(bridgeKeypair);
    
    console.log('🚀 Submitting public_mint transaction...');
    const result = await rpc.sendTransaction(preparedTransaction);
    
    console.log('⏳ Waiting for confirmation...');
    console.log(`Transaction Hash: ${result.hash}`);
    
    // Wait for confirmation
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      try {
        const txResponse = await rpc.getTransaction(result.hash);
        
        if (txResponse.status === 'SUCCESS') {
          console.log('\n✅ SUCCESS! User bridge transaction fixed!');
          console.log('===========================================');
          console.log(`🎉 Successfully minted 0.001 s-WETH to user!`);
          console.log(`👤 Recipient: ${bridgeData.stellarAddress}`);
          console.log(`💰 Amount: 0.001 s-WETH`);
          console.log(`🔗 Stellar TX: ${result.hash}`);
          console.log(`🌐 Explorer: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
          console.log('');
          console.log('🌉 User should now see s-WETH tokens in their Stellar wallet!');
          break;
          
        } else if (txResponse.status === 'FAILED') {
          console.log('\n❌ Transaction failed!');
          console.log('Result XDR:', txResponse.resultXdr);
          
          // Try to decode the error
          if (txResponse.resultXdr) {
            try {
              const result = StellarSdk.xdr.TransactionResult.fromXDR(txResponse.resultXdr, 'base64');
              console.log('Error details:', result);
            } catch (e) {
              console.log('Could not decode error:', e.message);
            }
          }
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
      console.log('🔍 Check transaction manually:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing bridge transaction:', error.message);
    
    if (error.response && error.response.data) {
      console.error('💥 Response data:', error.response.data);
      
      if (error.response.data.extras && error.response.data.extras.result_codes) {
        console.error('🔍 Result codes:', error.response.data.extras.result_codes);
      }
    }
  }
}

fixUserBridge(); 