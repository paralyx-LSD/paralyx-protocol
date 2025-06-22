import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'bridge';
  asset: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  hash?: string;
  gasUsed?: number;
}

const TransactionHistory: React.FC = () => {
  // Mock data - replace with real API data
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'supply',
      asset: 'USDC',
      amount: 1000,
      status: 'confirmed',
      timestamp: Date.now() - 300000,
      hash: '0x123...abc',
      gasUsed: 0.0021
    },
    {
      id: '2',
      type: 'borrow',
      asset: 'ETH',
      amount: 0.5,
      status: 'confirmed',
      timestamp: Date.now() - 900000,
      hash: '0x456...def',
      gasUsed: 0.0034
    },
    {
      id: '3',
      type: 'bridge',
      asset: 'stETH',
      amount: 2.0,
      status: 'pending',
      timestamp: Date.now() - 1800000,
    },
    {
      id: '4',
      type: 'repay',
      asset: 'USDT',
      amount: 500,
      status: 'confirmed',
      timestamp: Date.now() - 3600000,
      hash: '0x789...ghi',
      gasUsed: 0.0018
    },
    {
      id: '5',
      type: 'withdraw',
      asset: 'DAI',
      amount: 250,
      status: 'failed',
      timestamp: Date.now() - 7200000,
    }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'supply':
        return TrendingUp;
      case 'borrow':
        return TrendingDown;
      case 'bridge':
        return ArrowLeftRight;
      case 'repay':
      case 'withdraw':
        return TrendingUp;
      default:
        return Clock;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return CheckCircle;
      case 'failed':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-paralyx-safe';
      case 'failed':
        return 'text-paralyx-warning';
      default:
        return 'text-yellow-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'supply':
      case 'repay':
        return 'text-paralyx-safe';
      case 'borrow':
      case 'withdraw':
        return 'text-paralyx-warning';
      case 'bridge':
        return 'text-paralyx-accent';
      default:
        return 'text-paralyx-text';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="space-y-3">
      {transactions.map((tx, index) => {
        const TransactionIcon = getTransactionIcon(tx.type);
        const StatusIcon = getStatusIcon(tx.status);
        
        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-3 bg-glass-light rounded-lg border border-white/10 hover:bg-glass-medium transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-paralyx-primary/10 rounded">
                  <TransactionIcon size={14} className={getTypeColor(tx.type)} />
                </div>
                <div>
                  <div className="font-title font-medium text-sm text-paralyx-text capitalize">
                    {tx.type} {tx.asset}
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    {formatTimeAgo(tx.timestamp)}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-title font-bold text-sm text-paralyx-text">
                  {tx.amount} {tx.asset}
                </div>
                <div className="flex items-center justify-end space-x-1">
                  <StatusIcon size={12} className={getStatusColor(tx.status)} />
                  <span className={`text-xs font-body capitalize ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Transaction Details */}
            {tx.hash && (
              <div className="flex items-center justify-between text-xs text-paralyx-text/50 font-body">
                <div className="flex items-center space-x-4">
                  <span>Hash: {tx.hash}</span>
                  {tx.gasUsed && <span>Gas: {tx.gasUsed} ETH</span>}
                </div>
                <button className="flex items-center space-x-1 hover:text-paralyx-primary transition-colors">
                  <ExternalLink size={10} />
                  <span>View</span>
                </button>
              </div>
            )}
          </motion.div>
        );
      })}
      
      {transactions.length === 0 && (
        <div className="text-center py-8">
          <Clock size={32} className="mx-auto text-paralyx-text/40 mb-3" />
          <div className="text-sm text-paralyx-text/60 font-body">
            No transaction history
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;