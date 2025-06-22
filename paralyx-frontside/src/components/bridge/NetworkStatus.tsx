import React from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import stellarLogo from "../../../assets/stellar.png";

const NetworkStatus: React.FC = () => {
  // Mock data - replace with real API data
  const networks = [
    {
      name: "Ethereum",
      status: "operational",
      latency: 12,
      gasPrice: 25,
      lastBlock: 18500000,
      bridgeContract: "0x123...abc",
    },
    {
      name: "Stellar",
      status: "operational",
      latency: 5,
      gasPrice: 0.00001,
      lastBlock: 45600000,
      bridgeContract: "GBEX...STELLAR",
    },
  ];

  const bridgeStatus = {
    status: "operational",
    totalLocked: 125000000,
    dailyVolume: 2500000,
    avgProcessingTime: 12.5,
    successRate: 99.2,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return CheckCircle;
      case "degraded":
        return AlertTriangle;
      case "maintenance":
        return Clock;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-paralyx-safe";
      case "degraded":
        return "text-yellow-500";
      case "maintenance":
        return "text-paralyx-warning";
      default:
        return "text-paralyx-text/60";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-paralyx-safe/10 border-paralyx-safe/30";
      case "degraded":
        return "bg-yellow-400/10 border-yellow-400/30";
      case "maintenance":
        return "bg-paralyx-warning/10 border-paralyx-warning/30";
      default:
        return "bg-white/5 border-white/20";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Network Status Cards */}
      {networks.map((network, index) => {
        const StatusIcon = getStatusIcon(network.status);

        return (
          <motion.div
            key={network.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent">
                  {network.name === "Ethereum" ? (
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
                <h3 className="font-title font-bold text-lg text-paralyx-text">
                  {network.name}
                </h3>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-body border ${getStatusBg(
                  network.status
                )}`}
              >
                <div className="flex items-center space-x-1">
                  <StatusIcon
                    size={12}
                    className={getStatusColor(network.status)}
                  />
                  <span className={getStatusColor(network.status)}>
                    {network.status === "operational"
                      ? "Operational"
                      : network.status === "degraded"
                      ? "Degraded"
                      : "Maintenance"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-paralyx-text/70 font-body">
                  Latency
                </span>
                <span className="font-title font-bold text-paralyx-text">
                  {network.latency}s
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-paralyx-text/70 font-body">
                  {network.name === "Ethereum" ? "Gas Price" : "Base Fee"}
                </span>
                <span className="font-title font-bold text-paralyx-text">
                  {network.gasPrice}{" "}
                  {network.name === "Ethereum" ? "gwei" : "XLM"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-paralyx-text/70 font-body">
                  Latest Block
                </span>
                <span className="font-title font-bold text-paralyx-text">
                  {network.lastBlock.toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10">
                <div className="text-xs text-paralyx-text/50 font-body">
                  Bridge Contract
                </div>
                <div className="text-xs text-paralyx-text font-body mt-1">
                  {network.bridgeContract}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Bridge Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity size={20} className="text-paralyx-primary" />
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              Bridge Status
            </h3>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-body border ${getStatusBg(
              bridgeStatus.status
            )}`}
          >
            <div className="flex items-center space-x-1">
              <CheckCircle size={12} className="text-paralyx-safe" />
              <span className="text-paralyx-safe">Active</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              Total Locked
            </span>
            <span className="font-title font-bold text-paralyx-text">
              ${(bridgeStatus.totalLocked / 1000000).toFixed(1)}M
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              24h Volume
            </span>
            <span className="font-title font-bold text-paralyx-text">
              ${(bridgeStatus.dailyVolume / 1000000).toFixed(1)}M
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              Avg Time
            </span>
            <span className="font-title font-bold text-paralyx-text">
              {bridgeStatus.avgProcessingTime}min
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-paralyx-text/70 font-body">
              Success Rate
            </span>
            <span className="font-title font-bold text-paralyx-safe">
              {bridgeStatus.successRate}%
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NetworkStatus;
