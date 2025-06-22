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
  const { isConnected, walletAddress, stellarWallet } = useWallet();
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

      // Fetch user data if connected (prefer Stellar address for backend API)
      if (isConnected && stellarWallet.isConnected && stellarWallet.address) {
        try {
          const userResponse = await api.getUserPosition(stellarWallet.address);
          
          // Transform API response to UserPosition format
          if (userResponse.position && userResponse.position.hasPosition) {
            const position = userResponse.position;
            setUserPosition({
              totalSupplied: position.totalCollateralUsd || 0,
              totalBorrowed: position.totalDebtUsd || 0,
              netAPY: 4.5, // Would need to calculate from market rates
              healthFactor: position.healthFactor || 0,
              liquidationRisk: position.healthStatus === 'safe' ? 'low' : 
                             position.ltv > 80 ? 'high' : 'medium',
              positions: [{
                market: 'WETH',
                supplied: position.sTokenBalance || 0,
                borrowed: position.totalDebtUsd || 0,
                suppliedUSD: position.totalCollateralUsd || 0,
                borrowedUSD: position.totalDebtUsd || 0,
              }]
            });
          } else {
            // No position - return empty state
            setUserPosition({
              totalSupplied: 0,
              totalBorrowed: 0,
              netAPY: 0,
              healthFactor: 0,
              liquidationRisk: 'low',
              positions: []
            });
          }
        } catch (userError) {
          console.error('Error fetching user position:', userError);
          // Set empty position on error
          setUserPosition({
            totalSupplied: 0,
            totalBorrowed: 0,
            netAPY: 0,
            healthFactor: 0,
            liquidationRisk: 'low',
            positions: []
          });
        }
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
    
    // Set up auto-refresh every 2 minutes to avoid rate limiting
    const interval = setInterval(refreshData, 120000);
    
    return () => clearInterval(interval);
  }, [isConnected, stellarWallet.isConnected, stellarWallet.address]);

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