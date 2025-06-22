require('dotenv').config();
const { ethers } = require('ethers');
const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Contract ABI for AssetLocked event
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

async function main() {
  try {
    const txHash = '0xf95b3b47c9dcf0924936cbc1e1a8644ce1daeacab2143270a68fbfd01c7e6f76';
    logger.info(`Checking transaction: ${txHash}`);

    // Connect to Ethereum
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    logger.info(`Connected to Ethereum RPC: ${process.env.ETHEREUM_RPC_URL}`);

    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      logger.error('Transaction not found!');
      return;
    }

    logger.info('Transaction found:', {
      to: tx.to,
      from: tx.from,
      value: tx.value.toString(),
      blockNumber: tx.blockNumber,
      status: tx.blockNumber ? 'confirmed' : 'pending'
    });

    // Get transaction receipt for events
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      logger.error('Transaction receipt not found!');
      return;
    }

    logger.info('Transaction receipt:', {
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.length
    });

    // Check which contracts this interacted with
    const contractAddresses = [
      process.env.LOCKBOX_CONTRACT_ADDRESS,
      '0xcB0260dc37eb2577D1fF538690296c49823F25B8', // Old address
      '0x6164187652d6c123eB124e0b8b08ee42A10A7d86', // Address from deployment docs
      '0xb8339d7F9F6b81413094AEaEBB75f41009d889bd'  // Actual contract address from transaction
    ];

    for (const contractAddr of contractAddresses) {
      if (tx.to && tx.to.toLowerCase() === contractAddr.toLowerCase()) {
        logger.info(`✅ Transaction sent to contract: ${contractAddr}`);
        
        // Create contract instance
        const contract = new ethers.Contract(contractAddr, LOCKBOX_ABI, provider);
        
        // Parse logs for AssetLocked events
        const assetLockedEvents = receipt.logs
          .filter(log => log.address.toLowerCase() === contractAddr.toLowerCase())
          .map(log => {
            try {
              return contract.interface.parseLog(log);
            } catch (e) {
              return null;
            }
          })
          .filter(event => event && event.name === 'AssetLocked');

        if (assetLockedEvents.length > 0) {
          logger.info(`🎉 Found ${assetLockedEvents.length} AssetLocked event(s):`);
          
          assetLockedEvents.forEach((event, idx) => {
            logger.info(`Event ${idx + 1}:`, {
              user: event.args.user,
              token: event.args.token,
              amount: event.args.amount.toString(),
              stellarAddress: event.args.stellarAddress,
              stellarSymbol: event.args.stellarSymbol,
              lockId: event.args.lockId.toString()
            });
          });

          // This is where the minting should happen
          logger.info('🚀 Bridge should mint tokens to:', assetLockedEvents[0].args.stellarAddress);
        } else {
          logger.warn('No AssetLocked events found in this transaction');
        }
      }
    }

    if (!contractAddresses.some(addr => tx.to && tx.to.toLowerCase() === addr.toLowerCase())) {
      logger.warn(`Transaction was sent to: ${tx.to} (not a known bridge contract)`);
    }

  } catch (error) {
    logger.error('Error processing transaction:', error.message);
  }
}

main().catch(console.error); 