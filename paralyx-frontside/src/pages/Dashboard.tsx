import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  Target,
  Globe
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useWallet } from '../contexts/WalletContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProtocolHealthWidget from '../components/dashboard/ProtocolHealthWidget';
import TVLChart from '../components/dashboard/TVLChart';
import QuickActions from '../components/dashboard/QuickActions';
import MarketOverview from '../components/dashboard/MarketOverview';
import RecentActivity from '../components/dashboard/RecentActivity';

const Dashboard: React.FC = () => {
  const { protocolData, isLoading, error } = useData();
  const { isConnected } = useWallet();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="glass-card p-8 max-w-md mx-auto">
          <div className="text-paralyx-warning mb-4">
            <Activity size={48} className="mx-auto" />
          </div>
          <h3 className="font-title font-bold text-lg text-paralyx-text mb-2">
            Connection Error
          </h3>
          <p className="text-paralyx-text/70 font-body text-sm">
            {error}
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Value Locked',
      value: (protocolData?.tvl || 0) / 1000000, // Convert to millions
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign,
      prefix: '$',
      suffix: 'M'
    },
    {
      name: 'Total Borrowed',
      value: (protocolData?.totalBorrowed || 0) / 1000000, // Convert to millions
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      prefix: '$',
      suffix: 'M'
    },
    {
      name: 'Utilization Rate',
      value: protocolData?.utilizationRate || 0,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: Target,
      suffix: '%'
    },
    {
      name: 'Active Users',
      value: protocolData?.activeUsers || 0,
      change: '+15.3%',
      changeType: 'positive' as const,
      icon: Users,
      suffix: ''
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-paralyx-primary/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-title font-bold text-3xl text-paralyx-text mb-2">
                Welcome to Paralyx Protocol
              </h1>
              <p className="text-paralyx-text/70 font-body text-lg">
                The next generation cross-chain DeFi lending platform
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-paralyx-primary/20 rounded-xl flex items-center justify-center mb-2">
                  <Shield size={24} className="text-paralyx-primary" />
                </div>
                <div className="text-xs text-paralyx-text/60 font-body">Secure</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-paralyx-accent/20 rounded-xl flex items-center justify-center mb-2">
                  <Zap size={24} className="text-paralyx-accent" />
                </div>
                <div className="text-xs text-paralyx-text/60 font-body">Fast</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-paralyx-safe/20 rounded-xl flex items-center justify-center mb-2">
                  <Globe size={24} className="text-paralyx-safe" />
                </div>
                <div className="text-xs text-paralyx-text/60 font-body">Global</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Protocol Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
                </span>
              </div>
              <div className="text-sm text-paralyx-text/60 font-body">
                {stat.name}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Health */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div variants={itemVariants}>
            <TVLChart />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <MarketOverview />
          </motion.div>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <ProtocolHealthWidget />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <QuickActions />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <RecentActivity />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;