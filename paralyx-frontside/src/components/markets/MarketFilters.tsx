import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, Activity } from 'lucide-react';

interface MarketFiltersProps {
  filterType: 'all' | 'active' | 'high_apy';
  onFilterChange: (filter: 'all' | 'active' | 'high_apy') => void;
}

const MarketFilters: React.FC<MarketFiltersProps> = ({ filterType, onFilterChange }) => {
  const filters = [
    {
      id: 'all' as const,
      name: 'All Markets',
      description: 'Show all available markets',
      icon: Activity,
      count: '12'
    },
    {
      id: 'active' as const,
      name: 'Active Only',
      description: 'Markets currently accepting deposits',
      icon: CheckCircle,
      count: '8'
    },
    {
      id: 'high_apy' as const,
      name: 'High APY',
      description: 'Markets with >5% supply APY',
      icon: TrendingUp,
      count: '4'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = filterType === filter.id;
        
        return (
          <motion.button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 rounded-lg border text-left transition-all duration-200 ${
              isActive
                ? 'border-paralyx-primary bg-paralyx-primary/10'
                : 'border-white/20 hover:border-paralyx-primary/50 hover:bg-glass-light'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon size={20} className={isActive ? 'text-paralyx-primary' : 'text-paralyx-text/60'} />
              <span className={`text-xs font-body px-2 py-1 rounded-full ${
                isActive 
                  ? 'bg-paralyx-primary/20 text-paralyx-primary'
                  : 'bg-white/10 text-paralyx-text/60'
              }`}>
                {filter.count}
              </span>
            </div>
            
            <h4 className={`font-title font-medium text-sm mb-1 ${
              isActive ? 'text-paralyx-text' : 'text-paralyx-text/80'
            }`}>
              {filter.name}
            </h4>
            
            <p className={`text-xs font-body ${
              isActive ? 'text-paralyx-text/70' : 'text-paralyx-text/50'
            }`}>
              {filter.description}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MarketFilters;