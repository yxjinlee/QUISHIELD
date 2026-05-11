/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Loader2, RefreshCw, Sun, Moon, Copy, Check } from 'lucide-react';
import ShieldLogo from './components/ui/ShieldLogo';
import Scanner from './components/dashboard/Scanner';
import ResultView from './components/dashboard/ResultView';
import { ScanResult } from './types';

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing Redirect Pipeline...');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      const messages = [
        'Initializing Analysis Sequence...',
        'Analyzing Redirect Pipeline...',
        'Checking Threat Intelligence Databases...',
        'Scanning for Punycode Spoofing...',
        'Detecting Cloaking Patterns...',
        'Finalizing Security Report...'
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleScanStart = () => {
    console.log('[SCAN] Initializing analysis sequence...');
    setIsScanning(true);
    setError(null);
    setResult(null);
  };

  const handleScanComplete = (data: ScanResult) => {
    console.log(`[SCAN] Analysis success. Risk Level: ${data.riskLevel}`);
    setResult(data);
    setIsScanning(false);
  };

  const handleScanError = (err: string) => {
    console.warn(`[SCAN] Analysis halted: ${err}`);
    setError(err);
    setIsScanning(false);
  };

  const [copied, setCopied] = useState(false);

  const reset = () => {
    setResult(null);
    setError(null);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020202] text-gray-900 dark:text-[#F0F0F0] font-sans selection:bg-[#F27D26] selection:text-white transition-colors duration-300">
      {/* Background Grid Pattern - Layered Behind */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.06] z-0" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="dark:hidden inset-0 absolute" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <div className="hidden dark:block inset-0 absolute" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>
      
      {!isCameraOpen && (
        <header className="fixed top-0 left-0 right-0 z-[100] border-b border-gray-100 dark:border-white/10 bg-white/95 dark:bg-[#020202]/95 backdrop-blur-xl transition-all h-16">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <button 
              onClick={reset}
              className="flex items-center gap-3 hover:opacity-80 transition-all cursor-pointer group"
            >
              <div className="relative p-2 bg-[#F27D26]/10 dark:bg-[#F27D26]/5 rounded-xl transition-all group-hover:scale-105">
                <ShieldLogo className="text-[#F27D26]" size={36} />
              </div>
              <div className="text-left">
                <h1 className="font-mono font-bold tracking-tighter text-xl uppercase italic text-gray-900 dark:text-gray-100 leading-none">QUISHIELD</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold mt-0.5">QR Security Intelligence</p>
              </div>
            </button>
            
            <div className="flex items-center gap-4">
               <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hidden md:block">
                 SYSTEM_STATUS: <span className="text-[#00FF00]">OPERATIONAL</span>
               </div>
  
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleTheme();
                 }}
                 className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#151515] text-gray-600 dark:text-gray-300 hover:text-[#F27D26] transition-all border border-gray-100 dark:border-white/10 active:scale-95"
                 aria-label="Toggle Theme"
               >
                 {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
  
               <div className="w-24 flex justify-end">
                {(result || error) && !isScanning && (
                  <button 
                    onClick={reset}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-[#F27D26] transition-colors whitespace-nowrap"
                  >
                    <RefreshCw className="w-3 h-3" />
                    NEW SCAN
                  </button>
                )}
               </div>
            </div>
          </div>
        </header>
      )}

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {!isScanning && !result && !error && (
            <motion.div
              key="scanner-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className={`max-w-2xl mx-auto text-center mb-12 transition-opacity duration-300 ${isCameraOpen ? 'opacity-0' : 'opacity-100'}`}>
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-50 mb-4 tracking-tight">QR Security Intelligence</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  Instantly decode QR codes, trace redirect chains, and reveal hidden phishing patterns before they reach your device.
                </p>
              </div>
              <Scanner 
                onScanStart={handleScanStart} 
                onScanComplete={handleScanComplete} 
                onScanError={handleScanError}
                onCameraToggle={setIsCameraOpen}
              />
            </motion.div>
          )}

          {isScanning && (
            <motion.div
              key="loading-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-[#F27D26] animate-spin" />
                <div className="absolute inset-0 blur-xl bg-[#F27D26]/20 animate-pulse"></div>
              </div>
              <p className="mt-8 font-mono text-xs uppercase tracking-widest text-gray-400 dark:text-[#888] min-h-[1em]">{loadingMessage}</p>
            </motion.div>
          )}

          {result && !isScanning && (
            <motion.div
              key="result-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <ResultView result={result} />
            </motion.div>
          )}

          {error && !isScanning && (
            <motion.div
              key="error-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto p-12 border border-red-500/20 bg-red-500/5 rounded-2xl text-center shadow-xl shadow-red-500/5"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-red-500 mb-2 tracking-tight">Scan Failed</h3>
              <p className="text-gray-600 dark:text-red-400/80 mb-8 font-medium">{error}</p>
              <button 
                onClick={reset}
                className="w-full px-6 py-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all transform active:scale-95 shadow-lg shadow-red-500/20"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!isCameraOpen && (
        <footer className="relative z-10 border-t border-gray-100 dark:border-white/10 py-16 text-center transition-colors bg-gray-50/30 dark:bg-black/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <ShieldLogo className="text-[#F27D26] opacity-80" size={20} />
                <div className="h-4 w-[1px] bg-gray-300 dark:bg-white/20"></div>
                <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-[0.2em]">QUISHIELD | QR Security Intelligence</span>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium tracking-wide">
                  Designed for Seoul Young Career Experience Project
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-[11px] font-mono flex items-center justify-center gap-2 group">
                  Creator email: 
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('leeyxjin@gmail.com');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="relative flex items-center gap-1.5 text-[#F27D26] hover:text-[#d66a1e] transition-all cursor-pointer font-bold px-2 py-1 rounded-lg hover:bg-[#F27D26]/5 active:scale-95"
                  >
                    leeyxjin@gmail.com
                    {copied ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span className="text-[9px] uppercase tracking-tighter">Copied</span>
                      </motion.div>
                    ) : (
                      <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </p>
              </div>
  
              <div className="mt-4 pt-6 border-t border-gray-100 dark:border-white/5 w-16 mx-auto">
                <div className="flex gap-1.5 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00]/40"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/10"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/10"></div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

