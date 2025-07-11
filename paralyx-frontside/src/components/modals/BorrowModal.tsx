import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Info,
  Loader2,
  Shield,
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

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: MarketData;
}

const BorrowModal: React.FC<BorrowModalProps> = ({
  isOpen,
  onClose,
  market,
}) => {
  const { isConnected, walletAddress, borrowTokens, getTokenBalance, getAccountInfo, getAssetPrice } = useWallet();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [borrowingPower, setBorrowingPower] = useState(0);
  const [currentDebt, setCurrentDebt] = useState(0);
  const [assetPrice, setAssetPrice] = useState(1);
  const [userCollateral, setUserCollateral] = useState(0);
  const [healthFactor, setHealthFactor] = useState(0);

  // Fetch real user account info on component mount
  React.useEffect(() => {
    const fetchAccountInfo = async () => {
      if (isConnected && walletAddress) {
        try {
          const accountInfo = await getAccountInfo();
          setUserCollateral(accountInfo.totalSupplied);
          setCurrentDebt(accountInfo.totalBorrowed);
          setHealthFactor(accountInfo.healthFactor);
          setBorrowingPower(accountInfo.totalSupplied * market.collateralFactor);
          
          // Fetch asset price from oracle
          try {
            const price = await getAssetPrice(market.asset);
            setAssetPrice(price);
          } catch (priceError) {
            console.warn('Could not fetch asset price:', priceError);
            // Fallback prices
            const fallbackPrices: Record<string, number> = {
              ETH: 2269.42,
              WETH: 2269.42,
              USDC: 1,
                              STETH: 2269.42,
                              WSTETH: 2420.15,
            };
            setAssetPrice(fallbackPrices[market.asset] || 1);
          }
        } catch (error) {
          console.error('Error fetching account info:', error);
          setBorrowingPower(0);
          setCurrentDebt(0);
          setUserCollateral(0);
          setHealthFactor(0);
        }
      }
    };
    
    fetchAccountInfo();
  }, [isConnected, walletAddress, getAccountInfo, market.asset, market.collateralFactor]);

  const borrowLimit = borrowingPower;
  const availableToBorrow = Math.max(0, borrowLimit - currentDebt);
  const maxBorrowAmount = availableToBorrow / assetPrice;

  const handleBorrow = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const borrowAmount = parseFloat(amount);
    if (borrowAmount > availableToBorrow) {
      toast.error("Amount exceeds borrowing capacity");
      return;
    }

    setIsProcessing(true);

    try {
      // Real Stellar contract interaction
      const txHash = await borrowTokens(borrowAmount, market.asset);
      
      toast.success(`Successfully borrowed ${amount} ${market.asset}. Tx: ${txHash.slice(0, 8)}...`);
      onClose();
      setAmount("");
      
      // Refresh account info after successful borrow
      const accountInfo = await getAccountInfo();
      setBorrowingPower(accountInfo.totalSupplied * market.collateralFactor);
      setCurrentDebt(accountInfo.totalBorrowed);
    } catch (error: any) {
      console.error('Borrow error:', error);
      toast.error(error.message || "Borrow failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    setAmount(maxBorrowAmount.toFixed(6));
  };

  const borrowValue = parseFloat(amount || "0") * assetPrice;
  const newHealthFactor = userCollateral / (currentDebt + borrowValue + 1);
  const dailyInterest =
    (parseFloat(amount || "0") * (market.borrowAPY / 100)) / 365;

  const getHealthFactorColor = (hf: number) => {
    if (hf > 2) return "text-paralyx-safe";
    if (hf > 1.5) return "text-yellow-500";
    return "text-paralyx-warning";
  };

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
                <div className="w-10 h-10 bg-paralyx-primary/20 rounded-xl flex items-center justify-center">
                  <TrendingDown size={20} className="text-paralyx-primary" />
                </div>
                <div>
                  <h2 className="font-title font-bold text-xl text-paralyx-text">
                    Borrow {market.asset}
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
              <div className="text-center p-3 bg-paralyx-primary/10 rounded-lg border border-paralyx-primary/20">
                <div className="text-xs text-paralyx-text/60 font-body mb-1">
                  Borrow APY
                </div>
                <div className="font-title font-bold text-lg text-paralyx-primary">
                  {market.borrowAPY.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-3 bg-glass-light rounded-lg border border-white/10">
                <div className="text-xs text-paralyx-text/60 font-body mb-1">
                  Available
                </div>
                <div className="font-title font-bold text-lg text-paralyx-text">
                  {maxBorrowAmount.toFixed(4)} {market.asset}
                </div>
              </div>
            </div>

            {/* Borrow Capacity */}
            <div className="mb-6 p-4 bg-glass-light rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-body text-paralyx-text/70">
                  Borrow Capacity
                </span>
                <span className="text-sm font-title font-medium text-paralyx-text">
                  ${(currentDebt + borrowValue).toFixed(0)} / $
                  {borrowLimit.toFixed(0)}
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    (currentDebt + borrowValue) / borrowLimit > 0.8
                      ? "bg-paralyx-warning"
                      : (currentDebt + borrowValue) / borrowLimit > 0.6
                      ? "bg-yellow-500"
                      : "bg-paralyx-primary"
                  }`}
                  style={{
                    width: `${Math.min(
                      ((currentDebt + borrowValue) / borrowLimit) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-body text-paralyx-text/70 mb-2">
                Amount to Borrow
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
                  max={maxBorrowAmount}
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
                      Borrow Amount
                    </span>
                    <span className="font-title font-medium text-paralyx-text">
                      {parseFloat(amount).toFixed(4)} {market.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paralyx-text/60 font-body">
                      Daily Interest
                    </span>
                    <span className="font-title font-medium text-paralyx-primary">
                      -{dailyInterest.toFixed(6)} {market.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paralyx-text/60 font-body">
                      New Health Factor
                    </span>
                    <span
                      className={`font-title font-medium ${getHealthFactorColor(
                        newHealthFactor
                      )}`}
                    >
                      {newHealthFactor.toFixed(2)}
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
                    Borrowed assets must be repaid with interest.
                  </p>
                  <p>Keep your health factor above 1.0 to avoid liquidation.</p>
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
                onClick={handleBorrow}
                disabled={
                  !isConnected ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > maxBorrowAmount ||
                  isProcessing
                }
                className="flex-1 paralyx-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Borrowing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <TrendingDown size={16} />
                    <span>Borrow {market.asset}</span>
                  </div>
                )}
              </button>
            </div>

            {!isConnected && (
              <div className="mt-4 flex items-center justify-center space-x-2 text-paralyx-text/60 font-body text-sm">
                <Wallet size={16} />
                <span>Connect wallet to borrow assets</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BorrowModal;
