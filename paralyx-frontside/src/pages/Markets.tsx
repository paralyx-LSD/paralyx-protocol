import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  Shield
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import MarketCard from '../components/markets/MarketCard';
import MarketFilters from '../components/markets/MarketFilters';

const Markets: React.FC = () => {
  const { markets, isLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'supply_apy' | 'borrow_apy' | 'total_supply' | 'utilization'>('supply_apy');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'high_apy'>('all');
  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredAndSortedMarkets = markets
    .filter(market => {
      const matchesSearch = market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           market.asset.toLowerCase().includes(searchTerm.toLowerCase());
      
      switch (filterType) {
        case 'active':
          return matchesSearch && market.isActive;
        case 'high_apy':
          return matchesSearch && market.supplyAPY > 5;
        default:
          return matchesSearch;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'supply_apy':
          return b.supplyAPY - a.supplyAPY;
        case 'borrow_apy':
          return b.borrowAPY - a.borrowAPY;
        case 'total_supply':
          return b.totalSupply - a.totalSupply;
        case 'utilization':
          return b.utilizationRate - a.utilizationRate;
        default:
          return 0;
      }
    });

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
              Lending Markets
            </h1>
            <p className="text-paralyx-text/70 font-body">
              Supply assets to earn yield or borrow against your collateral
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-paralyx-text/60 font-body">
              <div className="w-2 h-2 bg-paralyx-safe rounded-full animate-pulse"></div>
              <span>{markets.length} markets available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-paralyx-text/40" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full pl-10"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input-field min-w-48"
          >
            <option value="supply_apy">Sort by Supply APY</option>
            <option value="borrow_apy">Sort by Borrow APY</option>
            <option value="total_supply">Sort by Total Supply</option>
            <option value="utilization">Sort by Utilization</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`glass-button px-4 py-2 flex items-center space-x-2 ${
              filterType !== 'all' ? 'bg-paralyx-primary/20 border-paralyx-primary/30' : ''
            }`}
          >
            <Filter size={16} />
            <span className="font-body">Filters</span>
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <MarketFilters
              filterType={filterType}
              onFilterChange={setFilterType}
            />
          </motion.div>
        )}
      </div>

      {/* Market Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <DollarSign size={20} className="text-paralyx-primary" />
            <span className="font-title font-medium text-paralyx-text">Total Supply</span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-text">
            ${markets.reduce((sum, market) => sum + market.totalSupply, 0).toLocaleString()}M
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingDown size={20} className="text-paralyx-warning" />
            <span className="font-title font-medium text-paralyx-text">Total Borrow</span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-text">
            ${markets.reduce((sum, market) => sum + market.totalBorrow, 0).toLocaleString()}M
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp size={20} className="text-paralyx-safe" />
            <span className="font-title font-medium text-paralyx-text">Avg Supply APY</span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-text">
            {(markets.reduce((sum, market) => sum + market.supplyAPY, 0) / markets.length || 0).toFixed(2)}%
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-3">
            <Target size={20} className="text-paralyx-accent" />
            <span className="font-title font-medium text-paralyx-text">Avg Utilization</span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-text">
            {(markets.reduce((sum, market) => sum + market.utilizationRate, 0) / markets.length || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAndSortedMarkets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <MarketCard market={market} />
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedMarkets.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Shield size={48} className="mx-auto text-paralyx-text/40 mb-4" />
          <h3 className="font-title font-bold text-lg text-paralyx-text mb-2">
            No markets found
          </h3>
          <p className="text-paralyx-text/60 font-body">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default Markets;