import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  DollarSign,
  Info,
} from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import usdcLogo from "../../../assets/usdc.png";
import SupplyModal from "../modals/SupplyModal";
import BorrowModal from "../modals/BorrowModal";

interface MarketData {
  id: string;
  name: string;
  asset: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: number;
  totalBorrow: number;
  utilizationRate: number;
  collateralFactor: number;
  liquidationThreshold: number;
  isActive: boolean;
}

interface MarketCardProps {
  market: MarketData;
}

const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);

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

  const getUtilizationColor = (rate: number) => {
    if (rate < 50) return "text-paralyx-safe";
    if (rate < 80) return "text-yellow-500";
    return "text-paralyx-warning";
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`glass-card p-6 ${!market.isActive ? "opacity-50" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-paralyx-primary/20 rounded-xl flex items-center justify-center">
            {getAssetLogo(market.asset) ? (
              <img
                src={getAssetLogo(market.asset)!}
                alt={market.asset}
                className="w-7 h-7 object-contain"
              />
            ) : (
              <span className="font-title font-bold text-paralyx-text">
                {market.asset.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              {market.name}
            </h3>
            <p className="text-sm text-paralyx-text/60 font-body">
              {market.asset}
            </p>
          </div>
        </div>

        <div
          className={`px-2 py-1 rounded-full text-xs font-body ${
            market.isActive
              ? "bg-paralyx-safe/10 text-paralyx-safe border border-paralyx-safe/30"
              : "bg-gray-500/10 text-gray-500 border border-gray-500/30"
          }`}
        >
          {market.isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* APY Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-paralyx-safe/10 rounded-lg border border-paralyx-safe/20">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingUp size={14} className="text-paralyx-safe green-glow" />
            <span className="text-xs text-paralyx-text/60 font-body">
              Supply APY
            </span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-safe green-stroke">
            {market.supplyAPY.toFixed(2)}%
          </div>
        </div>

        <div className="text-center p-3 bg-paralyx-warning/10 rounded-lg border border-paralyx-warning/20">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingDown size={14} className="text-paralyx-warning" />
            <span className="text-xs text-paralyx-text/60 font-body">
              Borrow APY
            </span>
          </div>
          <div className="font-title font-bold text-xl text-paralyx-warning">
            {market.borrowAPY.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-paralyx-text/70 font-body">
            Total Supply
          </span>
          <span className="font-title font-bold text-paralyx-text">
            ${market.totalSupply.toLocaleString()}M
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-paralyx-text/70 font-body">
            Total Borrow
          </span>
          <span className="font-title font-bold text-paralyx-text">
            ${market.totalBorrow.toLocaleString()}M
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Target size={14} className="text-paralyx-accent" />
            <span className="text-sm text-paralyx-text/70 font-body">
              Utilization
            </span>
          </div>
          <span
            className={`font-title font-bold ${getUtilizationColor(
              market.utilizationRate
            )}`}
          >
            {market.utilizationRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              market.utilizationRate < 50
                ? "bg-paralyx-safe"
                : market.utilizationRate < 80
                ? "bg-yellow-500"
                : "bg-paralyx-warning"
            }`}
            style={{ width: `${Math.min(market.utilizationRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setIsSupplyModalOpen(true)}
          className="paralyx-button text-sm py-2"
          disabled={!market.isActive}
        >
          Supply
        </button>
        <button
          onClick={() => setIsBorrowModalOpen(true)}
          className="glass-button text-sm py-2 text-paralyx-text"
          disabled={!market.isActive}
        >
          Borrow
        </button>
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center space-x-2 text-xs text-paralyx-text/60 hover:text-paralyx-text font-body transition-colors"
      >
        <Info size={12} />
        <span>{showDetails ? "Hide" : "Show"} Details</span>
      </button>

      {/* Expandable Details */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-white/10 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-paralyx-text/60 font-body">
              Collateral Factor
            </span>
            <span className="text-xs font-title font-bold text-paralyx-text">
              {(market.collateralFactor * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-paralyx-text/60 font-body">
              Liquidation Threshold
            </span>
            <span className="text-xs font-title font-bold text-paralyx-text">
              {(market.liquidationThreshold * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Shield size={12} className="text-paralyx-primary" />
              <span className="text-xs text-paralyx-text/60 font-body">
                Reserve Factor
              </span>
            </div>
            <span className="text-xs font-title font-bold text-paralyx-text">
              15%
            </span>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <SupplyModal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        market={market}
      />

      <BorrowModal
        isOpen={isBorrowModalOpen}
        onClose={() => setIsBorrowModalOpen(false)}
        market={market}
      />
    </motion.div>
  );
};

export default MarketCard;
