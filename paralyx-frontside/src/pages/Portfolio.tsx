import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useWallet } from '../contexts/WalletContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import PositionCard from '../components/portfolio/PositionCard';
import HealthFactorGauge from '../components/portfolio/HealthFactorGauge';
import TransactionHistory from '../components/portfolio/TransactionHistory';
import PortfolioChart from '../components/portfolio/PortfolioChart';

const Portfolio: React.FC = () => {
  const { userPosition, isLoading } = useData();
  const { isConnected, walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="glass-card p-8 max-w-md mx-auto">
          <Wallet size={48} className="mx-auto text-paralyx-text/40 mb-4" />
          <h3 className="font-title font-bold text-lg text-paralyx-text mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-paralyx-text/70 font-body text-sm">
            Connect your wallet to view your portfolio and positions
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Supplied',
      value: userPosition?.totalSupplied || 0,
      change: '+5.2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      prefix: '$'
    },
    {
      name: 'Total Borrowed',
      value: userPosition?.totalBorrowed || 0,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: TrendingDown,
      prefix: '$'
    },
    {
      name: 'Net APY',
      value: userPosition?.netAPY || 0,
      change: '+0.3%',
      changeType: 'positive' as const,
      icon: DollarSign,
      suffix: '%',
      precision: 2
    },
    {
      name: 'Health Factor',
      value: userPosition?.healthFactor || 0,
      change: userPosition?.liquidationRisk === 'low' ? 'Safe' : 'Risk',
      changeType: userPosition?.liquidationRisk === 'low' ? 'positive' as const : 'negative' as const,
      icon: Shield,
      precision: 2
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-title font-bold text-2xl text-paralyx-text mb-2">
              Portfolio Overview
            </h1>
            <p className="text-paralyx-text/70 font-body">
              Track your positions, earnings, and portfolio health
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs text-paralyx-text/60 font-body">Wallet</div>
              <div className="font-body text-sm text-paralyx-text">
                {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              userPosition?.liquidationRisk === 'low' ? 'bg-paralyx-safe' :
              userPosition?.liquidationRisk === 'medium' ? 'bg-yellow-400' :
              'bg-paralyx-warning'
            } animate-pulse`}></div>
          </div>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="metric-card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-paralyx-primary/10 rounded-lg">
                  <Icon size={20} className="text-paralyx-primary" />
                </div>
                <div className={`flex items-center space-x-1 text-xs font-body ${
                  stat.changeType === 'positive' ? 'text-paralyx-safe' : 'text-paralyx-warning'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="mb-1">
                <span className="font-title font-bold text-2xl text-paralyx-text">
                  {stat.prefix}{stat.precision ? stat.value.toFixed(stat.precision) : stat.value.toLocaleString()}{stat.suffix}
                </span>
              </div>
              <div className="text-sm text-paralyx-text/60 font-body">
                {stat.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Health & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Factor */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-title font-bold text-lg text-paralyx-text">
                Position Health
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-body ${
                userPosition?.liquidationRisk === 'low' ? 'health-safe' :
                userPosition?.liquidationRisk === 'medium' ? 'text-yellow-600 border-yellow-300 bg-yellow-50' :
                'health-warning'
              }`}>
                {userPosition?.liquidationRisk === 'low' ? 'Safe' :
                 userPosition?.liquidationRisk === 'medium' ? 'Medium Risk' :
                 'High Risk'}
              </div>
            </div>
            
            <HealthFactorGauge 
              healthFactor={userPosition?.healthFactor || 0}
              liquidationRisk={userPosition?.liquidationRisk || 'low'}
            />
            
            {userPosition?.liquidationRisk !== 'low' && (
              <div className="mt-4 p-4 bg-paralyx-warning/10 border border-paralyx-warning/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-paralyx-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-title font-medium text-sm text-paralyx-text">
                      Liquidation Risk
                    </div>
                    <div className="text-xs text-paralyx-text/70 font-body mt-1">
                      Your position is at risk. Consider supplying more collateral or repaying some borrowed assets.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Portfolio Chart */}
          <div className="glass-card p-6">
            <h3 className="font-title font-bold text-lg text-paralyx-text mb-6">
              Portfolio Performance
            </h3>
            <PortfolioChart />
          </div>
        </div>

        {/* Right Column - Positions & Activity */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="glass-card p-6">
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('positions')}
                className={`flex-1 py-2 px-4 text-sm font-body rounded-lg transition-all duration-200 ${
                  activeTab === 'positions'
                    ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                    : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
                }`}
              >
                Positions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2 px-4 text-sm font-body rounded-lg transition-all duration-200 ${
                  activeTab === 'history'
                    ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                    : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
                }`}
              >
                History
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'positions' ? (
              <div className="space-y-4">
                {userPosition?.positions && userPosition.positions.length > 0 ? (
                  userPosition.positions.map((position, index) => (
                    <PositionCard key={position.market} position={position} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity size={32} className="mx-auto text-paralyx-text/40 mb-3" />
                    <div className="text-sm text-paralyx-text/60 font-body">
                      No active positions
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <TransactionHistory />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Portfolio;