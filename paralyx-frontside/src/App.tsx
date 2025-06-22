import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Page Components
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Portfolio from './pages/Portfolio';
import Bridge from './pages/Bridge';
import Analytics from './pages/Analytics';

// Context Providers
import { WalletProvider } from './contexts/WalletContext';
import { DataProvider } from './contexts/DataContext';

function App() {
  return (
    <WalletProvider>
      <DataProvider>
        <Router>
          <div className="min-h-screen bg-paralyx-gradient">
            {/* Background Animation */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <motion.div
                className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/3 rounded-full blur-3xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 180, 0],
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            {/* Main App Content */}
            <div className="relative z-10">
              <Navbar />
              
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/bridge" element={<Bridge />} />
                  <Route path="/analytics" element={<Analytics />} />
                </Routes>
              </main>
              
              <Footer />
            </div>

            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#4B4242',
                  fontFamily: 'Inconsolata, monospace',
                },
                success: {
                  iconTheme: {
                    primary: '#98FF98',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FFA07A',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </DataProvider>
    </WalletProvider>
  );
}

export default App;