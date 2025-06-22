import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
  EventLog,
} from "ethers";
import {
  ArrowLeftRight,
  ArrowRight,
  Wallet,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import { getBridgeStatus } from "../../services/api";
import ethLogo from "../../../assets/eth.png";
import stellarLogo from "../../../assets/stellar.png";

const LSD_LOCKBOX_ADDRESS = "0xb8339d7F9F6b81413094AEaEBB75f41009d889bd";
// ABI now reflects the real function name from the contract
const LSD_LOCKBOX_ABI = [
  "function lockAsset(address token, uint256 amount, string calldata stellarAddress) external returns (uint256)",
  "event AssetLocked(address indexed user, address indexed token, uint256 amount, string stellarAddress, string stellarSymbol, uint256 indexed lockId)",
];
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// As per README
const SUPPORTED_ASSETS = [
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    ethereum_address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    decimals: 18,
    bridgeFee: 0.002,
  },
  // Other assets can be added here following the same structure
];

type BridgeStep =
  | "idle"
  | "approving"
  | "processing"
  | "submitted"
  | "confirmed"
  | "failed";

const BridgeForm: React.FC = () => {
  const { isConnected, walletAddress } = useWallet();
  const [fromNetwork] = useState<"ethereum" | "stellar">("ethereum");
  const [toNetwork] = useState<"ethereum" | "stellar">("stellar");
  const [selectedAsset, setSelectedAsset] = useState("WETH");
  const [amount, setAmount] = useState("");
  const [stellarAddress, setStellarAddress] = useState("");
  const [balance, setBalance] = useState("0.0");

  const [bridgeStep, setBridgeStep] = useState<BridgeStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAssetData = SUPPORTED_ASSETS.find(
    (asset) => asset.symbol === selectedAsset
  );

  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletAddress && selectedAssetData && window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const tokenContract = new Contract(
          selectedAssetData.ethereum_address,
          ERC20_ABI,
          provider
        );
        const userBalance = await tokenContract.balanceOf(walletAddress);
        setBalance(formatUnits(userBalance, selectedAssetData.decimals));
      }
    };
    fetchBalance();
  }, [isConnected, walletAddress, selectedAssetData]);

  const getAssetLogo = (symbol: string) => {
    switch (symbol) {
      case "WETH":
      case "stETH":
      case "wstETH":
        return ethLogo;
      default:
        return null;
    }
  };

  const handleBridge = async () => {
    if (
      !isConnected ||
      !amount ||
      !selectedAssetData ||
      !walletAddress ||
      !stellarAddress
    ) {
      setError("Please connect wallet, set amount, and enter a valid Stellar address.");
      return;
    }

    if (!stellarAddress.startsWith("G") || stellarAddress.length !== 56) {
        setError("Invalid Stellar address format. It must start with 'G' and be 56 characters long.");
        return;
    }

    setBridgeStep("processing");
    setError(null);
    setTxHash(null);
    setLockId(null);

    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed.");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tokenContract = new Contract(
        selectedAssetData.ethereum_address,
        ERC20_ABI,
        signer
      );

      const lockboxContract = new Contract(
        LSD_LOCKBOX_ADDRESS,
        LSD_LOCKBOX_ABI,
        signer
      );

      const amountWei = parseUnits(amount, selectedAssetData.decimals);

      // Approve the lockbox to spend the tokens
      const allowance = await tokenContract.allowance(walletAddress, LSD_LOCKBOX_ADDRESS);
      if (allowance < amountWei) {
        setBridgeStep("approving");
        const approveTx = await tokenContract.approve(LSD_LOCKBOX_ADDRESS, amountWei);
        await approveTx.wait();
      }

      setBridgeStep("processing");
      const tx = await lockboxContract.lockAsset(
        selectedAssetData.ethereum_address,
        amountWei,
        stellarAddress
      );

      setTxHash(tx.hash);
      setBridgeStep("submitted");

      const receipt = await tx.wait();

      const lockEvent = receipt.logs?.find(
        (e: EventLog) => e.eventName === "AssetLocked"
      ) as EventLog | undefined;
      
      if (lockEvent?.args?.lockId) {
        const receivedLockId = lockEvent.args.lockId.toString();
        setLockId(receivedLockId);
        pollBridgeStatus(tx.hash); // Poll with tx hash for simplicity
      } else {
        throw new Error("Could not find Lock ID in transaction receipt.");
      }
    } catch (err: any) {
      console.error("Bridge Error:", err);
      setError(err.reason || err.data?.message || err.message || "An unknown error occurred.");
      setBridgeStep("failed");
    }
  };

  const pollBridgeStatus = (ethTxHash: string) => {
    const interval = setInterval(async () => {
      try {
        const statusRes = await getBridgeStatus(ethTxHash);
        if (statusRes.status === 'completed' || statusRes.status === 'minted') {
          setBridgeStep("confirmed");
          clearInterval(interval);
        } else if (statusRes.status === 'failed' || statusRes.status === 'error') {
          setError(statusRes.message || "The bridge transaction failed on the backend.");
          setBridgeStep("failed");
          clearInterval(interval);
        }
        // If still pending, do nothing and wait for the next poll.
      } catch (err) {
        // If API call fails, keep polling for a while
        console.error("Polling error:", err);
      }
    }, 10000); // Poll every 10 seconds

    // Stop polling after 20 minutes to prevent infinite loops
    setTimeout(() => {
        if (bridgeStep !== 'confirmed' && bridgeStep !== 'failed') {
            clearInterval(interval);
            setError("Polling timed out. Please check the bridge status manually.");
            setBridgeStep("failed");
        }
    }, 1200000);
  };
  
  const estimatedTime = "10-15 minutes";
  const bridgeFee = selectedAssetData?.bridgeFee || 0;

  const resetForm = () => {
    setBridgeStep("idle");
    setTxHash(null);
    setError(null);
    setAmount("");
    setLockId(null);
    setStellarAddress("");
  };

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
            onClick={() => {
              // Implement swap logic
            }}
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
          {SUPPORTED_ASSETS.map((asset) => (
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
                Balance: {parseFloat(balance).toFixed(4)}
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
            Balance: {parseFloat(balance).toFixed(4)} {selectedAsset}
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
            max={balance}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <button
              onClick={() => setAmount(balance)}
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

      {/* Stellar Address Input */}
      <div className="glass-card p-6">
        <h4 className="font-title font-medium text-paralyx-text mb-2">Destination</h4>
        <p className="text-xs text-paralyx-text/60 font-body mb-4">Enter the Stellar address that will receive the bridged assets.</p>
        <div className="relative">
          <input
            type="text"
            value={stellarAddress}
            onChange={(e) => setStellarAddress(e.target.value)}
            placeholder="G..."
            className="input-field w-full"
            maxLength={56}
          />
        </div>
      </div>

      {/* Bridge Details */}
      <div className="glass-card p-6">
        <h4 className="font-title font-medium text-paralyx-text mb-4">
          Bridge Details
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between font-body">
            <span className="text-paralyx-text/60">You will receive</span>
            <span className="font-medium text-paralyx-text">
              ~{amount || 0} s{selectedAsset}
            </span>
          </div>
          <div className="flex items-center justify-between font-body">
            <span className="text-paralyx-text/60">Bridge Fee</span>
            <span className="font-medium text-paralyx-text">
              {bridgeFee} ETH
            </span>
          </div>
          <div className="flex items-center justify-between font-body">
            <span className="text-paralyx-text/60">Estimated Time</span>
            <span className="font-medium text-paralyx-text">
              {estimatedTime}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="text-red-400 h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-400 font-title">
                Bridge Failed
              </p>
              <p className="text-sm text-red-400/80 font-body">{error}</p>
            </div>
          </div>
        )}
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

      {/* Action Button */}
      {!isConnected ? (
        <button
          disabled
          className="w-full primary-button-disabled flex items-center justify-center"
        >
          <Wallet className="mr-2" size={20} />
          Connect Wallet to Bridge
        </button>
      ) : (
        <button
          onClick={handleBridge}
          disabled={bridgeStep === "processing" || bridgeStep === "submitted" || bridgeStep === "approving"}
          className="w-full primary-button flex items-center justify-center"
        >
          {bridgeStep === "idle" && (
            <>
              <ArrowRight className="mr-2" size={20} />
              Bridge Assets
            </>
          )}
          {bridgeStep === "approving" && (
            <>
              <Loader2 className="mr-2 animate-spin" size={20} />
              Approving {selectedAsset}...
            </>
          )}
          {(bridgeStep === "processing" || bridgeStep === "submitted") && (
            <>
              <Loader2 className="mr-2 animate-spin" size={20} />
              {bridgeStep === "processing"
                ? "Awaiting Confirmation..."
                : "Processing Bridge..."}
            </>
          )}
          {bridgeStep === "failed" && (
            <>
              <XCircle className="mr-2" size={20} />
              Try Again
            </>
          )}
          {bridgeStep === "confirmed" && (
            <>
              <CheckCircle className="mr-2" size={20} />
              Bridge Successful!
            </>
          )}
        </button>
      )}

      {txHash && (
        <div className="mt-4 p-3 bg-paralyx-primary/10 border border-paralyx-primary/30 rounded-lg text-center">
          <p className="font-body text-sm text-paralyx-text mb-2">
            Ethereum transaction submitted.
          </p>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-paralyx-primary hover:underline inline-flex items-center"
          >
            View on Etherscan <ExternalLink className="ml-2" size={16} />
          </a>
        </div>
      )}

      {bridgeStep === "confirmed" && (
         <div className="mt-4 p-4 text-center glass-card">
          <h3 className="font-title text-lg text-paralyx-text mb-2">Bridge Complete!</h3>
          <p className="font-body text-paralyx-text/80">
            Your assets have been successfully bridged to Stellar.
          </p>
          <button onClick={resetForm} className="mt-4 secondary-button">Start another bridge</button>
        </div>
      )}
    </div>
  );
};

export default BridgeForm;
