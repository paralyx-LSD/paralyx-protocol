import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface MarketData {
  id: string;
  name: string;
  asset: string;
  totalSupply: number;
  isActive: boolean;
}

interface MarketDistributionProps {
  markets: MarketData[];
}

const MarketDistribution: React.FC<MarketDistributionProps> = ({ markets }) => {
  const COLORS = ['#FFB6C1', '#E6E6FA', '#22C55E', '#FFA07A', '#DDA0DD', '#F0E68C'];

  const data = markets
    .filter(market => market.isActive)
    .map((market, index) => ({
      name: market.asset,
      value: market.totalSupply,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 markets

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text">{data.name}</p>
          <p className="font-title font-bold text-paralyx-text">
            ${data.value.toLocaleString()}M ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <PieChartIcon size={20} className="text-paralyx-primary" />
        <h3 className="font-title font-bold text-lg text-paralyx-text">
          Market Distribution
        </h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm font-body text-paralyx-text">{item.name}</span>
            </div>
            <div className="text-sm font-body text-paralyx-text/70">
              {((item.value / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketDistribution;