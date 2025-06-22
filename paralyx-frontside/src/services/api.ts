import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_API_KEY; // Optional API key

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY })
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: AxiosError) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Retry mechanism with exponential backoff
const retryRequest = async (originalRequest: any, retryCount: number = 0): Promise<any> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  if (retryCount >= maxRetries) {
    throw new Error('Maximum retry attempts reached');
  }
  
  const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    return await api.request(originalRequest);
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log(`Retry attempt ${retryCount + 1}/${maxRetries} in ${delay}ms...`);
      return retryRequest(originalRequest, retryCount + 1);
    }
    throw error;
  }
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle rate limiting with retry
    if (error.response?.status === 429) {
      console.warn('Rate limited - implementing retry with exponential backoff');
      try {
        return await retryRequest(error.config);
      } catch (retryError) {
        throw new Error('Rate limit exceeded - please wait a few minutes before trying again');
      }
    }
    
    // Handle specific error cases
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      console.error('Backend connection failed. Please ensure API server is running on localhost:3001');
      throw new Error('Cannot connect to API server - please check if the backend is running on localhost:3001');
    } else if (error.response?.status === 404) {
      throw new Error('API endpoint not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error - please try again later');
    } else if (error.response?.status === 400) {
      const errorData = error.response.data as any;
      throw new Error(errorData?.message || 'Bad request');
    } else if (!error.response) {
      // Network errors, CORS, etc.
      throw new Error('Network error - please check your connection and try again');
    }
    
    throw error;
  }
);

// Protocol API calls
export const getProtocolOverview = async () => {
  const response = await api.get('/api/protocol/overview');
  return {
    tvl: response.data.liquidity.totalValueLocked || 0,
    totalBorrowed: response.data.liquidity.totalBorrowed || 0,
    utilizationRate: response.data.liquidity.utilizationPercentage || 0,
    healthScore: Math.round((100 - (response.data.liquidity.utilizationPercentage || 0)) * 0.95), // Calculated health score
    activeUsers: response.data.markets[0]?.totalSupply || 0 // Approximate active users
  };
};

export const getProtocolHealth = async () => {
  const response = await api.get('/api/protocol/health');
  return {
    overallHealth: response.data.score / 100,
    liquidationRisk: response.data.status === 'healthy' ? 'low' : 'medium',
    reserves: response.data.metrics.liquidity.ratio / 100,
    utilizationOptimal: response.data.metrics.utilization.current < response.data.metrics.utilization.optimal
  };
};

export const getProtocolStats = async () => {
  const response = await api.get('/api/protocol/stats');
  return {
    totalUsers: Math.floor(response.data.totalSupply / 10), // Approximate users
    totalTransactions: Math.floor(response.data.totalSupply * 50), // Approximate transactions
    averageTransactionSize: response.data.totalSupply / 100,
    dailyVolume: response.data.totalSupply * 0.1
  };
};

// Market API calls
export const getMarkets = async () => {
  const response = await api.get('/api/markets');
  const { rates, prices } = response.data;
  
  // Transform the rates object into an array of market objects
  const assets = ['XLM', 'stETH', 'USDC'];
  return assets.map((asset, index) => {
    const rateData = rates.rates[asset];
    const price = prices.prices[asset];
    
    return {
      id: asset.toLowerCase(),
      name: asset === 'stETH' ? 'Lido Staked ETH' : asset === 'XLM' ? 'Stellar Lumens' : 'USD Coin',
      asset: asset,
      supplyAPY: rateData.supplyAPY,
      borrowAPY: rateData.borrowAPY,
      totalSupply: rateData.totalSupplied,
      totalBorrow: rateData.totalBorrowed,
      utilizationRate: rateData.utilizationRate,
      collateralFactor: asset === 'XLM' ? 0.75 : asset === 'stETH' ? 0.8 : 0.85, // Default collateral factors
      liquidationThreshold: asset === 'XLM' ? 0.8 : asset === 'stETH' ? 0.85 : 0.9, // Default liquidation thresholds
      isActive: true,
      price: price / 10000000, // Convert from Stellar stroop format
      availableLiquidity: rateData.availableLiquidity
    };
  });
};

export const getMarketDetails = async (marketId: string) => {
  const response = await api.get(`/api/markets/${marketId}`);
  const market = response.data;
  
  return {
    ...market,
    priceHistory: generateMockPriceHistory() // TODO: Implement real price history API
  };
};

// Interest rate API calls
export const getInterestRateHistory = async (marketId: string, period: string = '7d') => {
  const response = await api.get(`/api/rates/history?market=${marketId}&period=${period}`);
  return response.data.rates || [];
};

export const getRateModel = async (marketId: string) => {
  const response = await api.get(`/api/rates/model?market=${marketId}`);
  return response.data;
};

// User API calls
export const getUserPosition = async (walletAddress: string) => {
  try {
    // Backend expects 56-character Stellar addresses, not Ethereum addresses
    // If we get an Ethereum address, return empty position
    if (!walletAddress || walletAddress.length !== 56 || !walletAddress.startsWith('G')) {
      return {
        totalSupplied: 0,
        totalBorrowed: 0,
        netAPY: 0,
        healthFactor: 0,
        liquidationRisk: 'low' as const,
        positions: []
      };
    }
    
    const response = await api.get(`/api/user/${walletAddress}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404 || error.response?.status === 400) {
      // Return default empty position for new users or invalid addresses
      return {
        totalSupplied: 0,
        totalBorrowed: 0,
        netAPY: 0,
        healthFactor: 0,
        liquidationRisk: 'low' as const,
        positions: []
      };
    }
    throw error;
  }
};

export const getUserHealth = async (walletAddress: string) => {
  const response = await api.get(`/api/user/${walletAddress}/health`);
  return response.data;
};

export const getUserTransactions = async (walletAddress: string, page: number = 1, limit: number = 20) => {
  const response = await api.get(`/api/user/${walletAddress}/transactions?page=${page}&limit=${limit}`);
  return response.data;
};

export const getUserBalance = async (walletAddress: string) => {
  const response = await api.get(`/api/user/${walletAddress}/balance`);
  return response.data;
};

// Bridge API calls
export const getBridgeStatus = async (transactionId?: string) => {
  const url = transactionId ? `/api/bridge/status?txId=${transactionId}` : '/api/bridge/status';
  const response = await api.get(url);
  return response.data;
};

export const getBridgeTransactions = async (page: number = 1, limit: number = 20) => {
  const response = await api.get(`/api/bridge/transactions?page=${page}&limit=${limit}`);
  return response.data;
};

export const getBridgeAnalytics = async () => {
  const response = await api.get('/api/bridge/analytics');
  return response.data;
};

export const getBridgeFees = async () => {
  const response = await api.get('/api/bridge/fees');
  return response.data;
};

// Simulation API calls (for transaction previews)
export const simulateSupply = async (marketId: string, amount: number, walletAddress: string) => {
  const response = await api.post('/api/simulate/supply', {
    marketId,
    amount,
    walletAddress
  });
  return response.data;
};

export const simulateBorrow = async (marketId: string, amount: number, walletAddress: string) => {
  const response = await api.post('/api/simulate/borrow', {
    marketId,
    amount,
    walletAddress
  });
  return response.data;
};

export const simulateRepay = async (marketId: string, amount: number, walletAddress: string) => {
  const response = await api.post('/api/simulate/repay', {
    marketId,
    amount,
    walletAddress
  });
  return response.data;
};

export const simulateWithdraw = async (marketId: string, amount: number, walletAddress: string) => {
  const response = await api.post('/api/simulate/withdraw', {
    marketId,
    amount,
    walletAddress
  });
  return response.data;
};

// Analytics API calls
export const getHistoricalData = async (metric: string, period: string = '30d') => {
  const response = await api.get(`/api/analytics/historical?metric=${metric}&period=${period}`);
  return response.data;
};

export const getVolumeAnalytics = async () => {
  const response = await api.get('/api/analytics/volume');
  return response.data;
};

export const getUserAnalytics = async () => {
  const response = await api.get('/api/analytics/users');
  return response.data;
};


function generateMockPriceHistory() {
  const basePrice = 2269.42; // Current wETH price
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
    price: basePrice + Math.sin(i * 0.2) * 100 + Math.random() * 50,
  }));
}

// Health check function
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw new Error('Backend is not available');
  }
};