import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

const ProtocolHealthWidget: React.FC = () => {
  const { protocolData } = useData();
  
  const healthScore = protocolData?.healthScore || 95;
  const utilizationRate = protocolData?.utilizationRate || 65;
  
  const getHealthStatus = (score: number) => {
    if (score >= 90) return { status: 'Excellent', color: 'text-paralyx-safe', icon: CheckCircle };
    if (score >= 75) return { status: 'Good', color: 'text-yellow-500', icon: Activity };
    return { status: 'Needs Attention', color: 'text-paralyx-warning', icon: AlertTriangle };
  };

  const health = getHealthStatus(healthScore);
  const HealthIcon = health.icon;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield size={20} className="text-paralyx-primary" />
        <h3 className="font-title font-bold text-lg text-paralyx-text">
          Protocol Health
        </h3>
      </div>

      {/* Health Score Circle */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              stroke="#22C55E"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - healthScore / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="green-glow"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="font-title font-bold text-2xl text-paralyx-text">
                {healthScore}
              </div>
              <div className="text-xs text-paralyx-text/60 font-body">
                Health Score
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        <div className={`flex items-center justify-center space-x-2 ${health.color} mb-2`}>
          <HealthIcon size={16} />
          <span className="font-title font-medium">{health.status}</span>
        </div>
        <p className="text-xs text-paralyx-text/60 font-body">
          Protocol operating within safe parameters
        </p>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-paralyx-text/70 font-body">Utilization Rate</span>
          <span className="font-title font-bold text-paralyx-text">{utilizationRate}%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-paralyx-text/70 font-body">Reserve Factor</span>
          <span className="font-title font-bold text-paralyx-text">12.5%</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-paralyx-text/70 font-body">Active Markets</span>
          <span className="font-title font-bold text-paralyx-text">8/10</span>
        </div>
        
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-paralyx-safe font-body">
            <Activity size={12} />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtocolHealthWidget;