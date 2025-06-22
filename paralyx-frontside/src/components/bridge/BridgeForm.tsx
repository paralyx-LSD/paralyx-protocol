import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowRight,
  Wallet,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import ethLogo from "../../../assets/eth.png";
import usdcLogo from "../../../assets/usdc.png";
import stellarLogo from "../../../assets/stellar.png";

const BridgeForm: React.FC = () => {
  const { isConnected } = useWallet();
  const [fromNetwork, setFromNetwork] = useState<"ethereum" | "stellar">(
    "ethereum"
  );
  const [toNetwork, setToNetwork] = useState<"ethereum" | "stellar">("stellar");
  const [selectedAsset, setSelectedAsset] = useState("stETH");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const assets = [
    {
      symbol: "stETH",
      name: "Lido Staked ETH",
      balance: 2.5,
      bridgeFee: 0.001,
    },
    {
      symbol: "wstETH",
      name: "Wrapped Staked ETH",
      balance: 1.2,
      bridgeFee: 0.001,
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      balance: 0.8,
      bridgeFee: 0.002,
    },
    { symbol: "USDC", name: "USD Coin", balance: 1000, bridgeFee: 5 },
  ];

  const selectedAssetData = assets.find(
    (asset) => asset.symbol === selectedAsset
  );

  const getAssetLogo = (symbol: string) => {
    switch (symbol) {
      case "WETH":
      case "ETH":
      case "stETH":
      case "wstETH":
        return ethLogo;
      case "USDC":
        return usdcLogo;
      default:
        return null;
    }
  };

  const handleSwapNetworks = () => {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  };

  const handleBridge = async () => {
    if (!isConnected || !amount || !selectedAssetData) return;

    setIsProcessing(true);

    // Simulate bridge process
    setTimeout(() => {
      setIsProcessing(false);
      // Show success message or redirect
    }, 3000);
  };

  const estimatedTime =
    fromNetwork === "ethereum" ? "10-15 minutes" : "5-10 minutes";
  const bridgeFee = selectedAssetData?.bridgeFee || 0;

  return (
    <div className="space-y-6">
      {/* Network Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* From Network */}
        <div className="glass-card p-4">
          <div className="text-sm text-paralyx-text/60 font-body mb-2">
            From
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent">
              {fromNetwork === "ethereum" ? (
                <img
                  src={ethLogo}
                  alt="Ethereum"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <img
                  src={stellarLogo}
                  alt="Stellar"
                  className="w-8 h-8 object-contain"
                />
              )}
            </div>
            <div>
              <div className="font-title font-medium text-paralyx-text capitalize">
                {fromNetwork}
              </div>
              <div className="text-xs text-paralyx-text/60 font-body">
                {fromNetwork === "ethereum"
                  ? "Ethereum Mainnet"
                  : "Stellar Network"}
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapNetworks}
            className="glass-button p-3 rounded-full hover:scale-110 transition-transform"
          >
            <ArrowLeftRight size={20} className="text-paralyx-primary" />
          </button>
        </div>

        {/* To Network */}
        <div className="glass-card p-4">
          <div className="text-sm text-paralyx-text/60 font-body mb-2">To</div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent">
              {toNetwork === "ethereum" ? (
                <img
                  src={ethLogo}
                  alt="Ethereum"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <img
                  src={stellarLogo}
                  alt="Stellar"
                  className="w-8 h-8 object-contain"
                />
              )}
            </div>
            <div>
              <div className="font-title font-medium text-paralyx-text capitalize">
                {toNetwork}
              </div>
              <div className="text-xs text-paralyx-text/60 font-body">
                {toNetwork === "ethereum"
                  ? "Ethereum Mainnet"
                  : "Stellar Network"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selection */}
      <div className="glass-card p-6">
        <h4 className="font-title font-medium text-paralyx-text mb-4">
          Select Asset
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => setSelectedAsset(asset.symbol)}
              className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                selectedAsset === asset.symbol
                  ? "border-paralyx-primary bg-paralyx-primary/10"
                  : "border-white/20 hover:border-paralyx-primary/50"
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                {getAssetLogo(asset.symbol) ? (
                  <img
                    src={getAssetLogo(asset.symbol)!}
                    alt={asset.symbol}
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <div className="w-5 h-5 bg-paralyx-primary/20 rounded flex items-center justify-center">
                    <span className="text-xs font-title font-bold text-paralyx-text">
                      {asset.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div className="font-title font-medium text-sm text-paralyx-text">
                  {asset.symbol}
                </div>
              </div>
              <div className="text-xs text-paralyx-text/60 font-body">
                Balance: {asset.balance}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-title font-medium text-paralyx-text">Amount</h4>
          <div className="text-sm text-paralyx-text/60 font-body">
            Balance: {selectedAssetData?.balance || 0} {selectedAsset}
          </div>
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="input-field w-full pr-20"
            step="0.0001"
            min="0"
            max={selectedAssetData?.balance || 0}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={() => setAmount(String(selectedAssetData?.balance || 0))}
              className="text-xs text-paralyx-primary hover:text-paralyx-primary/80 font-body"
            >
              MAX
            </button>
            <span className="text-sm text-paralyx-text/60 font-body">
              {selectedAsset}
            </span>
          </div>
        </div>
      </div>

      {/* Bridge Details */}
      <div className="glass-card p-6">
        <h4 className="font-title font-medium text-paralyx-text mb-4">
          Bridge Details
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              Bridge Fee
            </span>
            <span className="font-title font-medium text-paralyx-text">
              {bridgeFee} {selectedAsset}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              Estimated Time
            </span>
            <span className="font-title font-medium text-paralyx-text">
              {estimatedTime}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              You Will Receive
            </span>
            <span className="font-title font-bold text-paralyx-text">
              {amount ? (parseFloat(amount) - bridgeFee).toFixed(4) : "0.0000"}{" "}
              {selectedAsset}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="glass-card p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle
            size={20}
            className="text-paralyx-warning mt-0.5 flex-shrink-0"
          />
          <div>
            <h4 className="font-title font-medium text-paralyx-text mb-2">
              Important Information
            </h4>
            <ul className="space-y-1 text-sm text-paralyx-text/70 font-body">
              <li>• Bridge transactions are irreversible once initiated</li>
              <li>• Always verify the destination address before confirming</li>
              <li>• Bridge fees may vary based on network congestion</li>
              <li>
                • This is a testnet bridge - do not use real mainnet assets
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bridge Button */}
      <div className="flex justify-center">
        {isConnected ? (
          <button
            onClick={handleBridge}
            disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            className="paralyx-button px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Bridge...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <ArrowLeftRight size={16} />
                <span>Bridge Assets</span>
              </div>
            )}
          </button>
        ) : (
          <div className="flex items-center space-x-2 text-paralyx-text/60 font-body">
            <Wallet size={16} />
            <span>Connect wallet to bridge assets</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BridgeForm;
