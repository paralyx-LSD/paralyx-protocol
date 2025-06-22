import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftRight, 
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import BridgeForm from '../components/bridge/BridgeForm';
import BridgeHistory from '../components/bridge/BridgeHistory';
import BridgeStats from '../components/bridge/BridgeStats';
import NetworkStatus from '../components/bridge/NetworkStatus';

const Bridge: React.FC = () => {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'bridge' | 'history' | 'stats'>('bridge');

  const bridgeSteps = [
    {
      step: 1,
      title: 'Lock on Ethereum',
      description: 'Asset locked in Ethereum smart contract',
      status: 'completed' as const,
      network: 'Ethereum'
    },
    {
      step: 2,
      title: 'Validation',
      description: 'Cross-chain validators confirm transaction',
      status: 'in-progress' as const,
      network: 'Bridge'
    },
    {
      step: 3,
      title: 'Mint on Stellar',
      description: 'Wrapped asset minted on Stellar network',
      status: 'pending' as const,
      network: 'Stellar'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-title font-bold text-2xl text-paralyx-text mb-2">
              Cross-Chain Bridge
            </h1>
            <p className="text-paralyx-text/70 font-body">
              Bridge assets between Ethereum and Stellar networks
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-body text-paralyx-text">Ethereum</span>
              </div>
              <ArrowRight size={16} className="text-paralyx-text/40" />
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-paralyx-primary rounded-full"></div>
                <span className="text-sm font-body text-paralyx-text">Stellar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <NetworkStatus />

      {/* Bridge Process Visualization */}
      <div className="glass-card p-6">
        <h3 className="font-title font-bold text-lg text-paralyx-text mb-6">
          Bridge Process
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bridgeSteps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              <div className={`p-4 rounded-lg border ${
                step.status === 'completed' ? 'border-paralyx-safe/30 bg-paralyx-safe/10' :
                step.status === 'in-progress' ? 'border-yellow-400/30 bg-yellow-400/10' :
                'border-paralyx-text/20 bg-paralyx-text/5'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.status === 'completed' ? 'bg-paralyx-safe text-white' :
                      step.status === 'in-progress' ? 'bg-yellow-400 text-white' :
                      'bg-paralyx-text/20 text-paralyx-text'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle size={12} />
                      ) : step.status === 'in-progress' ? (
                        <Clock size={12} />
                      ) : (
                        step.step
                      )}
                    </div>
                    <span className="text-xs text-paralyx-text/60 font-body">
                      {step.network}
                    </span>
                  </div>
                  
                  <div className={`text-xs font-body ${
                    step.status === 'completed' ? 'text-paralyx-safe' :
                    step.status === 'in-progress' ? 'text-yellow-600' :
                    'text-paralyx-text/40'
                  }`}>
                    {step.status === 'completed' ? 'Complete' :
                     step.status === 'in-progress' ? 'Processing' :
                     'Pending'}
                  </div>
                </div>
                
                <h4 className="font-title font-medium text-paralyx-text mb-1">
                  {step.title}
                </h4>
                <p className="text-xs text-paralyx-text/70 font-body">
                  {step.description}
                </p>
              </div>

              {/* Arrow connector */}
              {index < bridgeSteps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight size={16} className="text-paralyx-text/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card p-6">
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-6 py-2 text-sm font-body rounded-lg transition-all duration-200 ${
              activeTab === 'bridge'
                ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
            }`}
          >
            Bridge Assets
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 text-sm font-body rounded-lg transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-2 text-sm font-body rounded-lg transition-all duration-200 ${
              activeTab === 'stats'
                ? 'bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30'
                : 'text-paralyx-text/60 hover:text-paralyx-text hover:bg-glass-light'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'bridge' && <BridgeForm />}
          {activeTab === 'history' && <BridgeHistory />}
          {activeTab === 'stats' && <BridgeStats />}
        </div>
      </div>

      {/* Important Notice */}
      <div className="glass-card p-6">
        <div className="flex items-start space-x-3">
          <Info size={20} className="text-paralyx-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-title font-medium text-paralyx-text mb-2">
              Important Bridge Information
            </h4>
            <ul className="space-y-2 text-sm text-paralyx-text/70 font-body">
              <li className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-paralyx-text/40 rounded-full mt-2 flex-shrink-0"></div>
                <span>Bridge transactions typically take 5-15 minutes to complete</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-paralyx-text/40 rounded-full mt-2 flex-shrink-0"></div>
                <span>Bridge fees vary based on network congestion and asset type</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-paralyx-text/40 rounded-full mt-2 flex-shrink-0"></div>
                <span>Always verify destination address before confirming transactions</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-paralyx-text/40 rounded-full mt-2 flex-shrink-0"></div>
                <span>This is a testnet bridge - do not use real mainnet assets</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Bridge;