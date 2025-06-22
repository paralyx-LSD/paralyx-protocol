import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';
import * as api from '../services/api';

interface ProtocolData {
  tvl: number;
  totalBorrowed: number;
  utilizationRate: number;
  healthScore: number;
  activeUsers: number;
}

interface MarketData {
  id: string;
  name: string;
  asset: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: number;
  totalBorrow: number;
  utilizationRate: number;
  collateralFactor: number;
  liquidationThreshold: number;
  isActive: boolean;
}

interface UserPosition {
  totalSupplied: number;
  totalBorrowed: number;
  netAPY: number;
  healthFactor: number;
  liquidationRisk: 'low' | 'medium' | 'high';
  positions: Array<{
    market: string;
    supplied: number;
    borrowed: number;
    suppliedUSD: number;
    borrowedUSD: number;
  }>;
}

interface DataContextType {
  protocolData: ProtocolData | null;
  markets: MarketData[];
  userPosition: UserPosition | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { isConnected, walletAddress } = useWallet();
  const [protocolData, setProtocolData] = useState<ProtocolData | null>(null);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch protocol data
      const protocolResponse = await api.getProtocolOverview();
      setProtocolData(protocolResponse);

      // Fetch markets data
      const marketsResponse = await api.getMarkets();
      setMarkets(marketsResponse);

      // Fetch user data if connected
      if (isConnected && walletAddress) {
        const userResponse = await api.getUserPosition(walletAddress);
        setUserPosition(userResponse);
      } else {
        setUserPosition(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load and periodic refresh
  useEffect(() => {
    refreshData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, walletAddress]);

  const value: DataContextType = {
    protocolData,
    markets,
    userPosition,
    isLoading,
    error,
    refreshData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};