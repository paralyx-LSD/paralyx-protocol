import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connectWallet, isConnecting, network, switchNetwork } = useWallet();

  const handleConnect = async (type: 'freighter' | 'metamask') => {
    try {
      await connectWallet(type);
      onClose();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const walletOptions = [
    {
      id: 'metamask' as const,
      name: 'MetaMask',
      description: 'Ethereum wallet',
      icon: '🦊',
      color: 'bg-orange-500',
      available: typeof window !== 'undefined' && window.ethereum?.isMetaMask,
      downloadUrl: 'https://metamask.io/download/',
      networks: ['Ethereum Mainnet', 'Goerli Testnet']
    },
    {
      id: 'freighter' as const,
      name: 'Freighter',
      description: 'Stellar wallet',
      icon: 'F',
      color: 'bg-paralyx-primary',
      available: typeof window !== 'undefined' && window.freighter,
      downloadUrl: 'https://www.freighter.app/',
      networks: ['Stellar Mainnet', 'Stellar Testnet'],
      popular: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-card p-6 w-full max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-title font-bold text-xl text-paralyx-text">
                Connect Wallet
              </h2>
              <button
                onClick={onClose}
                className="glass-button p-2 hover:bg-glass-medium"
              >
                <X size={20} className="text-paralyx-text/60" />
              </button>
            </div>

            {/* Network Selection */}
            <div className="mb-6">
              <h3 className="font-title font-medium text-paralyx-text mb-3">
                Select Network
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => switchNetwork('testnet')}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    network === 'testnet'
                      ? 'border-paralyx-primary bg-paralyx-primary/10'
                      : 'border-white/20 hover:border-paralyx-primary/50'
                  }`}
                >
                  <div className="font-title font-medium text-sm text-paralyx-text">
                    Testnet
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    For development
                  </div>
                </button>
                <button
                  onClick={() => switchNetwork('mainnet')}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                    network === 'mainnet'
                      ? 'border-paralyx-primary bg-paralyx-primary/10'
                      : 'border-white/20 hover:border-paralyx-primary/50'
                  }`}
                >
                  <div className="font-title font-medium text-sm text-paralyx-text">
                    Mainnet
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    Live network
                  </div>
                </button>
              </div>
            </div>

            {/* Wallet Options */}
            <div className="space-y-3 mb-6">
              <h3 className="font-title font-medium text-paralyx-text mb-3">
                Choose Wallet
              </h3>
              
              {walletOptions.map((wallet) => (
                <div key={wallet.id} className="relative">
                  {wallet.available ? (
                    <button
                      onClick={() => handleConnect(wallet.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-between p-4 glass-button hover:bg-glass-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${wallet.color} rounded-lg flex items-center justify-center text-lg`}>
                          {wallet.icon}
                        </div>
                        <div className="text-left">
                          <div className="font-title font-medium text-sm text-paralyx-text">
                            {wallet.name}
                          </div>
                          <div className="text-xs text-paralyx-text/60 font-body">
                            {wallet.description}
                          </div>
                          <div className="text-xs text-paralyx-text/40 font-body">
                            {wallet.networks.join(', ')}
                          </div>
                        </div>
                      </div>
                      {isConnecting ? (
                        <Loader2 size={16} className="animate-spin text-paralyx-text/60" />
                      ) : (
                        <div className="text-xs text-paralyx-text/40 font-body">
                          Connect
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between p-4 glass-button opacity-50">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${wallet.color} rounded-lg flex items-center justify-center text-lg`}>
                          {wallet.icon}
                        </div>
                        <div className="text-left">
                          <div className="font-title font-medium text-sm text-paralyx-text">
                            {wallet.name}
                          </div>
                          <div className="text-xs text-paralyx-text/60 font-body">
                            Not installed
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(wallet.downloadUrl, '_blank')}
                        className="flex items-center space-x-1 text-xs text-paralyx-primary hover:text-paralyx-primary/80 font-body"
                      >
                        <span>Install</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Warning */}
            <div className="flex items-start space-x-3 p-4 bg-paralyx-warning/10 border border-paralyx-warning/20 rounded-lg mb-6">
              <AlertTriangle size={16} className="text-paralyx-warning mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-title font-medium text-sm text-paralyx-text">
                  Important Notice
                </div>
                <div className="text-xs text-paralyx-text/70 font-body mt-1">
                  {network === 'testnet' 
                    ? 'You are connecting to testnet. Do not use real funds.'
                    : 'You are connecting to mainnet. Always verify transactions before confirming.'
                  }
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 text-xs text-paralyx-text/60 font-body">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-paralyx-safe rounded-full"></div>
                <span>Secure connection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-paralyx-primary rounded-full"></div>
                <span>Cross-chain support</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-paralyx-accent rounded-full"></div>
                <span>DeFi integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-paralyx-warning rounded-full"></div>
                <span>Bridge assets</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalletModal;