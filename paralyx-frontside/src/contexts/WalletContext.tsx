import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import * as blockchain from '../services/blockchain';

interface Transaction {
  hash: string;
  type: 'supply' | 'borrow' | 'repay' | 'withdraw';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  walletType: 'freighter' | 'metamask' | null;
  network: 'testnet' | 'mainnet';
  isConnecting: boolean;
  connectWallet: (type: 'freighter' | 'metamask') => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (network: 'testnet' | 'mainnet') => void;
  chainId: string | null;
  
  // New blockchain functionality
  transactions: Transaction[];
  accountInfo: any;
  supplyTokens: (amount: number) => Promise<string>;
  borrowTokens: (amount: number) => Promise<string>;
  repayTokens: (amount: number) => Promise<string>;
  withdrawTokens: (amount: number) => Promise<string>;
  refreshAccountInfo: () => Promise<void>;
  getBalance: (assetType?: string) => Promise<number>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

// MetaMask detection
const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
};

// Freighter detection
const isFreighterInstalled = () => {
  return typeof window !== 'undefined' && window.freighter;
};

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'freighter' | 'metamask' | null>(null);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // MetaMask connection
  const connectMetaMask = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed. Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setWalletType('metamask');
        setIsConnected(true);

        // Get chain ID
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        });
        setChainId(chainId);

        // Check if we're on the correct network
        const expectedChainId = network === 'mainnet' ? '0x1' : '0x5'; // Mainnet or Goerli
        if (chainId !== expectedChainId) {
          await switchEthereumNetwork(expectedChainId);
        }

        toast.success('MetaMask connected successfully!');
      }
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect MetaMask');
      }
    }
  };

  // Freighter connection
  const connectFreighter = async () => {
    if (!isFreighterInstalled()) {
      toast.error('Freighter is not installed. Please install Freighter extension.');
      window.open('https://www.freighter.app/', '_blank');
      return;
    }

    try {
      // Request access to Freighter
      const { publicKey } = await window.freighter.getPublicKey({
        network: network === 'mainnet' ? 'PUBLIC' : 'TESTNET'
      });
      
      setWalletAddress(publicKey);
      setWalletType('freighter');
      setIsConnected(true);
      toast.success('Freighter connected successfully!');
          } catch (error: any) {
      console.error('Freighter connection error:', error);
      if (error.message?.includes('User declined access')) {
        toast.error('Connection rejected by user');
      } else {
        toast.error('Failed to connect Freighter wallet');
      }
    }
  };

  // Switch Ethereum network
  const switchEthereumNetwork = async (chainId: string) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      if (error.code === 4001) {
        // User rejected the network switch request
        toast.error('Network switch rejected by user');
        return;
      }
      
      if (error.code === 4902) {
        // Network not added to MetaMask
        const networkConfig = getNetworkConfig(chainId);
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
            if (addError.code === 4001) {
              toast.error('Network addition rejected by user');
            } else {
              toast.error('Failed to add network to MetaMask');
            }
          }
        }
      } else {
        console.error('Failed to switch network:', error);
        toast.error('Failed to switch network');
      }
    }
  };

  // Get network configuration
  const getNetworkConfig = (chainId: string) => {
    const configs: Record<string, any> = {
      '0x1': {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/'],
      },
      '0x5': {
        chainId: '0x5',
        chainName: 'Goerli Testnet',
        nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://goerli.infura.io/v3/'],
        blockExplorerUrls: ['https://goerli.etherscan.io/'],
      },
    };
    return configs[chainId];
  };

  // Main connect function
  const connectWallet = async (type: 'freighter' | 'metamask') => {
    setIsConnecting(true);
    try {
      if (type === 'metamask') {
        await connectMetaMask();
      } else {
        await connectFreighter();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setWalletType(null);
    setChainId(null);
    toast.success('Wallet disconnected');
  };

  const switchNetwork = (newNetwork: 'testnet' | 'mainnet') => {
    setNetwork(newNetwork);
    
    if (walletType === 'metamask' && isConnected) {
      const expectedChainId = newNetwork === 'mainnet' ? '0x1' : '0x5';
      switchEthereumNetwork(expectedChainId);
    }
    
    toast.success(`Switched to ${newNetwork}`);
  };

  // Listen for MetaMask events
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (walletType === 'metamask') {
          setWalletAddress(accounts[0]);
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(chainId);
        // Optionally update network state based on chain ID
        if (chainId === '0x1') {
          setNetwork('mainnet');
        } else if (chainId === '0x5') {
          setNetwork('testnet');
        }
      };

      const handleDisconnect = () => {
        if (walletType === 'metamask') {
          disconnectWallet();
        }
      };

      window.ethereum?.on('accountsChanged', handleAccountsChanged);
      window.ethereum?.on('chainChanged', handleChainChanged);
      window.ethereum?.on('disconnect', handleDisconnect);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [walletType]);

  // Auto-connect if previously connected
  useEffect(() => {
    const savedWalletType = localStorage.getItem('wallet_type') as 'freighter' | 'metamask' | null;
    const savedConnection = localStorage.getItem('wallet_connected');
    
    if (savedConnection === 'true' && savedWalletType) {
      // Auto-connect logic here
      if (savedWalletType === 'metamask' && isMetaMaskInstalled()) {
        window.ethereum.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              setWalletAddress(accounts[0]);
              setWalletType('metamask');
              setIsConnected(true);
            }
          })
          .catch(console.error);
      }
    }
  }, []);

  // Save connection state
  useEffect(() => {
    localStorage.setItem('wallet_connected', isConnected.toString());
    if (walletType) {
      localStorage.setItem('wallet_type', walletType);
    } else {
      localStorage.removeItem('wallet_type');
    }
  }, [isConnected, walletType]);

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    walletType,
    network,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    chainId,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};