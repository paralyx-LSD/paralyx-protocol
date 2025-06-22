import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'supply' | 'borrow' | 'repay' | 'withdraw' | 'bridge';
  asset: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  hash?: string;
}

const RecentActivity: React.FC = () => {
  // Mock data - replace with real API data
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'supply',
      asset: 'USDC',
      amount: 1000,
      status: 'confirmed',
      timestamp: Date.now() - 300000, // 5 minutes ago
      hash: '0x123...abc'
    },
    {
      id: '2',
      type: 'borrow',
      asset: 'ETH',
      amount: 0.5,
      status: 'confirmed',
      timestamp: Date.now() - 900000, // 15 minutes ago
      hash: '0x456...def'
    },
    {
      id: '3',
      type: 'bridge',
      asset: 'stETH',
      amount: 2.0,
      status: 'pending',
      timestamp: Date.now() - 1800000, // 30 minutes ago
    },
    {
      id: '4',
      type: 'repay',
      asset: 'USDT',
      amount: 500,
      status: 'confirmed',
      timestamp: Date.now() - 3600000, // 1 hour ago
      hash: '0x789...ghi'
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

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="font-title font-bold text-lg text-paralyx-text mb-6">
        Recent Activity
      </h3>
      
      <div className="space-y-4">
        {transactions.map((tx, index) => {
          const TransactionIcon = getTransactionIcon(tx.type);
          const StatusIcon = getStatusIcon(tx.status);
          
          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex items-center justify-between p-3 hover:bg-glass-light rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-paralyx-primary/10 rounded-lg">
                  <TransactionIcon size={16} className="text-paralyx-primary" />
                </div>
                <div>
                  <div className="font-title font-medium text-sm text-paralyx-text capitalize">
                    {tx.type} {tx.asset}
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    {tx.amount} {tx.asset} • {formatTimeAgo(tx.timestamp)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <StatusIcon size={14} className={getStatusColor(tx.status)} />
                <span className={`text-xs font-body capitalize ${getStatusColor(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {transactions.length === 0 && (
        <div className="text-center py-8">
          <Clock size={32} className="mx-auto text-paralyx-text/40 mb-3" />
          <div className="text-sm text-paralyx-text/60 font-body">
            No recent activity
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;