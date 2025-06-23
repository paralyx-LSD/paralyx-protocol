require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');
const { ethers } = require('ethers');

const TX_HASH = '0xef17d6a0c90003485fef54c567b09e438930ffc5fa318d7998141cef97b5b379';
const LOCKBOX_CONTRACT = '0xb8339d7F9F6b81413094AEaEBB75f41009d889bd';
const S_TOKEN_CONTRACT = 'CD6KQ2XOPO6VD72SQWNX5G3NVHIUHSJF2QXI6EQTREJ56DA6A6A3F2X3';

const LOCKBOX_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "stellarAddress", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "stellarSymbol", "type": "string"},
      {"indexed": true, "internalType": "uint256", "name": "lockId", "type": "uint256"}
    ],
    "name": "AssetLocked",
    "type": "event"
  }
];

async function processTransaction() {
  try {
    console.log('🚀 Processing bridge transaction:', TX_HASH);
    
    // Setup Ethereum connection
    const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/f96264cf853c424ab5678e8301ca0462');
    const contract = new ethers.Contract(LOCKBOX_CONTRACT, LOCKBOX_ABI, provider);
    
    // Get transaction receipt and extract events
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    console.log('📄 Transaction receipt found');
    
    // Find AssetLocked events
    const assetLockedEvents = receipt.logs
      .filter(log => log.address.toLowerCase() === LOCKBOX_CONTRACT.toLowerCase())
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(event => event && event.name === 'AssetLocked');

    if (assetLockedEvents.length === 0) {
      console.log('❌ No AssetLocked events found');
      return;
    }

    console.log(`✅ Found ${assetLockedEvents.length} AssetLocked event(s)`);
    
    // Process each event
    for (const event of assetLockedEvents) {
      const eventData = {
        user: event.args.user,
        token: event.args.token,
        amount: event.args.amount.toString(),
        stellarAddress: event.args.stellarAddress,
        stellarSymbol: event.args.stellarSymbol,
        lockId: event.args.lockId.toString()
      };
      
      console.log('🔍 Event data:', eventData);
      
      // Setup Stellar connections
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
      const stellarKeypair = StellarSdk.Keypair.fromSecret('SAKHDWLJBRGHMNVRP7776OGXWJHZRA7VB7K6JNMV7J7CWNJB4JRBD2RW');
      const account = await server.loadAccount(stellarKeypair.publicKey());
      
      console.log('🌟 Stellar account loaded:', stellarKeypair.publicKey());
      
      // Convert amount (wei) to s-token units (keep same precision for s-tokens)
      const amountInSTokenUnits = eventData.amount; // 1000000000000000 wei = 0.001 WETH
      
      console.log('💰 Minting', amountInSTokenUnits, 's-WETH to', eventData.stellarAddress);
      
      // Build contract call operation for s-token mint
      const contractInstance = new StellarSdk.Contract(S_TOKEN_CONTRACT);
      
      // Use regular mint function with lending pool authority
      const operation = contractInstance.call(
        'mint',
        StellarSdk.Address.fromString(eventData.stellarAddress).toScVal(),
        new StellarSdk.ScInt(amountInSTokenUnits).toI128()
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
      preparedTransaction.sign(stellarKeypair);
      
      console.log('📤 Submitting transaction...');
      const response = await rpc.sendTransaction(preparedTransaction);
      
      console.log('⏳ Waiting for confirmation...');
      console.log(`Transaction Hash: ${response.hash}`);
      
      // Wait for transaction confirmation
      let txResponse;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          txResponse = await rpc.getTransaction(response.hash);
          if (txResponse.status === 'SUCCESS') {
            console.log('✅ Transaction confirmed successfully!');
            break;
          } else if (txResponse.status === 'FAILED') {
            console.log('❌ Transaction failed!');
            console.log('Result XDR:', txResponse.resultXdr);
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
        return;
      }
      
      if (txResponse.status === 'SUCCESS') {
        console.log('\n🎉 BRIDGE TRANSACTION COMPLETED SUCCESSFULLY!');
        console.log('====================================================');
        console.log(`✅ Successfully minted ${amountInSTokenUnits} s-WETH units`);
        console.log(`🎯 Recipient: ${eventData.stellarAddress}`);
        console.log(`🔗 Ethereum TX: ${TX_HASH}`);
        console.log(`🌟 Stellar TX: ${response.hash}`);
        console.log(`🔒 Lock ID: ${eventData.lockId}`);
        console.log(`🔗 Explorer: https://stellar.expert/explorer/testnet/tx/${response.hash}`);
        console.log('');
        console.log('🌉 Cross-chain bridge operation completed!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing transaction:', error.message);
    console.error('Full error:', error);
  }
}

processTransaction(); 