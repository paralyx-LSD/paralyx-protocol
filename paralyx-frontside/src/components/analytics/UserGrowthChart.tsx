import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';

interface UserGrowthChartProps {
  timeframe: '24h' | '7d' | '30d' | '90d';
}

const UserGrowthChart: React.FC<UserGrowthChartProps> = ({ timeframe }) => {
  // Mock data - replace with real API data
  const generateMockData = () => {
    const points = timeframe === '24h' ? 24 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    let cumulativeUsers = 1000;
    
    return Array.from({ length: points }, (_, i) => {
      const newUsers = Math.floor(Math.random() * 50) + 10;
      cumulativeUsers += newUsers;
      
      return {
        time: timeframe === '24h' ? `${i}:00` : `Day ${i + 1}`,
        totalUsers: cumulativeUsers,
        newUsers: newUsers,
        activeUsers: Math.floor(cumulativeUsers * 0.3) + Math.floor(Math.random() * 100)
      };
    });
  };

  const data = generateMockData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="font-body text-sm text-paralyx-text mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="font-body text-sm" style={{ color: entry.color }}>
              {entry.name === 'totalUsers' ? 'Total Users' : 
               entry.name === 'activeUsers' ? 'Active Users' : 'New Users'}: {entry.value.toLocaleString()}
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
          <Users size={20} className="text-paralyx-primary" />
          <h3 className="font-title font-bold text-lg text-paralyx-text">
            User Growth
          </h3>
        </div>
        <div className="text-right">
          <div className="font-title font-bold text-xl text-paralyx-text">
            {data[data.length - 1]?.totalUsers.toLocaleString() || 0}
          </div>
          <div className="text-xs text-paralyx-safe font-body">
            Total Users
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="time" 
              stroke="#4B4242"
              fontSize={12}
              fontFamily="Inconsolata"
            />
            <YAxis 
              stroke="#4B4242"
              fontSize={12}
              fontFamily="Inconsolata"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="totalUsers" 
              stackId="1"
              stroke="#FFB6C1" 
              fill="#FFB6C1"
              fillOpacity={0.3}
            />
            <Area 
              type="monotone" 
              dataKey="activeUsers" 
              stackId="2"
              stroke="#E6E6FA" 
              fill="#E6E6FA"
              fillOpacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UserGrowthChart;