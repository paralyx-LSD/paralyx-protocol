// Global type definitions for wallet integrations

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    selectedAddress?: string;
    chainId?: string;
  };
  freighter?: {
    getPublicKey: (options: { network: string }) => Promise<{ publicKey: string }>;
    signTransaction: (xdr: string, options: { network: string }) => Promise<{ signedTxXdr: string }>;
    getNetwork: () => Promise<{ network: string }>;
    isConnected: () => Promise<boolean>;
    requestAccess: () => Promise<{ publicKey: string }>;
  };
}

// MetaMask specific types
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
}

// Freighter specific types
interface FreighterProvider {
  getPublicKey: (options?: { network?: string }) => Promise<{ publicKey: string }>;
  signTransaction: (transaction: string) => Promise<{ signature: string }>;
  getNetwork: () => Promise<{ network: string }>;
  isConnected: () => Promise<boolean>;
  requestAccess: () => Promise<{ publicKey: string }>;
}