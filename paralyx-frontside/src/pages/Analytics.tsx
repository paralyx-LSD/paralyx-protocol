import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { useData } from "../contexts/DataContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import MetricCard from "../components/analytics/MetricCard";
import TVLAnalytics from "../components/analytics/TVLAnalytics";
import VolumeChart from "../components/analytics/VolumeChart";
import UserGrowthChart from "../components/analytics/UserGrowthChart";
import MarketDistribution from "../components/analytics/MarketDistribution";
import ethLogo from "../../assets/eth.png";
import usdcLogo from "../../assets/usdc.png";

const Analytics: React.FC = () => {
  const { protocolData, markets, isLoading } = useData();
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "90d">(
    "30d"
  );

  const getAssetLogo = (symbol: string) => {
    switch (symbol) {
      case "WETH":
      case "ETH":
      case "STETH":
      case "WSTETH":
        return ethLogo;
      case "USDC":
        return usdcLogo;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const metrics = [
    {
      name: "Total Value Locked",
      value: protocolData?.tvl || 0,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: DollarSign,
      prefix: "$",
      suffix: "M",
      description: "24h change",
    },
    {
      name: "Active Markets",
      value: markets.filter((m) => m.isActive).length,
      change: "+2",
      changeType: "positive" as const,
      icon: BarChart3,
      description: "New this month",
    },
    {
      name: "Total Users",
      value: protocolData?.activeUsers || 0,
      change: "+15.3%",
      changeType: "positive" as const,
      icon: Users,
      description: "30d growth",
    },
    {
      name: "Protocol Revenue",
      value: 125.8,
      change: "+8.7%",
      changeType: "positive" as const,
      icon: TrendingUp,
      prefix: "$",
      suffix: "K",
      description: "This month",
    },
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
              Protocol Analytics
            </h1>
            <p className="text-paralyx-text/70 font-body">
              Comprehensive insights into protocol performance and metrics
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-paralyx-text/60" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="input-field min-w-32"
            >
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <MetricCard metric={metric} />
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TVL Analytics */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <TVLAnalytics timeframe={timeframe} />
        </motion.div>

        {/* Volume Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <VolumeChart timeframe={timeframe} />
        </motion.div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <UserGrowthChart timeframe={timeframe} />
        </motion.div>

        {/* Market Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <MarketDistribution markets={markets} />
        </motion.div>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Markets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              Top Markets by TVL
            </h3>
            <ArrowUpRight size={16} className="text-paralyx-text/40" />
          </div>

          <div className="space-y-4">
            {markets
              .sort((a, b) => b.totalSupply - a.totalSupply)
              .slice(0, 5)
              .map((market, index) => (
                <div
                  key={market.id}
                  className="flex items-center justify-between p-3 hover:bg-glass-light rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-paralyx-primary/20 rounded-lg flex items-center justify-center">
                      {getAssetLogo(market.asset) ? (
                        <img
                          src={getAssetLogo(market.asset)!}
                          alt={market.asset}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-title font-bold text-paralyx-text">
                          {market.asset.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-title font-medium text-sm text-paralyx-text">
                        {market.name}
                      </div>
                      <div className="text-xs text-paralyx-text/60 font-body">
                        {market.supplyAPY.toFixed(2)}% APY
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-title font-bold text-sm text-paralyx-text">
                      ${market.totalSupply.toLocaleString()}M
                    </div>
                    <div className="text-xs text-paralyx-text/60 font-body">
                      {market.utilizationRate.toFixed(1)}% utilized
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Protocol Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              Protocol Health
            </h3>
            <div className="w-2 h-2 bg-paralyx-safe rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-paralyx-text/70 font-body">
                Overall Health Score
              </span>
              <span className="font-title font-bold text-paralyx-text">
                {protocolData?.healthScore || 95}/100
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-paralyx-text/70 font-body">
                Average Utilization
              </span>
              <span className="font-title font-bold text-paralyx-text">
                {(
                  markets.reduce((sum, m) => sum + m.utilizationRate, 0) /
                    markets.length || 0
                ).toFixed(1)}
                %
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-paralyx-text/70 font-body">
                Active Markets
              </span>
              <span className="font-title font-bold text-paralyx-text">
                {markets.filter((m) => m.isActive).length}/{markets.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-paralyx-text/70 font-body">
                Reserve Ratio
              </span>
              <span className="font-title font-bold text-paralyx-safe">
                12.5%
              </span>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center space-x-2 text-xs text-paralyx-safe font-body">
                <Activity size={12} />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Analytics;
