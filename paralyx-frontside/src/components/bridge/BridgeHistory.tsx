import React from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import stellarLogo from "../../../assets/stellar.png";

interface BridgeTransaction {
  id: string;
  fromNetwork: "ethereum" | "stellar";
  toNetwork: "ethereum" | "stellar";
  asset: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  timestamp: number;
  fromTxHash?: string;
  toTxHash?: string;
  estimatedCompletion?: number;
}

const BridgeHistory: React.FC = () => {
  // Mock data - replace with real API data
  const transactions: BridgeTransaction[] = [
    {
      id: "1",
      fromNetwork: "ethereum",
      toNetwork: "stellar",
      asset: "stETH",
      amount: 2.5,
      status: "completed",
      timestamp: Date.now() - 3600000,
      fromTxHash: "0x123...abc",
      toTxHash: "stellar_tx_456...def",
    },
    {
      id: "2",
      fromNetwork: "stellar",
      toNetwork: "ethereum",
      asset: "USDC",
      amount: 1000,
      status: "processing",
      timestamp: Date.now() - 900000,
      fromTxHash: "stellar_tx_789...ghi",
      estimatedCompletion: Date.now() + 600000,
    },
    {
      id: "3",
      fromNetwork: "ethereum",
      toNetwork: "stellar",
      asset: "WETH",
      amount: 0.8,
      status: "pending",
      timestamp: Date.now() - 300000,
      fromTxHash: "0x456...def",
    },
    {
      id: "4",
      fromNetwork: "ethereum",
      toNetwork: "stellar",
      asset: "wstETH",
      amount: 1.2,
      status: "failed",
      timestamp: Date.now() - 7200000,
      fromTxHash: "0x789...ghi",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "failed":
        return AlertCircle;
      case "processing":
        return ArrowLeftRight;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-paralyx-safe";
      case "failed":
        return "text-paralyx-warning";
      case "processing":
        return "text-paralyx-primary";
      default:
        return "text-yellow-500";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const formatEstimatedTime = (timestamp: number) => {
    const diff = timestamp - Date.now();
    const minutes = Math.floor(diff / 60000);

    if (minutes <= 0) return "Completing soon";
    return `~${minutes}m remaining`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx, index) => {
        const StatusIcon = getStatusIcon(tx.status);

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass-card p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                {/* Network Flow */}
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent">
                    <img
                      src={
                        tx.fromNetwork === "ethereum" ? ethLogo : stellarLogo
                      }
                      alt={
                        tx.fromNetwork === "ethereum" ? "Ethereum" : "Stellar"
                      }
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <ArrowLeftRight size={14} className="text-paralyx-text/40" />
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent">
                    <img
                      src={tx.toNetwork === "ethereum" ? ethLogo : stellarLogo}
                      alt={tx.toNetwork === "ethereum" ? "Ethereum" : "Stellar"}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                </div>

                {/* Transaction Info */}
                <div>
                  <div className="font-title font-medium text-paralyx-text">
                    {tx.amount} {tx.asset}
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    {tx.fromNetwork} → {tx.toNetwork}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <StatusIcon size={16} className={getStatusColor(tx.status)} />
                <span
                  className={`text-sm font-body capitalize ${getStatusColor(
                    tx.status
                  )}`}
                >
                  {tx.status}
                </span>
              </div>
            </div>

            {/* Progress Bar for Processing */}
            {tx.status === "processing" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-paralyx-text/60 font-body">
                    Bridge Progress
                  </span>
                  <span className="text-xs text-paralyx-primary font-body">
                    {tx.estimatedCompletion
                      ? formatEstimatedTime(tx.estimatedCompletion)
                      : "Processing..."}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div
                    className="h-2 bg-paralyx-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 2 }}
                  />
                </div>
              </div>
            )}

            {/* Transaction Hashes */}
            <div className="space-y-2">
              {tx.fromTxHash && (
                <div className="flex items-center justify-between p-2 bg-glass-light rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-paralyx-text/60 font-body">
                      {tx.fromNetwork === "ethereum"
                        ? "Ethereum TX:"
                        : "Stellar TX:"}
                    </span>
                    <span className="text-xs font-body text-paralyx-text">
                      {tx.fromTxHash}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(tx.fromTxHash!)}
                      className="text-paralyx-text/40 hover:text-paralyx-text"
                    >
                      <Copy size={12} />
                    </button>
                    <button className="text-paralyx-text/40 hover:text-paralyx-text">
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              )}

              {tx.toTxHash && (
                <div className="flex items-center justify-between p-2 bg-glass-light rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-paralyx-text/60 font-body">
                      {tx.toNetwork === "ethereum"
                        ? "Ethereum TX:"
                        : "Stellar TX:"}
                    </span>
                    <span className="text-xs font-body text-paralyx-text">
                      {tx.toTxHash}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(tx.toTxHash!)}
                      className="text-paralyx-text/40 hover:text-paralyx-text"
                    >
                      <Copy size={12} />
                    </button>
                    <button className="text-paralyx-text/40 hover:text-paralyx-text">
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <span className="text-xs text-paralyx-text/50 font-body">
                {formatTimeAgo(tx.timestamp)}
              </span>

              {tx.status === "failed" && (
                <button className="text-xs text-paralyx-primary hover:text-paralyx-primary/80 font-body">
                  Retry Bridge
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      {transactions.length === 0 && (
        <div className="text-center py-12">
          <ArrowLeftRight
            size={48}
            className="mx-auto text-paralyx-text/40 mb-4"
          />
          <h3 className="font-title font-bold text-lg text-paralyx-text mb-2">
            No Bridge History
          </h3>
          <p className="text-paralyx-text/60 font-body">
            Your bridge transactions will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default BridgeHistory;
