import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface VolumeChartProps {
  timeframe: '24h' | '7d' | '30d' | '90d';
}

const VolumeChart: React.FC<VolumeChartProps> = ({ timeframe }) => {
  // Mock data - replace with real API data
  const generateMockData = () => {
    const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    
    return Array.from({ length: points }, (_, i) => ({
      time: timeframe === '24h' ? `${i}:00` : `Day ${i + 1}`,
      supply: Math.random() * 5000000 + 1000000,
      borrow: Math.random() * 3000000 + 500000,
      bridge: Math.random() * 1000000 + 100000,
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
          <p className="font-body text-sm text-paralyx-text mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-body text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 size={20} className="text-paralyx-primary" />
          <h3 className="font-title font-bold text-lg text-paralyx-text">
            Trading Volume
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-xs font-body">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-paralyx-primary rounded-full"></div>
            <span className="text-paralyx-text/60">Supply</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-paralyx-accent rounded-full"></div>
            <span className="text-paralyx-text/60">Borrow</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-paralyx-safe rounded-full"></div>
            <span className="text-paralyx-text/60">Bridge</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
            <Bar dataKey="supply" fill="#FFB6C1" radius={[2, 2, 0, 0]} />
            <Bar dataKey="borrow" fill="#E6E6FA" radius={[2, 2, 0, 0]} />
            <Bar dataKey="bridge" fill="#22C55E" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;