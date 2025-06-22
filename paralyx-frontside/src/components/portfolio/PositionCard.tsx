import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import usdcLogo from "../../../assets/usdc.png";

interface Position {
  market: string;
  supplied: number;
  borrowed: number;
  suppliedUSD: number;
  borrowedUSD: number;
}

interface PositionCardProps {
  position: Position;
}

const PositionCard: React.FC<PositionCardProps> = ({ position }) => {
  const netPosition = position.suppliedUSD - position.borrowedUSD;
  const isNetPositive = netPosition >= 0;

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

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-glass-light rounded-lg border border-white/10 hover:bg-glass-medium transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-paralyx-primary/20 rounded-lg flex items-center justify-center">
            {getAssetLogo(position.market) ? (
              <img
                src={getAssetLogo(position.market)!}
                alt={position.market}
                className="w-6 h-6 object-contain"
              />
            ) : (
              <span className="text-xs font-title font-bold text-paralyx-text">
                {position.market.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="font-title font-medium text-sm text-paralyx-text">
              {position.market}
            </div>
            <div className="text-xs text-paralyx-text/60 font-body">
              Active Position
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`font-title font-bold text-sm ${
              isNetPositive ? "text-paralyx-safe" : "text-paralyx-warning"
            }`}
          >
            {isNetPositive ? "+" : ""}${netPosition.toLocaleString()}
          </div>
          <div className="text-xs text-paralyx-text/60 font-body">
            Net Value
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Supplied */}
        <div className="text-center p-2 bg-paralyx-safe/10 rounded border border-paralyx-safe/20">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingUp size={12} className="text-paralyx-safe green-glow" />
            <span className="text-xs text-paralyx-text/60 font-body">
              Supplied
            </span>
          </div>
          <div className="font-title font-bold text-sm text-paralyx-text">
            {position.supplied.toFixed(4)}
          </div>
          <div className="text-xs text-paralyx-text/60 font-body">
            ${position.suppliedUSD.toLocaleString()}
          </div>
        </div>

        {/* Borrowed */}
        <div className="text-center p-2 bg-paralyx-warning/10 rounded border border-paralyx-warning/20">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingDown size={12} className="text-paralyx-warning" />
            <span className="text-xs text-paralyx-text/60 font-body">
              Borrowed
            </span>
          </div>
          <div className="font-title font-bold text-sm text-paralyx-text">
            {position.borrowed.toFixed(4)}
          </div>
          <div className="text-xs text-paralyx-text/60 font-body">
            ${position.borrowedUSD.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PositionCard;
