import React from 'react';
import { motion } from 'framer-motion';
import { 
  Github, 
  Twitter, 
  BookOpen, 
  Shield, 
  Globe,
  ExternalLink,
  Activity
} from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    protocol: [
      { name: 'Documentation', href: '#', icon: BookOpen },
      { name: 'GitHub', href: '#', icon: Github },
      { name: 'Audit Reports', href: '#', icon: Shield },
      { name: 'Status Page', href: '#', icon: Activity },
    ],
    community: [
      { name: 'Twitter', href: '#', icon: Twitter },
      { name: 'Discord', href: '#', icon: Globe },
      { name: 'Blog', href: '#', icon: BookOpen },
      { name: 'Forum', href: '#', icon: Globe },
    ],
    legal: [
      { name: 'Terms of Service', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Risk Disclosure', href: '#' },
      { name: 'Cookie Policy', href: '#' },
    ]
  };

  return (
    <footer className="mt-16 glass-card mx-4 mb-4">
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-paralyx-primary rounded-lg flex items-center justify-center">
                <span className="font-title font-bold text-paralyx-text">P</span>
              </div>
              <h3 className="font-title font-bold text-lg text-paralyx-text">
                Paralyx Protocol
              </h3>
            </div>
            <p className="text-sm text-paralyx-text/70 font-body mb-4">
              The next generation cross-chain DeFi lending protocol bridging Ethereum and Stellar networks.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-paralyx-safe rounded-full animate-pulse"></div>
              <span className="text-xs text-paralyx-text/60 font-body">
                All systems operational
              </span>
            </div>
          </div>

          {/* Protocol Links */}
          <div>
            <h4 className="font-title font-semibold text-paralyx-text mb-4">
              Protocol
            </h4>
            <ul className="space-y-3">
              {links.protocol.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.name}>
                    <motion.a
                      href={link.href}
                      className="flex items-center space-x-2 text-sm text-paralyx-text/70 hover:text-paralyx-text transition-colors duration-200"
                      whileHover={{ x: 4 }}
                    >
                      <Icon size={14} />
                      <span className="font-body">{link.name}</span>
                      <ExternalLink size={12} className="opacity-50" />
                    </motion.a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <h4 className="font-title font-semibold text-paralyx-text mb-4">
              Community
            </h4>
            <ul className="space-y-3">
              {links.community.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.name}>
                    <motion.a
                      href={link.href}
                      className="flex items-center space-x-2 text-sm text-paralyx-text/70 hover:text-paralyx-text transition-colors duration-200"
                      whileHover={{ x: 4 }}
                    >
                      <Icon size={14} />
                      <span className="font-body">{link.name}</span>
                      <ExternalLink size={12} className="opacity-50" />
                    </motion.a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-title font-semibold text-paralyx-text mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.name}>
                  <motion.a
                    href={link.href}
                    className="text-sm text-paralyx-text/70 hover:text-paralyx-text transition-colors duration-200 font-body"
                    whileHover={{ x: 4 }}
                  >
                    {link.name}
                  </motion.a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-paralyx-text/60 font-body">
              © {currentYear} Paralyx Protocol. Built for the future of DeFi.
            </p>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-paralyx-text/50 font-body">Version</span>
                <span className="text-xs text-paralyx-text/70 font-body font-semibold">
                  v1.0.0
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-paralyx-text/50 font-body">Network</span>
                <span className="text-xs text-paralyx-safe font-body font-semibold">
                  Stellar Testnet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;