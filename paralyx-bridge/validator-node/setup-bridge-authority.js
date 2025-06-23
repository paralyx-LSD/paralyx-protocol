require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function setupBridgeAuthority() {
  try {
    console.log('🔧 Setting Up Bridge Authority');
    console.log('==============================');
    console.log('ℹ️  This will authorize your account to mint s-WETH tokens');
    console.log('');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Use the admin account (whoever deployed the contract)
    const adminKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const adminAccount = await server.loadAccount(adminKeypair.publicKey());
    
    console.log('🔑 Admin Account:', adminKeypair.publicKey());
    console.log('💰 Admin Balance:', adminAccount.balances[0].balance, 'XLM');
    
    // The bridge validator we want to authorize (this account will mint tokens)
    const bridgeValidatorAddress = adminKeypair.publicKey(); // Using same account for simplicity
    
    console.log('🌉 Setting Bridge Validator:', bridgeValidatorAddress);
    console.log('');
    
    // Create contract
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    console.log('🏗️ Step 1: Setting bridge validator authority...');
    
    const setBridgeValidatorOp = contract.call(
      'set_bridge_validator',
      StellarSdk.Address.fromString(bridgeValidatorAddress).toScVal()
    );
    
    // Build transaction
    const setValidatorTx = new StellarSdk.TransactionBuilder(adminAccount, {
      fee: '5000000', // 5 XLM fee
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(setBridgeValidatorOp)
      .setTimeout(300)
      .build();
    
    console.log('📝 Preparing set_bridge_validator transaction...');
    const preparedSetValidatorTx = await rpc.prepareTransaction(setValidatorTx);
    
    console.log('✍️ Signing with admin authority...');
    preparedSetValidatorTx.sign(adminKeypair);
    
    console.log('🚀 Submitting set_bridge_validator...');
    const setValidatorResult = await rpc.sendTransaction(preparedSetValidatorTx);
    
    console.log('⏳ Validator setup transaction:', setValidatorResult.hash);
    console.log('🔗 Explorer:', `https://stellar.expert/explorer/testnet/tx/${setValidatorResult.hash}`);
    
    // Wait for validator setup to complete
    console.log('\n⏰ Waiting for validator setup...');
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        const txResponse = await rpc.getTransaction(setValidatorResult.hash);
        
        if (txResponse.status === 'SUCCESS') {
          console.log('✅ Bridge validator authority set successfully!');
          break;
        } else if (txResponse.status === 'FAILED') {
          console.log('❌ Failed to set bridge validator');
          console.log('Error:', txResponse.resultXdr);
          return;
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
    
    console.log('\n🏗️ Step 2: Now minting s-WETH with bridge authority...');
    
    // Now use bridge_mint function
    const userAddress = 'GCHVT3BOXV2EC7IR3TUFX4OFGCSOLOV3SAFFXGVZBHBJHHGD3657BRNM';
    const amount = '1000000000000000'; // 0.001 WETH
    const lockId = 7; // From your bridge transaction
    
    console.log(`👤 Minting to: ${userAddress}`);
    console.log(`💰 Amount: 0.001 s-WETH`);
    console.log(`🔒 Lock ID: ${lockId}`);
    
    // Refresh account
    const freshAccount = await server.loadAccount(adminKeypair.publicKey());
    
    const bridgeMintOp = contract.call(
      'bridge_mint',
      StellarSdk.Address.fromString(userAddress).toScVal(),
      new StellarSdk.ScInt(amount).toI128(),
      StellarSdk.nativeToScVal(lockId, { type: 'u64' })
    );
    
    const mintTx = new StellarSdk.TransactionBuilder(freshAccount, {
      fee: '10000000', // 10 XLM fee
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(bridgeMintOp)
      .setTimeout(300)
      .build();
    
    console.log('📝 Preparing bridge_mint transaction...');
    const preparedMintTx = await rpc.prepareTransaction(mintTx);
    
    console.log('✍️ Signing bridge_mint...');
    preparedMintTx.sign(adminKeypair);
    
    console.log('🚀 Submitting bridge_mint...');
    const mintResult = await rpc.sendTransaction(preparedMintTx);
    
    console.log('⏳ Bridge mint transaction:', mintResult.hash);
    console.log('🔗 Explorer:', `https://stellar.expert/explorer/testnet/tx/${mintResult.hash}`);
    
    // Wait for mint to complete
    console.log('\n⏰ Waiting for mint completion...');
    attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const txResponse = await rpc.getTransaction(mintResult.hash);
        
        if (txResponse.status === 'SUCCESS') {
          console.log('\n🎉 SUCCESS! Bridge transaction completed!');
          console.log('==========================================');
          console.log(`✅ Successfully minted 0.001 s-WETH!`);
          console.log(`👤 To: ${userAddress}`);
          console.log(`🔗 Mint TX: ${mintResult.hash}`);
          console.log(`🌐 Explorer: https://stellar.expert/explorer/testnet/tx/${mintResult.hash}`);
          console.log('');
          console.log('🌉 Your bridge is now complete!');
          console.log('   Check your Stellar wallet for s-WETH tokens!');
          break;
          
        } else if (txResponse.status === 'FAILED') {
          console.log('\n❌ Bridge mint failed!');
          console.log('Error:', txResponse.resultXdr);
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
    console.error('❌ Error setting up bridge authority:', error.message);
    
    if (error.response && error.response.data) {
      console.error('\n💥 Full error:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupBridgeAuthority(); 