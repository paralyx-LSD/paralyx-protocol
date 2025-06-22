import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface TVLAnalyticsProps {
  timeframe: '24h' | '7d' | '30d' | '90d';
}

const TVLAnalytics: React.FC<TVLAnalyticsProps> = ({ timeframe }) => {
  // Mock data - replace with real API data
  const generateMockData = () => {
    const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const baseValue = 125000000; // $125M base TVL
    
    return Array.from({ length: points }, (_, i) => ({
      time: timeframe === '24h' ? `${i}:00` : `Day ${i + 1}`,
      tvl: baseValue + (Math.random() - 0.5) * 10000000 + (i * 500000),
      timestamp: Date.now() - (points - i) * (timeframe === '24h' ? 3600000 : 86400000)
    }));
  };

  const data = generateMockData();

  const formatValue = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text">{label}</p>
          <p className="font-title font-bold text-paralyx-text">
            TVL: {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp size={20} className="text-paralyx-primary" />
          <h3 className="font-title font-bold text-lg text-paralyx-text">
            Total Value Locked
          </h3>
        </div>
        <div className="text-right">
          <div className="font-title font-bold text-xl text-paralyx-text">
            {formatValue(data[data.length - 1]?.tvl || 0)}
          </div>
          <div className="text-xs text-paralyx-safe font-body">
            +12.5% {timeframe}
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="time" 
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
            <Line 
              type="monotone" 
              dataKey="tvl" 
              stroke="#FFB6C1" 
              strokeWidth={2}
              dot={{ fill: '#FFB6C1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#FFB6C1', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TVLAnalytics;