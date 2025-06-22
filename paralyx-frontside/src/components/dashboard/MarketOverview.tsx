import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Target, ExternalLink } from "lucide-react";
import { useData } from "../../contexts/DataContext";
import ethLogo from "../../../assets/eth.png";
import usdcLogo from "../../../assets/usdc.png";

const MarketOverview: React.FC = () => {
  const { markets } = useData();

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

  const topMarkets = markets
    .filter((market) => market.isActive)
    .sort((a, b) => b.totalSupply - a.totalSupply)
    .slice(0, 4);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-title font-bold text-lg text-paralyx-text">
          Top Markets
        </h3>
        <Link
          to="/markets"
          className="flex items-center space-x-2 text-sm text-paralyx-primary hover:text-paralyx-primary/80 font-body"
        >
          <span>View All</span>
          <ExternalLink size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topMarkets.map((market, index) => (
          <motion.div
            key={market.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="p-4 bg-glass-light rounded-lg border border-white/10 hover:bg-glass-medium transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
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
                    {market.asset}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-title font-bold text-sm text-paralyx-text">
                  ${market.totalSupply.toLocaleString()}M
                </div>
                <div className="text-xs text-paralyx-text/60 font-body">
                  TVL
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp size={12} className="text-paralyx-safe" />
                  <span className="text-xs text-paralyx-text/60 font-body">
                    Supply
                  </span>
                </div>
                <div className="font-title font-bold text-sm text-paralyx-safe">
                  {market.supplyAPY.toFixed(2)}%
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingDown size={12} className="text-paralyx-warning" />
                  <span className="text-xs text-paralyx-text/60 font-body">
                    Borrow
                  </span>
                </div>
                <div className="font-title font-bold text-sm text-paralyx-warning">
                  {market.borrowAPY.toFixed(2)}%
                </div>
              </div>

              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Target size={12} className="text-paralyx-accent" />
                  <span className="text-xs text-paralyx-text/60 font-body">
                    Util
                  </span>
                </div>
                <div className="font-title font-bold text-sm text-paralyx-text">
                  {market.utilizationRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MarketOverview;
