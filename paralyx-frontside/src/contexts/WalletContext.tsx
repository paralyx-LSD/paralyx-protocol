import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';

// Define types for each wallet's state
interface EthereumWalletState {
  address: string | null;
  isConnected: boolean;
  chainId: string | null;
}

interface StellarWalletState {
  address: string | null;
  isConnected: boolean;
}

// The main context type
interface WalletContextType {
  ethWallet: EthereumWalletState;
  stellarWallet: StellarWalletState;
  isConnecting: boolean;
  
  connectWallet: (type: 'metamask' | 'freighter') => Promise<void>;
  disconnectWallet: (type: 'metamask' | 'freighter') => void;
  switchEthereumNetwork: (chainId: string) => Promise<void>;

  // Placeholder functions remain for now, to be integrated later
  transactions: any[];
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

const isMetaMaskInstalled = () => typeof window !== 'undefined' && window.ethereum?.isMetaMask;
const isFreighterInstalled = () => typeof window !== 'undefined' && !!window.freighter;

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [ethWallet, setEthWallet] = useState<EthereumWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });
  const [stellarWallet, setStellarWallet] = useState<StellarWalletState>({
    address: null,
    isConnected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Placeholder state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);

  // --- Ethereum Logic ---
  const connectMetaMask = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    try {
      const accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        const chainId = await window.ethereum!.request({ method: 'eth_chainId' });
        setEthWallet({ address: accounts[0], isConnected: true, chainId });
        toast.success('MetaMask connected!');
      }
    } catch (err: any) {
      toast.error(err.code === 4001 ? 'Connection rejected.' : 'Failed to connect MetaMask.');
    }
  };

  const switchEthereumNetwork = async (chainId: string) => {
    if (!isMetaMaskInstalled()) return;
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (err: any) {
      // Handle common errors like chain not added
      console.error("Failed to switch network", err);
      toast.error("Failed to switch network.");
    }
  };

  const disconnectMetaMask = () => {
    setEthWallet({ address: null, isConnected: false, chainId: null });
    localStorage.removeItem('eth_wallet_connected');
    toast.success('MetaMask disconnected.');
  };

  // --- Stellar Logic ---
  const connectFreighter = async () => {
    if (!isFreighterInstalled()) {
      toast.error('Freighter is not installed.');
      window.open('https://www.freighter.app/', '_blank');
      return;
    }
    try {
      await window.freighter!.requestAccess();
      const publicKey = await window.freighter!.getPublicKey();
      setStellarWallet({ address: publicKey, isConnected: true });
      toast.success('Freighter connected!');
    } catch (err: any) {
      toast.error('Failed to connect Freighter.');
    }
  };

  const disconnectFreighter = () => {
    setStellarWallet({ address: null, isConnected: false });
    localStorage.removeItem('stellar_wallet_connected');
    toast.success('Freighter disconnected.');
  };

  // --- Generic Handlers ---
  const connectWallet = async (type: 'metamask' | 'freighter') => {
    setIsConnecting(true);
    if (type === 'metamask') {
      await connectMetaMask();
    } else {
      await connectFreighter();
    }
    setIsConnecting(false);
  };
  
  const disconnectWallet = (type: 'metamask' | 'freighter') => {
    if (type === 'metamask') {
      disconnectMetaMask();
    } else {
      disconnectFreighter();
    }
  };
  
  // --- Effects ---
  // MetaMask event listeners
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectMetaMask();
      } else if (ethWallet.isConnected) {
        setEthWallet(prev => ({ ...prev, address: accounts[0] }));
      }
    };
    const handleChainChanged = (chainId: string) => {
      if (ethWallet.isConnected) {
        setEthWallet(prev => ({ ...prev, chainId }));
      }
    };
    window.ethereum!.on('accountsChanged', handleAccountsChanged);
    window.ethereum!.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum!.removeListener('chainChanged', handleChainChanged);
    };
  }, [ethWallet.isConnected]);

  // Auto-connect from localStorage
  useEffect(() => {
    if (localStorage.getItem('eth_wallet_connected') === 'true' && isMetaMaskInstalled()) {
      connectMetaMask();
    }
    if (localStorage.getItem('stellar_wallet_connected') === 'true' && isFreighterInstalled()) {
      connectFreighter();
    }
  }, []);

  // Save connection state to localStorage
  useEffect(() => {
    localStorage.setItem('eth_wallet_connected', String(ethWallet.isConnected));
  }, [ethWallet.isConnected]);

  useEffect(() => {
    localStorage.setItem('stellar_wallet_connected', String(stellarWallet.isConnected));
  }, [stellarWallet.isConnected]);

  // --- Mock Functions (to be replaced) ---
  const supplyTokens = async (amount: number) => `mock_tx_supply_${amount}`;
  const borrowTokens = async (amount: number) => `mock_tx_borrow_${amount}`;
  const repayTokens = async (amount: number) => `mock_tx_repay_${amount}`;
  const withdrawTokens = async (amount: number) => `mock_tx_withdraw_${amount}`;
  const refreshAccountInfo = async () => {};
  const getBalance = async (assetType?: string) => Math.random() * 100;
  
  const value: WalletContextType = {
    ethWallet,
    stellarWallet,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchEthereumNetwork,
    transactions,
    accountInfo,
    supplyTokens,
    borrowTokens,
    repayTokens,
    withdrawTokens,
    refreshAccountInfo,
    getBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};