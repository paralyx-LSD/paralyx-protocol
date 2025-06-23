const { Keypair } = require('@stellar/stellar-sdk');

console.log('Generating new Stellar keypair for bridge validator...\n');

const keypair = Keypair.random();

console.log('🔑 Stellar Keypair Generated:');
console.log('=====================================');
console.log('Public Key (Address):', keypair.publicKey());
console.log('Secret Key:', keypair.secret());
console.log('=====================================');
console.log('\n📝 Add this to your .env file:');
console.log(`STELLAR_SECRET_KEY=${keypair.secret()}`);
console.log(`VALIDATOR_ADDRESS=${keypair.publicKey()}`);
console.log('\n⚠️  Important: This account needs funding on Stellar testnet to pay for transaction fees!');
console.log('🌟 Fund it at: https://laboratory.stellar.org/#account-creator?network=test'); 