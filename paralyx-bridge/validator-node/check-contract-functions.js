require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function checkContractFunctions() {
  try {
    console.log('🔍 Checking Available Contract Functions');
    console.log('======================================');
    console.log(`Contract: ${S_TOKEN_CONTRACT}`);
    console.log('');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    const keypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(keypair.publicKey());
    
    console.log('🔑 Test Account:', keypair.publicKey());
    
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    // Test available functions one by one
    const functionsToTest = [
      'name',
      'symbol', 
      'decimals',
      'total_supply',
      'balance',
      'mint',
      'bridge_mint',
      'public_mint',
      'set_bridge_validator',
      'get_bridge_validator',
      'burn',
      'exchange_rate'
    ];
    
    console.log('🧪 Testing available functions:');
    console.log('');
    
    for (const functionName of functionsToTest) {
      try {
        console.log(`Testing ${functionName}()...`);
        
        let operation;
        
        // Handle different function signatures
        if (functionName === 'balance') {
          operation = contract.call(functionName, StellarSdk.Address.fromString(keypair.publicKey()).toScVal());
        } else if (functionName === 'mint') {
          operation = contract.call(functionName, 
            StellarSdk.Address.fromString(keypair.publicKey()).toScVal(),
            new StellarSdk.ScInt('1000000').toI128()
          );
        } else if (functionName === 'bridge_mint') {
          operation = contract.call(functionName,
            StellarSdk.Address.fromString(keypair.publicKey()).toScVal(),
            new StellarSdk.ScInt('1000000').toI128(),
            StellarSdk.nativeToScVal(1, { type: 'u64' })
          );
        } else if (functionName === 'public_mint') {
          operation = contract.call(functionName,
            StellarSdk.Address.fromString(keypair.publicKey()).toScVal(),
            new StellarSdk.ScInt('1000000').toI128()
          );
        } else if (functionName === 'set_bridge_validator') {
          operation = contract.call(functionName, StellarSdk.Address.fromString(keypair.publicKey()).toScVal());
        } else {
          operation = contract.call(functionName);
        }
        
        const transaction = new StellarSdk.TransactionBuilder(account, {
          fee: '1000000',
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(operation)
          .setTimeout(30)
          .build();
        
        // Just simulate, don't submit
        const simulation = await rpc.simulateTransaction(transaction);
        
        if (simulation.error) {
          if (simulation.error.includes('MissingValue') && simulation.error.includes('non-existent contract function')) {
            console.log(`  ❌ ${functionName} - NOT AVAILABLE`);
          } else {
            console.log(`  ⚠️  ${functionName} - EXISTS (simulation error: ${simulation.error})`);
          }
        } else {
          console.log(`  ✅ ${functionName} - AVAILABLE`);
        }
        
      } catch (error) {
        if (error.message.includes('MissingValue') || error.message.includes('non-existent')) {
          console.log(`  ❌ ${functionName} - NOT AVAILABLE`);
        } else {
          console.log(`  ⚠️  ${functionName} - EXISTS (error: ${error.message.substring(0, 50)}...)`);
        }
      }
    }
    
    console.log('');
    console.log('📋 Summary:');
    console.log('Based on the test results above:');
    console.log('- Functions marked ✅ are available and working');
    console.log('- Functions marked ⚠️ exist but may have permission/parameter issues');
    console.log('- Functions marked ❌ do not exist in this contract');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. If mint() is available but has permission issues, we can work around it');
    console.log('2. If no mint functions work, we may need to deploy a new contract');
    console.log('3. If basic functions work, we can build a custom minting solution');
    
  } catch (error) {
    console.error('❌ Error checking contract functions:', error.message);
  }
}

checkContractFunctions(); 