require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

async function lendingPoolMint() {
  try {
    console.log('🎯 Public Mint for Bridge Completion');
    console.log('===================================');
    console.log('ℹ️  Using public_mint function to complete bridge transaction');
    console.log('');
    
    // Your wallet (lending pool authority)
    const lendingPoolAddress = 'GA3EYTFG75D33UWBDJXI55MYY4IVDWH3EHN7U2H5IIHNF5QZT6L26BQF';
    const lendingPoolSecret = 'SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW'; // Your account's secret
    
    // Bridge details from the failed transaction
    const userStellarAddress = 'GCHVT3BOXV2EC7IR3TUFX4OFGCSOLOV3SAFFXGVZBHBJHHGD3657BRNM';
    const amount = '1000000000000000'; // 0.001 WETH in wei (18 decimals)
    const amountInSTokenUnits = amount; // s-token uses same decimals as WETH
    
    console.log('🎯 Mint Details:');
    console.log(`  From: Public Mint Function (no auth required)`);
    console.log(`  To: ${userStellarAddress}`);
    console.log(`  Amount: ${amount} wei (0.001 WETH)`);
    console.log(`  S-Token Amount: ${amountInSTokenUnits}`);
    console.log('');
    
    // Setup Stellar connection
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
    
    const lendingPoolKeypair = StellarSdk.Keypair.fromSecret(lendingPoolSecret);
    console.log('🔐 Calling from:', lendingPoolKeypair.publicKey());
    
    const account = await server.loadAccount(lendingPoolKeypair.publicKey());
    const contractInstance = new StellarSdk.Contract(S_TOKEN_CONTRACT);
    
    // Use public_mint function instead of regular mint
    const operation = contractInstance.call(
      'public_mint',
      StellarSdk.Address.fromString(userStellarAddress).toScVal(),
      new StellarSdk.ScInt(amountInSTokenUnits).toI128()
    );
    
    console.log('🔨 Building transaction with public_mint...');
    
    // Build transaction with higher fee for contract operation
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: '5000000', // 5 XLM fee for contract operation  
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    
    console.log('🧪 Simulating transaction...');
    const simulationResult = await rpc.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
      console.error('❌ Simulation failed:', simulationResult.error);
      throw new Error(`Simulation failed: ${simulationResult.error}`);
    }
    
    console.log('✅ Simulation successful!');
    if (simulationResult.cost) {
      console.log(`  Cost: ${simulationResult.cost.cpuInstructions} CPU instructions`);
      console.log(`  Memory: ${simulationResult.cost.memBytes} bytes`);
    }
    console.log('');
    
    // Prepare transaction for submission  
    const preparedTransaction = await rpc.prepareTransaction(transaction);
    
    // Sign transaction
    preparedTransaction.sign(lendingPoolKeypair);
    
    console.log('📤 Submitting transaction...');
    const result = await rpc.sendTransaction(preparedTransaction);
    
    if (result.status === 'PENDING') {
      console.log('⏳ Transaction submitted successfully');
      console.log('🔗 Transaction Hash:', result.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Poll for result
      let finalResult;
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        finalResult = await rpc.getTransaction(result.hash);
        
        if (finalResult.status !== 'NOT_FOUND') {
          break;
        }
        attempts++;
      }
      
      if (finalResult && finalResult.status === 'SUCCESS') {
        console.log('✅ Bridge completion successful!');
        console.log('🎊 s-WETH tokens minted to user wallet');
        console.log('🔗 Transaction:', result.hash);
        console.log('🌟 User can now see 0.001 s-WETH in their Stellar wallet');
      } else {
        console.error('❌ Transaction failed:', finalResult);
      }
    } else {
      console.error('❌ Transaction submission failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error completing bridge:', error.message);
    console.error('Full error:', error);
  }
}

// Run the function
lendingPoolMint().catch(console.error); 