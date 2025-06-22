import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import toast from "react-hot-toast";

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

interface SupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: MarketData;
}

const SupplyModal: React.FC<SupplyModalProps> = ({
  isOpen,
  onClose,
  market,
}) => {
  const { isConnected, walletAddress, supplyTokens, getTokenBalance, getAccountInfo } = useWallet();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Fetch real user balance on component mount
  React.useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletAddress) {
        try {
          const balance = await getTokenBalance(market.asset);
          setUserBalance(balance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setUserBalance(0);
        }
      }
    };
    
    fetchBalance();
  }, [isConnected, walletAddress, market.asset, getTokenBalance]);

  const handleSupply = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > userBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsProcessing(true);

    try {
      // Real Stellar contract interaction
      const txHash = await supplyTokens(parseFloat(amount), market.asset);
      
      toast.success(`Successfully supplied ${amount} ${market.asset}. Tx: ${txHash.slice(0, 8)}...`);
      onClose();
      setAmount("");
      
      // Refresh balance after successful supply
      const newBalance = await getTokenBalance(market.asset);
      setUserBalance(newBalance);
    } catch (error: any) {
      console.error('Supply error:', error);
      toast.error(error.message || "Supply failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(userBalance.toString());
  };

  const estimatedEarnings =
    (parseFloat(amount || "0") * (market.supplyAPY / 100)) / 365;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-card p-6 w-full max-w-md backdrop-blur-3xl border border-white/20"
            style={{ backgroundColor: "#e9bded" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-paralyx-safe/20 rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-paralyx-safe" />
                </div>
                <div>
                  <h2 className="font-title font-bold text-xl text-paralyx-text">
                    Supply {market.asset}
                  </h2>
                  <p className="text-sm text-paralyx-text/60 font-body">
                    {market.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="glass-button p-2 hover:bg-glass-medium"
              >
                <X size={20} className="text-paralyx-text/60" />
              </button>
            </div>

            {/* Market Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 bg-paralyx-safe/10 rounded-lg border border-paralyx-safe/20">
                <div className="text-xs text-paralyx-text/60 font-body mb-1">
                  Supply APY
                </div>
                <div className="font-title font-bold text-lg text-paralyx-safe">
                  {market.supplyAPY.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-3 bg-glass-light rounded-lg border border-white/10">
                <div className="text-xs text-paralyx-text/60 font-body mb-1">
                  Your Balance
                </div>
                <div className="font-title font-bold text-lg text-paralyx-text">
                  {userBalance.toFixed(4)} {market.asset}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-body text-paralyx-text/70 mb-2">
                Amount to Supply
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="input-field pr-20"
                  step="0.0001"
                  min="0"
                  max={userBalance}
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-paralyx-primary hover:text-paralyx-primary/80 font-body"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Transaction Summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="mb-6 p-4 bg-glass-light rounded-lg border border-white/10">
                <h4 className="font-title font-medium text-paralyx-text mb-3">
                  Transaction Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-paralyx-text/60 font-body">
                      Supply Amount
                    </span>
                    <span className="font-title font-medium text-paralyx-text">
                      {parseFloat(amount).toFixed(4)} {market.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paralyx-text/60 font-body">
                      Daily Earnings
                    </span>
                    <span className="font-title font-medium text-paralyx-safe">
                      +{estimatedEarnings.toFixed(6)} {market.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paralyx-text/60 font-body">
                      Collateral Factor
                    </span>
                    <span className="font-title font-medium text-paralyx-text">
                      {(market.collateralFactor * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="mb-6 p-3 bg-paralyx-warning/10 rounded-lg border border-paralyx-warning/30">
              <div className="flex items-start space-x-2">
                <AlertTriangle
                  size={16}
                  className="text-paralyx-warning mt-0.5 flex-shrink-0"
                />
                <div className="text-xs text-paralyx-text/70 font-body">
                  <p className="mb-1">
                    Supplied assets can be used as collateral for borrowing.
                  </p>
                  <p>
                    Interest is earned continuously and compounds automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 glass-button py-3 text-paralyx-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSupply}
                disabled={
                  !isConnected ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > userBalance ||
                  isProcessing
                }
                className="flex-1 paralyx-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Supplying...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <TrendingUp size={16} />
                    <span>Supply {market.asset}</span>
                  </div>
                )}
              </button>
            </div>

            {!isConnected && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-paralyx-text/60 font-body text-sm">
                <Wallet size={16} />
                <span>Connect wallet to supply assets</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SupplyModal;
