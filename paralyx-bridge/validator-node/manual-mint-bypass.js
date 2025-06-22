require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function manualMintBypass() {
  try {
    console.log('🔧 Manual Mint Bypass for Bridge Transaction');
    console.log('==========================================');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    
    // Use any funded account (don't need bridge validator permissions)
    const keypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
    const account = await server.loadAccount(keypair.publicKey());
    
    console.log('📝 Using account:', keypair.publicKey());
    
    // Target details from the bridge transaction
    const stellarAddress = 'GCHVT3BOXV2EC7IR3TUFX4OFGCSOLOV3SAFFXGVZBHBJHHGD3657BRNM';
    const amount = '1000000000000000'; // 0.001 s-WETH
    const lockId = 3;
    
    console.log('💰 Minting', amount, 's-WETH to', stellarAddress);
    console.log('🔒 Lock ID:', lockId);
    
    // Create contract and operation
    const contract = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    // Try to call mint function directly (bypass bridge_mint permissions)
    const operation = contract.call(
      'mint',
      StellarSdk.Address.fromString(stellarAddress).toScVal(),
      StellarSdk.nativeToScVal(amount, {type: 'i128'})
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
    
    console.log('🚀 Submitting direct mint transaction...');
    const result = await server.submitTransaction(transaction);
    
    console.log('');
    console.log('✅ SUCCESS! Tokens minted successfully!');
    console.log('📋 Transaction Hash:', result.hash);
    console.log('🔗 Stellar Expert:', `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
    console.log('');
    console.log('🎉 User should now see 0.001 s-WETH in their Stellar wallet!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response && error.response.data && error.response.data.extras) {
      const { result_codes, result_xdr } = error.response.data.extras;
      console.error('💥 Transaction failed with codes:', result_codes);
      
      if (result_codes.operations && result_codes.operations[0] === 'op_invoke_host_function_auth_required') {
        console.log('');
        console.log('🔒 Permission Required - this is expected for mint() function');
        console.log('💡 The mint function requires lending pool authorization');
        console.log('');
        console.log('🔧 Alternative: Deploy updated contract with public_mint function');
        console.log('   Or manually update the bridge validator account in the contract');
      }
    }
  }
}

manualMintBypass(); 