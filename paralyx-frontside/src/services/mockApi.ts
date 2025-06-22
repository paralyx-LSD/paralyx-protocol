// Mock API service to replace backend calls with realistic data
export const mockProtocolData = {
  tvl: 125000000, // $125M
  totalBorrowed: 75000000, // $75M
  utilizationRate: 65.5, // 65.5%
  healthScore: 95, // 95/100
  activeUsers: 12847,
};

export const mockMarkets = [
  {
    id: "eth",
    name: "Ethereum",
    asset: "ETH",
    supplyAPY: 2.34,
    borrowAPY: 4.56,
    totalSupply: 45.89,
    totalBorrow: 23.85,
    utilizationRate: 52.0,
    collateralFactor: 0.8,
    liquidationThreshold: 0.825,
    isActive: true,
  },
  {
    id: "usdc",
    name: "USD Coin",
    asset: "USDC",
    supplyAPY: 1.89,
    borrowAPY: 2.98,
    totalSupply: 35.2,
    totalBorrow: 23.0,
    utilizationRate: 65.3,
    collateralFactor: 0.85,
    liquidationThreshold: 0.875,
    isActive: true,
  },
  {
    id: "steth",
    name: "Staked Ethereum",
    asset: "STETH",
    supplyAPY: 3.24,
    borrowAPY: 4.87,
    totalSupply: 22.8,
    totalBorrow: 12.4,
    utilizationRate: 54.4,
    collateralFactor: 0.78,
    liquidationThreshold: 0.82,
    isActive: true,
  },
  {
    id: "weth",
    name: "Wrapped Ethereum",
    asset: "WETH",
    supplyAPY: 2.45,
    borrowAPY: 3.67,
    totalSupply: 35.6,
    totalBorrow: 24.8,
    utilizationRate: 69.7,
    collateralFactor: 0.82,
    liquidationThreshold: 0.85,
    isActive: true,
  },
  {
    id: "wsteth",
    name: "Wrapped Staked Ethereum",
    asset: "WSTETH",
    supplyAPY: 3.89,
    borrowAPY: 5.12,
    totalSupply: 18.9,
    totalBorrow: 9.7,
    utilizationRate: 51.3,
    collateralFactor: 0.75,
    liquidationThreshold: 0.8,
    isActive: true,
  },
];

export const mockUserPosition = {
  totalSupplied: 15847,
  totalBorrowed: 8395,
  netAPY: 1.45,
  healthFactor: 2.34,
  liquidationRisk: "low" as const,
  positions: [
    {
      market: "ETH",
      supplied: 5.23,
      borrowed: 0,
      suppliedUSD: 8395,
      borrowedUSD: 0,
    },
    {
      market: "USDC",
      supplied: 7453,
      borrowed: 3847,
      suppliedUSD: 7453,
      borrowedUSD: 3847,
    },
    {
      market: "STETH",
      supplied: 1.85,
      borrowed: 0,
      suppliedUSD: 3247,
      borrowedUSD: 0,
    },
    {
      market: "WSTETH",
      supplied: 0.95,
      borrowed: 0.05,
      suppliedUSD: 1852,
      borrowedUSD: 97,
    },
  ],
};

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API functions
export const getProtocolOverview = async () => {
  await delay(300 + Math.random() * 200); // 300-500ms delay
  return mockProtocolData;
};

export const getProtocolHealth = async () => {
  await delay(200 + Math.random() * 100);
  return {
    overallHealth: 0.87,
    liquidationRisk: "low",
    reserves: 0.15,
    utilizationOptimal: true,
  };
};

export const getProtocolStats = async () => {
  await delay(250 + Math.random() * 150);
  return {
    totalUsers: mockProtocolData.activeUsers,
    totalTransactions: 847392,
    averageTransactionSize: 2847.23,
    dailyVolume: 12847392,
  };
};

export const getMarkets = async () => {
  await delay(400 + Math.random() * 200);
  return mockMarkets;
};

export const getMarketDetails = async (marketId: string) => {
  await delay(200 + Math.random() * 100);
  const market = mockMarkets.find((m) => m.id === marketId);
  if (!market) throw new Error("Market not found");
  return {
    ...market,
    priceHistory: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      price: 2000 + Math.sin(i * 0.2) * 200 + Math.random() * 100,
    })),
  };
};

export const getInterestRateHistory = async (
  marketId: string,
  period: string = "7d"
) => {
  await delay(300 + Math.random() * 150);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(
      Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000
    ).toISOString(),
    supplyAPY: 0.02 + Math.sin(i * 0.1) * 0.005 + Math.random() * 0.002,
    borrowAPY: 0.04 + Math.sin(i * 0.1) * 0.008 + Math.random() * 0.003,
  }));
};

export const getRateModel = async (marketId: string) => {
  await delay(200 + Math.random() * 100);
  return {
    baseRate: 0.02,
    multiplier: 0.05,
    jumpMultiplier: 2.5,
    kink: 0.8,
    reserveFactor: 0.15,
  };
};

export const getUserPosition = async (walletAddress: string) => {
  await delay(500 + Math.random() * 300);
  return mockUserPosition;
};

export const getUserHealth = async (walletAddress: string) => {
  await delay(200 + Math.random() * 100);
  return {
    healthFactor: mockUserPosition.healthFactor,
    liquidationRisk: mockUserPosition.liquidationRisk,
    borrowCapacity: 12847.23,
    liquidationPrice: 1847.29,
  };
};

export const getUserTransactions = async (
  walletAddress: string,
  page: number = 1,
  limit: number = 20
) => {
  await delay(400 + Math.random() * 200);
  const transactions = Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
    id: `tx_${Date.now()}_${i}`,
    type: ["supply", "borrow", "repay", "withdraw"][
      Math.floor(Math.random() * 4)
    ],
    asset: ["ETH", "USDC", "WETH", "STETH", "WSTETH"][
      Math.floor(Math.random() * 5)
    ],
    amount: Math.random() * 1000,
    timestamp: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
  }));

  return {
    transactions,
    totalCount: 247,
    page,
    limit,
    hasMore: page * limit < 247,
  };
};

export const getUserBalance = async (walletAddress: string) => {
  await delay(300 + Math.random() * 150);
  return {
    ETH: 12.847,
    USDC: 8394.57,
    WETH: 5.234,
    STETH: 3.847,
    WSTETH: 1.923,
  };
};

export const getBridgeStatus = async (transactionId: string) => {
  await delay(200 + Math.random() * 100);
  return {
    id: transactionId,
    status: ["pending", "confirmed", "completed"][
      Math.floor(Math.random() * 3)
    ],
    fromChain: "ethereum",
    toChain: "polygon",
    amount: Math.random() * 1000,
    asset: "USDC",
    estimatedTime: 300,
    confirmations: Math.floor(Math.random() * 12),
  };
};

export const getBridgeTransactions = async (
  page: number = 1,
  limit: number = 20
) => {
  await delay(400 + Math.random() * 200);
  const transactions = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    id: `bridge_${Date.now()}_${i}`,
    fromChain: "ethereum",
    toChain: "polygon",
    asset: ["USDC", "ETH", "WETH", "STETH", "WSTETH"][
      Math.floor(Math.random() * 5)
    ],
    amount: Math.random() * 1000,
    status: ["pending", "confirmed", "completed"][
      Math.floor(Math.random() * 3)
    ],
    timestamp: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  }));

  return {
    transactions,
    totalCount: 89,
    page,
    limit,
    hasMore: page * limit < 89,
  };
};

export const getBridgeAnalytics = async () => {
  await delay(300 + Math.random() * 150);
  return {
    totalVolume: 12847392,
    totalTransactions: 8394,
    averageTransactionSize: 1529.47,
    popularRoutes: [
      { from: "ethereum", to: "polygon", volume: 5847392 },
      { from: "polygon", to: "ethereum", volume: 3847291 },
      { from: "ethereum", to: "arbitrum", volume: 2847392 },
    ],
  };
};

export const getBridgeFees = async () => {
  await delay(200 + Math.random() * 100);
  return {
    ethereum: { baseFee: 0.005, gasPrice: 25 },
    polygon: { baseFee: 0.001, gasPrice: 30 },
    arbitrum: { baseFee: 0.002, gasPrice: 0.5 },
  };
};

export const simulateSupply = async (
  marketId: string,
  amount: number,
  walletAddress: string
) => {
  await delay(500 + Math.random() * 300);
  return {
    newHealthFactor: mockUserPosition.healthFactor + 0.1,
    newSupplyAPY: 0.0234,
    estimatedGas: 150000,
    gasCost: 0.005,
  };
};

export const simulateBorrow = async (
  marketId: string,
  amount: number,
  walletAddress: string
) => {
  await delay(500 + Math.random() * 300);
  return {
    newHealthFactor: Math.max(1.1, mockUserPosition.healthFactor - 0.2),
    newBorrowAPY: 0.0456,
    estimatedGas: 180000,
    gasCost: 0.006,
  };
};

export const simulateRepay = async (
  marketId: string,
  amount: number,
  walletAddress: string
) => {
  await delay(500 + Math.random() * 300);
  return {
    newHealthFactor: mockUserPosition.healthFactor + 0.15,
    interestSaved: (amount * 0.0456) / 365,
    estimatedGas: 120000,
    gasCost: 0.004,
  };
};

export const simulateWithdraw = async (
  marketId: string,
  amount: number,
  walletAddress: string
) => {
  await delay(500 + Math.random() * 300);
  return {
    newHealthFactor: Math.max(1.1, mockUserPosition.healthFactor - 0.05),
    interestLost: (amount * 0.0234) / 365,
    estimatedGas: 140000,
    gasCost: 0.0045,
  };
};

export const getHistoricalData = async (
  metric: string,
  period: string = "30d"
) => {
  await delay(400 + Math.random() * 200);
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(
      Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000
    ).toISOString(),
    value:
      2000000000 + Math.sin(i * 0.1) * 200000000 + Math.random() * 100000000,
  }));
};

export const getVolumeAnalytics = async () => {
  await delay(300 + Math.random() * 150);
  return {
    dailyVolume: 12847392,
    weeklyVolume: 89847392,
    monthlyVolume: 384729384,
    volumeByAsset: {
      USDC: 5847392,
      ETH: 3847291,
      WETH: 2847392,
      STETH: 1847392,
      WSTETH: 947392,
    },
  };
};

export const getUserAnalytics = async () => {
  await delay(300 + Math.random() * 150);
  return {
    totalUsers: mockProtocolData.activeUsers,
    activeUsers: Math.floor(mockProtocolData.activeUsers * 0.7),
    newUsers: Math.floor(mockProtocolData.activeUsers * 0.05),
    userGrowthRate: 0.15,
  };
};
