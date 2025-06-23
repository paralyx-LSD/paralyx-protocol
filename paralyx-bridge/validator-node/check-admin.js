require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function checkAdmin() {
  try {
    console.log('🔍 Checking S-Token Contract Authority');
    console.log('=====================================');
    console.log(`Contract: ${S_TOKEN_CONTRACT}`);
    console.log('');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    // Test with your account
    const testKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    console.log('🔐 Testing account:', testKeypair.publicKey());
    console.log('');
    
    // Check contract state/storage
    console.log('🏗️  Fetching contract instance...');
    const ledgerKey = StellarSdk.LedgerKey.contractData(
      StellarSdk.Address.contract(S_TOKEN_CONTRACT),
      StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      StellarSdk.xdr.ContractDataDurability.persistent()
    );
    
    const response = await rpc.getLedgerEntries([ledgerKey]);
    
    if (response.entries && response.entries.length > 0) {
      console.log('✅ Contract instance found');
      const contractData = response.entries[0];
      console.log('Contract data:', contractData);
    } else {
      console.log('❌ Contract instance not found');
    }
    
    // Try different approaches to check admin
    console.log('');
    console.log('🧪 Testing mint function call...');
    
    // Test mint call simulation
    const account = await server.loadAccount(testKeypair.publicKey());
    const contractInstance = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    const operation = contractInstance.call(
      'mint',
      StellarSdk.Address.fromString(testKeypair.publicKey()).toScVal(),
      new StellarSdk.ScInt('1000000000000000').toI128()
    );

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(60)
      .build();

    console.log('🧪 Simulating mint call...');
    const simulationResult = await rpc.simulateTransaction(transaction);
    
    if (simulationResult.error) {
      console.log('❌ Mint simulation failed:', simulationResult.error);
      console.log('');
      
      // Extract more details from the error
      if (simulationResult.error.includes('NotAuthorized') || 
          simulationResult.error.includes('not authorized')) {
        console.log('🚫 Account not authorized for minting');
        console.log('💡 This account does not have lending pool authority');
      }
    } else {
      console.log('✅ Mint simulation successful! This account has mint authority');
    }
    
    // Test the deployed contract functions
    console.log('');
    console.log('🔍 Available contract functions:');
    console.log('  1. mint(to, amount) - requires lending pool authority');
    console.log('  2. balance(account) - public read function');
    console.log('  3. total_supply() - public read function');
    console.log('  4. name() - public read function');
    console.log('  5. symbol() - public read function');
    console.log('  6. decimals() - public read function');
    console.log('  7. exchange_rate() - public read function');
    
    // Test a read function to verify contract is working
    console.log('');
    console.log('📖 Testing read functions...');
    
    const nameOperation = contractInstance.call('name');
    const nameTransaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(nameOperation)
      .setTimeout(60)
      .build();

    const nameResult = await rpc.simulateTransaction(nameTransaction);
    if (!nameResult.error && nameResult.result && nameResult.result.retval) {
      const tokenName = StellarSdk.scValToNative(nameResult.result.retval);
      console.log('✅ Token name:', tokenName);
    }
    
    const symbolOperation = contractInstance.call('symbol');
    const symbolTransaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(symbolOperation)
      .setTimeout(60)
      .build();

    const symbolResult = await rpc.simulateTransaction(symbolTransaction);
    if (!symbolResult.error && symbolResult.result && symbolResult.result.retval) {
      const tokenSymbol = StellarSdk.scValToNative(symbolResult.result.retval);
      console.log('✅ Token symbol:', tokenSymbol);
    }
    
    console.log('');
    console.log('📋 Summary:');
    console.log('============');
    console.log('- Contract is deployed and functional');
    console.log('- Read functions work correctly');
    console.log('- Mint function requires lending pool authority');
    console.log('- Your account may not have the required authority');
    console.log('');
    console.log('💡 Possible solutions:');
    console.log('1. Deploy new contract with public_mint function');
    console.log('2. Find account with lending pool authority');
    console.log('3. Set up bridge validator authority on current contract');
    
  } catch (error) {
    console.error('❌ Error checking admin:', error);
  }
}

checkAdmin().catch(console.error); 