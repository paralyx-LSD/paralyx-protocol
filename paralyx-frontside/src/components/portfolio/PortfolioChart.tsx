import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const PortfolioChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock data - replace with real API data
  const generateMockData = () => {
    const points = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    let portfolioValue = 10000; // Starting value
    
    return Array.from({ length: points }, (_, i) => {
      const change = (Math.random() - 0.5) * 500; // Random change
      portfolioValue += change;
      
      return {
        day: timeframe === '7d' ? `Day ${i + 1}` : `${i + 1}`,
        value: Math.max(portfolioValue, 0),
        supplied: portfolioValue * 0.7,
        borrowed: portfolioValue * 0.3,
        timestamp: Date.now() - (points - i) * 86400000
      };
    });
  };

  const data = generateMockData();
  const currentValue = data[data.length - 1]?.value || 0;
  const previousValue = data[0]?.value || 0;
  const change = currentValue - previousValue;
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

  const formatValue = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-body text-sm" style={{ color: entry.color }}>
              {entry.name === 'value' ? 'Portfolio Value' : 
               entry.name === 'supplied' ? 'Supplied' : 'Borrowed'}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <TrendingUp size={20} className="text-paralyx-primary" />
          <h4 className="font-title font-bold text-lg text-paralyx-text">
            Portfolio Value
          </h4>
        </div>
        
        <div className="flex items-center space-x-2">
          {(['7d', '30d', '90d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 text-xs font-body rounded transition-colors ${
                timeframe === period
                  ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                  : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Value Display */}
      <div className="mb-6">
        <div className="font-title font-bold text-2xl text-paralyx-text">
          {formatValue(currentValue)}
        </div>
        <div className={`text-sm font-body ${
          change >= 0 ? 'text-paralyx-safe' : 'text-paralyx-warning'
        }`}>
          {change >= 0 ? '+' : ''}{formatValue(change)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
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
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#FFB6C1" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#FFB6C1', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="supplied" 
              stroke="#98FF98" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="borrowed" 
              stroke="#FFA07A" 
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-xs font-body">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-paralyx-primary"></div>
          <span className="text-paralyx-text/60">Total Value</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-paralyx-safe green-border-glow" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-paralyx-text/60">Supplied</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-0.5 bg-paralyx-warning" style={{ borderTop: '1px dashed' }}></div>
          <span className="text-paralyx-text/60">Borrowed</span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;