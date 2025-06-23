require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function setBridgeValidator() {
  try {
    console.log('🔧 Setting Bridge Validator');
    console.log('==========================');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Use our current funded account
    const keypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(keypair.publicKey());
    
    console.log('📝 Current account:', keypair.publicKey());
    console.log('🎯 Setting this account as bridge validator...');
    
    // Create contract and operation to set bridge validator
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    const operation = contract.call(
      'set_bridge_validator',
      StellarSdk.Address.fromString(keypair.publicKey()).toScVal()
    );
    
    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    transaction.sign(keypair);
    
    console.log('🚀 Submitting set_bridge_validator transaction...');
    const result = await server.submitTransaction(transaction);
    
    console.log('');
    console.log('✅ SUCCESS! Bridge validator updated!');
    console.log('📋 Transaction Hash:', result.hash);
    console.log('🔗 Stellar Expert:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    console.log('');
    console.log('🎉 Now you can call bridge_mint with this account!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response && error.response.data && error.response.data.extras) {
      const { result_codes, result_xdr } = error.response.data.extras;
      console.error('💥 Transaction failed with codes:', result_codes);
      
      if (result_codes.operations && result_codes.operations[0] === 'op_invoke_host_function_auth_required') {
        console.log('');
        console.log('🔒 Admin Permission Required - only admin can set bridge validator');
        console.log('💡 Current account may not be the admin of this contract');
        console.log('');
        console.log('🔧 Alternative approaches:');
        console.log('   1. Find the admin private key and use that account');
        console.log('   2. Deploy a new contract with your account as admin');
        console.log('   3. Manually add public_mint function to existing contract');
      }
    }
  }
}

setBridgeValidator(); 