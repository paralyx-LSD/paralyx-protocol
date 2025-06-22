require('dotenv').config();
const { Server } = require('@stellar/stellar-sdk');

async function fundAccount() {
  try {
    const publicKey = process.env.VALIDATOR_ADDRESS;
    console.log(`🏦 Funding Stellar testnet account: ${publicKey}`);
    
    // Use Stellar testnet friendbot to fund the account
    const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Account funded successfully!');
      console.log('Transaction Hash:', result.hash);
      
      // Check account balance
      const server = new Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(publicKey);
      
      console.log('\n💰 Account Balances:');
      account.balances.forEach(balance => {
        console.log(`- ${balance.asset_type === 'native' ? 'XLM' : balance.asset_code}: ${balance.balance}`);
      });
      
    } else {
      console.error('❌ Failed to fund account:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error funding account:', error.message);
  }
}

fundAccount(); 