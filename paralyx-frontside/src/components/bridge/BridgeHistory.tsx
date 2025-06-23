import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  ArrowLeftRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import stellarLogo from "../../../assets/stellar.png";

interface BridgeTransaction {
  txId: string;
  hash?: string;
  direction: 'eth_to_stellar' | 'stellar_mint' | 'stellar_to_eth';
  status: 'completed' | 'pending' | 'failed' | 'processing';
  amount: string;
  fromToken: string;
  toToken: string;
  timestamp: string;
  blockNumber?: number;
  ledger?: number;
  stellarAddress?: string;
  bridgeOperations?: Array<{
    type: string;
    asset: string;
    amount: string;
    from?: string;
    to?: string;
  }>;
}

interface StellarHistoryResponse {
  stellarAddress: string;
  transactions: Array<{
    txId: string;
    hash: string;
    ledger: number;
    timestamp: string;
    fee: string;
    successful: boolean;
    operations: number;
    bridgeOperations: Array<{
      type: string;
      asset: string;
      amount: string;
      from?: string;
      to?: string;
    }>;
  }>;
  total: number;
}

export const BridgeHistory: React.FC = () => {
  const { ethWallet, stellarWallet } = useWallet();
  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'ethereum' | 'stellar'>('all');

  useEffect(() => {
    if (stellarWallet.address) {
      fetchBridgeHistory();
    }
  }, [stellarWallet.address]);

  const fetchBridgeHistory = async () => {
    if (!stellarWallet.address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch Stellar bridge history
      const response = await fetch(`http://localhost:3001/api/bridge/history/${stellarWallet.address}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bridge history');
      }
      
      const data: StellarHistoryResponse = await response.json();
      
             // Transform Stellar transactions to our format
       const stellarTxs: BridgeTransaction[] = data.transactions.map(tx => ({
         txId: tx.txId,
         hash: tx.hash,
         direction: 'stellar_mint' as const,
         status: tx.successful ? 'completed' as const : 'failed' as const,
         amount: tx.bridgeOperations[0]?.amount || '0',
         fromToken: 'ETH',
         toToken: tx.bridgeOperations[0]?.asset || 's-TOKEN',
         timestamp: tx.timestamp,
         ledger: tx.ledger,
         stellarAddress: stellarWallet.address || undefined,
         bridgeOperations: tx.bridgeOperations
       }));
      
      setTransactions(stellarTxs);
      
    } catch (err) {
      console.error('Error fetching bridge history:', err);
      setError('Failed to load bridge history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'pending':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ethereum') return tx.direction === 'eth_to_stellar';
    if (activeTab === 'stellar') return tx.direction === 'stellar_mint';
    return true;
  });

  const formatAmount = (amount: string, decimals: number = 18) => {
    const num = Number(amount) / Math.pow(10, decimals);
    return num.toFixed(6);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const openExplorer = (txId: string, direction: string) => {
    if (direction === 'stellar_mint') {
      window.open(`https://stellar.expert/explorer/testnet/tx/${txId}`, '_blank');
    } else {
      window.open(`https://sepolia.etherscan.io/tx/${txId}`, '_blank');
    }
  };

  if (!stellarWallet.address) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Bridge History</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">Connect your Stellar wallet to view bridge history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Bridge History</h3>
        <button
          onClick={fetchBridgeHistory}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All Transactions' },
          { key: 'ethereum', label: 'Ethereum → Stellar' },
          { key: 'stellar', label: 'Stellar Transactions' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner />
          <span className="ml-2 text-gray-600">Loading bridge history...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Transactions List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No bridge transactions found</p>
              <p className="text-sm text-gray-400 mt-2">
                Complete a bridge transaction to see it here
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.txId}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openExplorer(tx.txId, tx.direction)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(tx.status)}
                    <span className={`text-sm font-medium ${getStatusColor(tx.status)}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(tx.timestamp)}
                  </span>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    <span className="font-medium">{formatAmount(tx.amount)} {tx.fromToken}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="font-medium">{tx.toToken}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {tx.direction === 'stellar_mint' ? `Ledger ${tx.ledger}` : `Block ${tx.blockNumber}`}
                  </div>
                </div>

                <div className="text-xs text-gray-500 truncate">
                  Transaction: {tx.txId}
                </div>

                {tx.bridgeOperations && tx.bridgeOperations.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Operations: </span>
                    {tx.bridgeOperations.map((op, idx) => (
                      <span key={idx} className="text-gray-600">
                        {op.type} ({op.asset})
                        {idx < tx.bridgeOperations!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BridgeHistory;
