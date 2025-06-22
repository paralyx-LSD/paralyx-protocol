import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Metric {
  name: string;
  value: number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  prefix?: string;
  suffix?: string;
  description?: string;
}

interface MetricCardProps {
  metric: Metric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const Icon = metric.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="metric-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-paralyx-primary/10 rounded-lg">
          <Icon size={20} className="text-paralyx-primary" />
        </div>
        <div className={`flex items-center space-x-1 text-xs font-body ${
          metric.changeType === 'positive' ? 'text-paralyx-safe' : 'text-paralyx-warning'
        }`}>
          {metric.changeType === 'positive' ? (
            <ArrowUpRight size={12} />
          ) : (
            <ArrowDownRight size={12} />
          )}
          <span>{metric.change}</span>
        </div>
      </div>
      
      <div className="mb-2">
        <span className="font-title font-bold text-2xl text-paralyx-text">
          {metric.prefix}{metric.value.toLocaleString()}{metric.suffix}
        </span>
      </div>
      
      <div className="text-sm text-paralyx-text/60 font-body mb-1">
        {metric.name}
      </div>
      
      {metric.description && (
        <div className="text-xs text-paralyx-text/50 font-body">
          {metric.description}
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;