import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthFactorGaugeProps {
  healthFactor: number;
  liquidationRisk: 'low' | 'medium' | 'high';
}

const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({ 
  healthFactor, 
  liquidationRisk 
}) => {
  const getHealthColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return '#22C55E';
      case 'medium':
        return '#FFD700';
      case 'high':
        return '#FFA07A';
      default:
        return '#22C55E';
    }
  };

  const getHealthIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return CheckCircle;
      case 'medium':
        return Shield;
      case 'high':
        return AlertTriangle;
      default:
        return CheckCircle;
    }
  };

  const HealthIcon = getHealthIcon(liquidationRisk);
  const healthColor = getHealthColor(liquidationRisk);
  
  // Calculate gauge percentage (cap at 100% for display)
  const gaugePercentage = Math.min((healthFactor / 3) * 100, 100);

  return (
    <div className="text-center">
      {/* Gauge Circle */}
      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            stroke={healthColor}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 70}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - gaugePercentage / 100) }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <HealthIcon size={24} className="mx-auto mb-2" style={{ color: healthColor }} />
            <div className="font-title font-bold text-2xl text-paralyx-text">
              {healthFactor.toFixed(2)}
            </div>
            <div className="text-xs text-paralyx-text/60 font-body">
              Health Factor
            </div>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="mb-4">
        <div className={`font-title font-bold text-lg mb-1`} style={{ color: healthColor }}>
          {liquidationRisk === 'low' ? 'Safe Position' :
           liquidationRisk === 'medium' ? 'Monitor Closely' :
           'High Risk'}
        </div>
        <p className="text-sm text-paralyx-text/70 font-body">
          {liquidationRisk === 'low' 
            ? 'Your position is well-collateralized and safe from liquidation.'
            : liquidationRisk === 'medium'
            ? 'Your position requires monitoring. Consider adding collateral.'
            : 'Your position is at high risk of liquidation. Take action immediately.'}
        </p>
      </div>

      {/* Risk Levels */}
      <div className="grid grid-cols-3 gap-2 text-xs font-body">
        <div className={`p-2 rounded text-center ${
          liquidationRisk === 'low' ? 'bg-paralyx-safe/20 text-paralyx-safe' : 'bg-white/5 text-paralyx-text/40'
        }`}>
          {"Safe (>2.0)"}
        </div>
        <div className={`p-2 rounded text-center ${
          liquidationRisk === 'medium' ? 'bg-yellow-400/20 text-yellow-600' : 'bg-white/5 text-paralyx-text/40'
        }`}>
          Caution (1.2-2.0)
        </div>
        <div className={`p-2 rounded text-center ${
          liquidationRisk === 'high' ? 'bg-paralyx-warning/20 text-paralyx-warning' : 'bg-white/5 text-paralyx-text/40'
        }`}>
          {"Risk (<1.2)"}
        </div>
      </div>
    </div>
  );
};

export default HealthFactorGauge;