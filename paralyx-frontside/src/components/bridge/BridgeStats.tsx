import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, DollarSign, Activity, Clock } from "lucide-react";
import ethLogo from "../../../assets/eth.png";
import usdcLogo from "../../../assets/usdc.png";

const BridgeStats: React.FC = () => {
  const getAssetLogo = (symbol: string) => {
    switch (symbol) {
      case "WETH":
      case "ETH":
      case "STETH":
      case "WSTETH":
      case "stETH":
      case "wstETH":
        return ethLogo;
      case "USDC":
        return usdcLogo;
      default:
        return null;
    }
  };

  // Mock data - replace with real API data
  const volumeData = Array.from({ length: 7 }, (_, i) => ({
    day: `Day ${i + 1}`,
    ethereum_to_stellar: Math.random() * 1000000 + 500000,
    stellar_to_ethereum: Math.random() * 800000 + 300000,
  }));

  const assetDistribution = [
    { name: "stETH", value: 45, color: "#FFB6C1" },
    { name: "wstETH", value: 25, color: "#E6E6FA" },
    { name: "WETH", value: 20, color: "#98FF98" },
    { name: "USDC", value: 10, color: "#FFA07A" },
  ];

  const stats = [
    {
      name: "Total Volume (7D)",
      value: 12500000,
      change: "+15.3%",
      icon: DollarSign,
      prefix: "$",
      suffix: "M",
    },
    {
      name: "Total Transactions",
      value: 1247,
      change: "+8.7%",
      icon: Activity,
      suffix: "",
    },
    {
      name: "Avg Processing Time",
      value: 12.5,
      change: "-2.1%",
      icon: Clock,
      suffix: "min",
    },
    {
      name: "Success Rate",
      value: 99.2,
      change: "+0.1%",
      icon: TrendingUp,
      suffix: "%",
    },
  ];

  const formatValue = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="font-body text-sm"
              style={{ color: entry.color }}
            >
              {entry.dataKey === "ethereum_to_stellar"
                ? "ETH → Stellar"
                : "Stellar → ETH"}
              : {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text">{data.name}</p>
          <p className="font-title font-bold text-paralyx-text">
            {data.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-paralyx-primary/10 rounded-lg">
                  <Icon size={20} className="text-paralyx-primary" />
                </div>
                <div
                  className={`text-xs font-body ${
                    stat.change.startsWith("+")
                      ? "text-paralyx-safe"
                      : "text-paralyx-warning"
                  }`}
                >
                  {stat.change}
                </div>
              </div>
              <div className="mb-1">
                <span className="font-title font-bold text-2xl text-paralyx-text">
                  {stat.prefix}
                  {stat.value.toLocaleString()}
                  {stat.suffix}
                </span>
              </div>
              <div className="text-sm text-paralyx-text/60 font-body">
                {stat.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <TrendingUp size={20} className="text-paralyx-primary" />
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              Bridge Volume (7D)
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.1)"
                />
                <XAxis
                  dataKey="day"
                  stroke="#4B4242"
                  fontSize={12}
                  fontFamily="Inconsolata"
                />
                <YAxis
                  tickFormatter={formatValue}
                  stroke="#4B4242"
                  fontSize={12}
                  fontFamily="Inconsolata"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="ethereum_to_stellar"
                  fill="#FFB6C1"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="stellar_to_ethereum"
                  fill="#E6E6FA"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center space-x-6 mt-4 text-xs font-body">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-paralyx-primary rounded-full"></div>
              <span className="text-paralyx-text/60">ETH → Stellar</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-paralyx-accent rounded-full"></div>
              <span className="text-paralyx-text/60">Stellar → ETH</span>
            </div>
          </div>
        </div>

        {/* Asset Distribution */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Activity size={20} className="text-paralyx-primary" />
            <h3 className="font-title font-bold text-lg text-paralyx-text">
              Asset Distribution
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {assetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {assetDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center bg-transparent">
                    {getAssetLogo(item.name) ? (
                      <img
                        src={getAssetLogo(item.name)!}
                        alt={item.name}
                        className="w-4 h-4 object-contain"
                      />
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                    )}
                  </div>
                  <span className="text-sm font-body text-paralyx-text">
                    {item.name}
                  </span>
                </div>
                <div className="text-sm font-body text-paralyx-text/70">
                  {item.value}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bridge Activity */}
      <div className="glass-card p-6">
        <h3 className="font-title font-bold text-lg text-paralyx-text mb-6">
          Recent Bridge Activity
        </h3>

        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-glass-light rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-paralyx-primary/20 rounded-lg flex items-center justify-center">
                  {getAssetLogo(["stETH", "WETH", "USDC", "wstETH"][i % 4]) ? (
                    <img
                      src={
                        getAssetLogo(
                          ["stETH", "WETH", "USDC", "wstETH"][i % 4]
                        )!
                      }
                      alt={["stETH", "WETH", "USDC", "wstETH"][i % 4]}
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <span className="text-xs font-title font-bold text-paralyx-text">
                      {["stETH", "WETH", "USDC", "wstETH"][i % 4]}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-title font-medium text-sm text-paralyx-text">
                    {(Math.random() * 10).toFixed(2)}{" "}
                    {["stETH", "WETH", "USDC", "wstETH"][i % 4]}
                  </div>
                  <div className="text-xs text-paralyx-text/60 font-body">
                    {Math.random() > 0.5
                      ? "Ethereum → Stellar"
                      : "Stellar → Ethereum"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-title font-bold text-sm text-paralyx-safe">
                  Completed
                </div>
                <div className="text-xs text-paralyx-text/60 font-body">
                  {Math.floor(Math.random() * 60)}m ago
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BridgeStats;
