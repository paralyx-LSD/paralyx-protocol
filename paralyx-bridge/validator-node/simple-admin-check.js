require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function testMintAuthority() {
  try {
    console.log('🔍 Testing Mint Authority');
    console.log('==========================');
    
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    const testKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    console.log('🔐 Account:', testKeypair.publicKey());
    
    const account = await server.loadAccount(testKeypair.publicKey());
    const contractInstance = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    // Test contract read functions first
    console.log('');
    console.log('📖 Testing contract read functions...');
    
    try {
      const nameOp = contractInstance.call('name');
      const nameTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      }).addOperation(nameOp).setTimeout(60).build();
      
      const nameResult = await rpc.simulateTransaction(nameTx);
      if (nameResult.result && nameResult.result.retval) {
        console.log('✅ Token name:', StellarSdk.scValToNative(nameResult.result.retval));
      }
    } catch (error) {
      console.log('❌ Name function failed:', error.message);
    }
    
    try {
      const symbolOp = contractInstance.call('symbol');
      const symbolTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      }).addOperation(symbolOp).setTimeout(60).build();
      
      const symbolResult = await rpc.simulateTransaction(symbolTx);
      if (symbolResult.result && symbolResult.result.retval) {
        console.log('✅ Token symbol:', StellarSdk.scValToNative(symbolResult.result.retval));
      }
    } catch (error) {
      console.log('❌ Symbol function failed:', error.message);
    }
    
    // Test mint function
    console.log('');
    console.log('🧪 Testing mint function...');
    
    const mintOp = contractInstance.call(
      'mint',
      StellarSdk.Address.fromString(testKeypair.publicKey()).toScVal(),
      new StellarSdk.ScInt('1000000000000000').toI128()
    );
    
    const mintTx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    }).addOperation(mintOp).setTimeout(60).build();
    
    console.log('🧪 Simulating mint transaction...');
    const mintResult = await rpc.simulateTransaction(mintTx);
    
    if (mintResult.error) {
      console.log('❌ Mint failed:', mintResult.error);
      
      // Parse the error for more details
      if (typeof mintResult.error === 'string') {
        if (mintResult.error.includes('HostError')) {
          console.log('💡 This appears to be an authorization error');
          console.log('🚫 Your account does not have mint authority');
        }
      }
    } else {
      console.log('✅ Mint simulation successful!');
      console.log('🎉 Your account has mint authority');
    }
    
    console.log('');
    console.log('📋 Current Situation:');
    console.log('=====================');
    console.log('❌ Cannot deploy new contract with public_mint (Rust issues)');
    console.log('❌ Current account lacks lending pool authority');
    console.log('❌ Bridge mint function not available in deployed contract');
    console.log('');
    console.log('💡 Solutions:');
    console.log('1. Find the original deployer account with admin rights');
    console.log('2. Use a different contract deployment approach');
    console.log('3. Set up proper lending pool authority');
    console.log('4. Use an alternative minting method');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMintAuthority().catch(console.error); 