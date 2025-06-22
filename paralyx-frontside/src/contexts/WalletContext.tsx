import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as stellar from '../services/stellar';

// Sepolia network configuration
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

const SEPOLIA_NETWORK_CONFIG = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia Test Network',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://sepolia.infura.io/v3/'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
};

// Ethereum wallet state interface
interface EthereumWalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  chainId: number | null;
}

// Stellar wallet state interface
interface StellarWalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  network: string;
}

// Combined wallet context type
interface WalletContextType {
  ethWallet: EthereumWalletState;
  stellarWallet: StellarWalletState;
  
  // Ethereum wallet functions
  connectEthWallet: () => Promise<void>;
  disconnectEthWallet: () => void;
  switchToSepolia: () => Promise<void>;
  
  // Stellar wallet functions
  connectStellarWallet: () => Promise<void>;
  disconnectStellarWallet: () => void;
  
  // Generic wallet functions for WalletModal
  connectWallet: (type: 'freighter' | 'metamask') => Promise<void>;
  isConnecting: boolean;
  network: 'testnet' | 'mainnet';
  switchNetwork: (network: 'testnet' | 'mainnet') => void;
  
  // Backward compatibility
  isConnected: boolean;
  walletAddress: string | null;
  walletType: 'metamask' | 'freighter' | null;
  disconnectWallet: () => void;
  
  // Stellar lending functions (real implementations)
  supplyTokens: (amount: number, assetType?: string) => Promise<string>;
  borrowTokens: (amount: number, assetType?: string) => Promise<string>;
  repayTokens: (amount: number, assetType?: string) => Promise<string>;
  withdrawTokens: (amount: number, assetType?: string) => Promise<string>;
  getAccountInfo: () => Promise<stellar.AccountInfo>;
  getTokenBalance: (assetType?: string) => Promise<number>;
  getAssetPrice: (assetType: string) => Promise<number>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Ethereum wallet state
  const [ethWallet, setEthWallet] = useState<EthereumWalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    chainId: null,
  });

  // Stellar wallet state
  const [stellarWallet, setStellarWallet] = useState<StellarWalletState>({
    isConnected: false,
    address: null,
    balance: 0,
    network: 'TESTNET',
  });

  // Additional state for WalletModal
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');

  // Computed properties for backward compatibility
  const isConnected = ethWallet.isConnected || stellarWallet.isConnected;
  const walletAddress = stellarWallet.address || ethWallet.address;
  const walletType = stellarWallet.isConnected ? 'freighter' : 
                   ethWallet.isConnected ? 'metamask' : null;

  // Generic connectWallet function for WalletModal
  const connectWallet = async (type: 'freighter' | 'metamask') => {
    setIsConnecting(true);
    try {
      if (type === 'metamask') {
        await connectEthWallet();
      } else if (type === 'freighter') {
        await connectStellarWallet();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Network switching function
  const switchNetwork = (newNetwork: 'testnet' | 'mainnet') => {
    setNetwork(newNetwork);
    // Update Stellar wallet network
    setStellarWallet(prev => ({
      ...prev,
      network: newNetwork === 'testnet' ? 'TESTNET' : 'MAINNET'
    }));
  };

  // Load persisted wallet connections on mount
  useEffect(() => {
    const ethConnected = localStorage.getItem('ethWalletConnected') === 'true';
    const stellarConnected = localStorage.getItem('stellarWalletConnected') === 'true';
    
    if (ethConnected) {
      connectEthWallet();
    }
    
    if (stellarConnected) {
      connectStellarWallet();
    }
  }, []);

  // Ethereum wallet functions
  const connectEthWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });

      setEthWallet({
        isConnected: true,
        address: accounts[0],
        balance: parseInt(balance, 16) / 1e18,
        chainId: parseInt(chainId, 16),
      });

      localStorage.setItem('ethWalletConnected', 'true');

      // Auto-switch to Sepolia if not already on it
      const currentChainId = parseInt(chainId, 16);
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        console.log('Switching to Sepolia network...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
          });
          
          // Update chain ID after successful switch
          const newChainId = await window.ethereum.request({
            method: 'eth_chainId',
          });
          
          setEthWallet(prev => ({
            ...prev,
            chainId: parseInt(newChainId, 16),
          }));
          
          console.log('Successfully switched to Sepolia network');
        } catch (switchError: any) {
          // If the network is not added, try to add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_NETWORK_CONFIG],
              });
              console.log('Sepolia network added and switched');
            } catch (addError) {
              console.error('Failed to add Sepolia network:', addError);
              throw new Error('Failed to add Sepolia network to MetaMask');
            }
          } else {
            console.error('Failed to switch to Sepolia:', switchError);
            throw new Error('Failed to switch to Sepolia network');
          }
        }
      }
    } catch (error) {
      console.error('Error connecting Ethereum wallet:', error);
      throw error;
    }
  };

  const disconnectEthWallet = () => {
    setEthWallet({
      isConnected: false,
      address: null,
      balance: 0,
      chainId: null,
    });
    localStorage.removeItem('ethWalletConnected');
  };

  const switchToSepolia = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      setEthWallet({
        ...ethWallet,
        chainId: parseInt(chainId, 16),
      });
    } catch (error) {
      console.error('Error switching to Sepolia:', error);
      throw error;
    }
  };

  // Stellar wallet functions
  const connectStellarWallet = async () => {
    try {
      console.log(' Starting Stellar wallet connection...');
      
      if (!window.freighter) {
        throw new Error('Freighter wallet not found. Please install Freighter extension.');
      }

      console.log(' Freighter extension detected');

      // Check if Freighter is available and request access
      const isConnected = await window.freighter.isConnected();
      console.log(' Freighter connection status:', isConnected);
      
      if (!isConnected) {
        console.log(' Requesting Freighter access...');
        await window.freighter.requestAccess();
      }

      // Get public key for testnet
      console.log(' Getting public key from Freighter...');
      const { publicKey } = await window.freighter.getPublicKey({ 
        network: 'TESTNET' 
      });
      
      if (!publicKey) {
        throw new Error('Failed to get public key from Freighter');
      }

      console.log(' Stellar public key obtained:', publicKey);

      // Fetch Stellar balance (XLM)
      let balance = 0;
      try {
        console.log('💰 Fetching XLM balance...');
        balance = await stellar.getTokenBalance(publicKey, 'XLM');
        console.log('💰 XLM balance:', balance);
      } catch (balanceError) {
        console.warn('⚠️ Could not fetch balance:', balanceError);
        // Continue with 0 balance - balance fetch is not critical for connection
      }

      setStellarWallet({
        isConnected: true,
        address: publicKey,
        balance: balance,
        network: 'TESTNET',
      });

      localStorage.setItem('stellarWalletConnected', 'true');
      console.log('✅ Successfully connected to Stellar wallet:', publicKey);
    } catch (error: any) {
      console.error('❌ Error connecting Stellar wallet:', error);
      throw new Error(`Failed to connect to Freighter: ${error.message}`);
    }
  };

  const disconnectStellarWallet = () => {
    setStellarWallet({
      isConnected: false,
      address: null,
      balance: 0,
      network: 'TESTNET',
    });
    localStorage.removeItem('stellarWalletConnected');
  };

  // Real Stellar lending functions using stellar.ts service
  const supplyTokens = async (amount: number, assetType: string = 'WETH'): Promise<string> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.supplyTokens(stellarWallet.address, amount, assetType);
  };

  const borrowTokens = async (amount: number, assetType: string = 'WETH'): Promise<string> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.borrowTokens(stellarWallet.address, amount, assetType);
  };

  const repayTokens = async (amount: number, assetType: string = 'WETH'): Promise<string> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.repayTokens(stellarWallet.address, amount, assetType);
  };

  const withdrawTokens = async (amount: number, assetType: string = 'WETH'): Promise<string> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.withdrawTokens(stellarWallet.address, amount, assetType);
  };

  const getAccountInfo = async (): Promise<stellar.AccountInfo> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.getAccountInfo(stellarWallet.address);
  };

  const getTokenBalance = async (assetType: string = 'WETH'): Promise<number> => {
    if (!stellarWallet.address) {
      throw new Error('Stellar wallet not connected');
    }
    
    return await stellar.getTokenBalance(stellarWallet.address, assetType);
  };

  const getAssetPrice = async (assetType: string): Promise<number> => {
    return await stellar.getAssetPrice(assetType);
  };

  // Generic disconnect function for both wallet types
  const disconnectWallet = () => {
    // Disconnect both wallets to be safe
    disconnectEthWallet();
    disconnectStellarWallet();
  };

  const value: WalletContextType = {
    ethWallet,
    stellarWallet,
    connectEthWallet,
    disconnectEthWallet,
    connectStellarWallet,
    disconnectStellarWallet,
    supplyTokens,
    borrowTokens,
    repayTokens,
    withdrawTokens,
    getAccountInfo,
    getTokenBalance,
    getAssetPrice,
    switchToSepolia,
    connectWallet,
    isConnecting,
    network,
    switchNetwork,
    isConnected,
    walletAddress,
    walletType,
    disconnectWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};