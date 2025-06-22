import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';

const QuickActions: React.FC = () => {
  const { isConnected } = useWallet();

  const actions = [
    {
      title: 'Supply Assets',
      description: 'Earn yield on your crypto',
      icon: TrendingUp,
      color: 'bg-paralyx-safe/10 border-paralyx-safe/30',
      iconColor: 'text-paralyx-safe green-glow',
      href: '/markets',
      enabled: true
    },
    {
      title: 'Borrow Assets',
      description: 'Borrow against collateral',
      icon: TrendingDown,
      color: 'bg-paralyx-primary/10 border-paralyx-primary/30',
      iconColor: 'text-paralyx-primary',
      href: '/markets',
      enabled: isConnected
    },
    {
      title: 'Bridge Assets',
      description: 'Cross-chain transfers',
      icon: ArrowLeftRight,
      color: 'bg-paralyx-accent/10 border-paralyx-accent/30',
      iconColor: 'text-paralyx-accent',
      href: '/bridge',
      enabled: true
    },
    {
      title: 'View Analytics',
      description: 'Protocol insights',
      icon: BarChart3,
      color: 'bg-paralyx-warning/10 border-paralyx-warning/30',
      iconColor: 'text-paralyx-warning',
      href: '/analytics',
      enabled: true
    }
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="font-title font-bold text-lg text-paralyx-text mb-6">
        Quick Actions
      </h3>
      
      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              {action.enabled ? (
                <Link
                  to={action.href}
                  className={`block p-4 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-lg ${action.color}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Icon size={16} className={action.iconColor} />
                      </div>
                      <div>
                        <div className="font-title font-medium text-sm text-paralyx-text">
                          {action.title}
                        </div>
                        <div className="text-xs text-paralyx-text/60 font-body">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-paralyx-text/40" />
                  </div>
                </Link>
              ) : (
                <div className={`p-4 rounded-lg border opacity-50 cursor-not-allowed ${action.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Icon size={16} className={action.iconColor} />
                      </div>
                      <div>
                        <div className="font-title font-medium text-sm text-paralyx-text">
                          {action.title}
                        </div>
                        <div className="text-xs text-paralyx-text/60 font-body">
                          Connect wallet required
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;