import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Wallet,
  Settings,
  Activity,
  TrendingUp,
  Layers,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { useWallet } from "../../contexts/WalletContext";
import WalletModal from "../modals/WalletModal";
import logoImage from "../../../assets/logo.png";

const Navbar: React.FC = () => {
  const location = useLocation();
  const { isConnected, walletAddress, walletType, disconnectWallet } =
    useWallet();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Markets", href: "/markets", icon: TrendingUp },
    { name: "Portfolio", href: "/portfolio", icon: Layers },
    { name: "Bridge", href: "/bridge", icon: ArrowLeftRight },
    { name: "Analytics", href: "/analytics", icon: Activity },
  ];

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="glass-card m-4 sticky top-4 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={logoImage}
                  alt="Paralyx Logo"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    // Fallback to original P logo if image fails to load
                    e.currentTarget.style.display = "none";
                    const nextElement = e.currentTarget
                      .nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = "block";
                    }
                  }}
                />
                <span
                  className="font-title font-bold text-lg text-paralyx-text hidden"
                  style={{ display: "none" }}
                >
                  P
                </span>
              </motion.div>
              <div>
                <h1 className="font-title font-bold text-xl text-black">
                  Paralyx
                </h1>
                <p className="text-xs text-paralyx-text/60 font-body">
                  Cross-Chain DeFi
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30"
                        : "text-paralyx-text/70 hover:text-paralyx-text hover:bg-glass-light"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Wallet Connection */}
            <div className="hidden md:flex items-center space-x-4">
              {isConnected ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-3 glass-button px-4 py-2 relative"
                  >
                    {/* Wallet type indicator */}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        walletType === "metamask"
                          ? "bg-orange-500"
                          : "bg-paralyx-primary"
                      } animate-pulse`}
                    ></div>
                    <div className="w-2 h-2 bg-paralyx-safe rounded-full animate-pulse"></div>
                    <span className="font-body text-sm text-paralyx-text">
                      {formatAddress(walletAddress || "")}
                    </span>
                    <Settings size={16} className="text-paralyx-text/60" />
                  </button>

                  {/* User Menu Dropdown */}
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 glass-card p-2"
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-2">
                        <div className="text-xs text-paralyx-text/50 font-body">
                          Connected with
                        </div>
                        <div className="text-sm text-paralyx-text font-body capitalize">
                          {walletType}
                        </div>
                      </div>
                      <Link
                        to="/portfolio"
                        className="block px-3 py-2 text-sm text-paralyx-text hover:bg-glass-light rounded-lg"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        View Portfolio
                      </Link>
                      <Link
                        to="/bridge"
                        className="block px-3 py-2 text-sm text-paralyx-text hover:bg-glass-light rounded-lg"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Bridge Assets
                      </Link>
                      <hr className="my-2 border-white/10" />
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setIsUserMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-paralyx-warning hover:bg-paralyx-warning/10 rounded-lg"
                      >
                        Disconnect
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="paralyx-button flex items-center space-x-2"
                >
                  <Wallet size={16} />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden glass-button p-2"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-white/10"
            >
              <div className="space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-paralyx-primary/20 text-paralyx-text border border-paralyx-primary/30"
                          : "text-paralyx-text/70 hover:text-paralyx-text hover:bg-glass-light"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Wallet Section */}
              <div className="mt-4 pt-4 border-t border-white/10">
                {isConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 px-3 py-2 text-sm text-paralyx-text">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          walletType === "metamask"
                            ? "bg-orange-500"
                            : "bg-paralyx-primary"
                        } animate-pulse`}
                      ></div>
                      <div className="w-2 h-2 bg-paralyx-safe rounded-full animate-pulse"></div>
                      <span>{formatAddress(walletAddress || "")}</span>
                    </div>
                    <div className="px-3 py-1 text-xs text-paralyx-text/60 font-body">
                      {walletType} wallet
                    </div>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-paralyx-warning hover:bg-paralyx-warning/10 rounded-lg"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsWalletModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full paralyx-button flex items-center justify-center space-x-2"
                  >
                    <Wallet size={16} />
                    <span>Connect Wallet</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
