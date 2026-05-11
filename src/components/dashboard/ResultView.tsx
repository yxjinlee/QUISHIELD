import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ExternalLink, AlertTriangle, CheckCircle, ShieldAlert, 
  ChevronRight, Hash, Globe, MousePointerClick, 
  RefreshCw, Lock, Unlock, FileText, Wifi, Users, Binary, Info
} from 'lucide-react';
import { ScanResult, RiskLevel, QrType } from '../../types';
import AnalysisDetails from './AnalysisDetails';

interface ResultViewProps {
  result: ScanResult;
}

export default function ResultView({ result }: ResultViewProps) {
  const [showOverride, setShowOverride] = useState(false);
  const isDangerous = result.riskLevel === RiskLevel.DANGEROUS;
  const isWarning = result.riskLevel === RiskLevel.WARNING;
  const isSafe = result.riskLevel === RiskLevel.SAFE;

  const getStatusColor = () => {
    if (isDangerous) return 'text-[#FF4444]';
    if (isWarning) return 'text-[#F27D26]';
    return 'text-[#00FF00]';
  };

  const getStatusBg = () => {
    if (isDangerous) return 'bg-[#FF4444]/10 border-[#FF4444]/20';
    if (isWarning) return 'bg-[#F27D26]/10 border-[#F27D26]/20';
    return 'bg-[#00FF00]/10 border-[#00FF00]/20';
  };

  const getStatusIcon = () => {
    if (isDangerous) return <ShieldAlert className="w-10 h-10 text-[#FF4444]" />;
    if (isWarning) return <AlertTriangle className="w-10 h-10 text-[#F27D26]" />;
    return <CheckCircle className="w-10 h-10 text-[#00FF00]" />;
  };

  const getTypeIcon = () => {
    switch (result.type) {
      case QrType.URL: return <Globe className="w-4 h-4" />;
      case QrType.TEXT: return <FileText className="w-4 h-4" />;
      case QrType.WIFI: return <Wifi className="w-4 h-4" />;
      case QrType.VCARD: return <Users className="w-4 h-4" />;
      case QrType.ENCODED: return <Binary className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (result.type) {
      case QrType.URL: return 'Uniform Resource Locator';
      case QrType.TEXT: return 'Plain Text Content';
      case QrType.WIFI: return 'Wi-Fi Configuration';
      case QrType.VCARD: return 'Digital Business Card';
      case QrType.ENCODED: return 'Encoded Data Payload';
      default: return 'Generic Content';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Risk Summary Header */}
      <div className={`p-8 rounded-[2rem] border ${getStatusBg()} flex flex-col lg:flex-row items-center gap-10 shadow-2xl shadow-current/[0.03] transition-all duration-300`}>
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-black/40 shadow-inner border border-white/20 dark:border-white/10">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
            <span className={`text-[11px] font-mono font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${getStatusBg()}`}>
              SECURITY_LEVEL: {result.riskLevel}
            </span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {getTypeIcon()}
              {result.type}
            </div>
            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 hidden sm:inline">{new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <h3 className={`text-4xl font-extrabold mb-3 tracking-tight ${getStatusColor()}`}>
            {isDangerous ? 'Dangerous Activity Detected' : isWarning ? 'Suspicious Entry Detected' : 'No Immediate Threats Found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-200 max-w-2xl text-lg font-medium leading-relaxed">
            {isDangerous 
              ? 'High correlation with known phishing techniques detected. Direct interaction with this content is strictly discouraged.' 
              : isWarning 
              ? 'Our heuristic signals detected irregularities that suggest caution. Content may be obfuscated or suspicious.' 
              : 'Standard security patterns verified. This QR content appears safe for typical interaction.'
            }
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/20 shadow-xl shadow-gray-200/20 dark:shadow-none min-w-[170px]">
           <div className={`text-6xl font-mono font-bold mb-1 tracking-tighter ${getStatusColor()}`}>{result.riskScore}</div>
           <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Risk Index</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Content Intelligence */}
        <div className="lg:col-span-2 space-y-8">
          {/* Payload Tracking Card */}
          <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6">
              <div className="p-2 bg-[#F27D26]/10 rounded-lg text-[#F27D26]">
                {getTypeIcon()}
              </div>
              <div className="flex flex-col">
                <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Content Intelligence</h4>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">{getTypeLabel()}</span>
              </div>
            </div>

            <div className="space-y-6 mt-6">
              <div>
                <label className="text-[11px] font-mono text-gray-500 dark:text-gray-500 uppercase font-bold block mb-3">Decoded Entry Data</label>
                <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSafe ? 'bg-gray-50 dark:bg-[#121212] border-gray-100 dark:border-white/10' : 'bg-red-500/5 dark:bg-red-500/[0.03] border-red-500/20'}`}>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-mono truncate break-all ${isSafe ? 'text-gray-600 dark:text-gray-300' : 'text-red-500/70 dark:text-red-400/60'}`}>{result.originalUrl}</p>
                  </div>
                  {result.type === QrType.URL && (
                    <>
                      {isSafe ? (
                        <a href={result.originalUrl} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                          <ExternalLink className="w-4 h-4 text-[#F27D26]" />
                        </a>
                      ) : (
                        <button 
                          onClick={() => setShowOverride(true)}
                          className="p-2.5 bg-red-500/10 rounded-xl group relative hover:bg-red-500/20 transition-all" 
                        >
                          <Lock className="w-4 h-4 text-red-500" />
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-mono">
                            NAVI_LOCKED: Risk index {result.riskScore} exceeds safety threshold. Click to unlock anyway.
                          </div>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {result.redirectChain.length > 1 && (
                <div className="relative py-6">
                  <div className="absolute left-[2.25rem] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#F27D26] via-[#FF4444]/40 to-transparent"></div>
                  <div className="space-y-6">
                     {result.redirectChain.map((hop, i) => (
                       <div key={i} className="flex items-center gap-6 ml-4">
                          <div className="z-10 w-10 h-10 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-md">
                            <span className="text-[10px] font-mono text-gray-400 font-bold">{hop.status}</span>
                          </div>
                          <div className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-[#050505] border border-gray-100 dark:border-white/10 overflow-hidden group transition-all hover:border-gray-200 dark:hover:border-white/20">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-mono text-gray-400 dark:text-gray-400 truncate flex-1">{hop.url}</p>
                              <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase">HOP_{i}</span>
                            </div>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {result.type === QrType.URL && (
                <div>
                  <label className="text-[11px] font-mono text-gray-500 dark:text-gray-500 uppercase font-bold block mb-3">Resolved Landing Path</label>
                  <div className={`flex items-center gap-5 p-5 rounded-2xl border shadow-inner ${isSafe ? 'bg-[#f8f9fa] dark:bg-[#121212] border-[#F27D26]/20' : 'bg-red-500/[0.02] border-red-500/30'}`}>
                    <div className={`p-3 rounded-xl shrink-0 ${isSafe ? 'bg-[#F27D26]/10' : 'bg-red-500/10'}`}>
                      {isSafe ? <Unlock className="w-6 h-6 text-[#F27D26]" /> : <Lock className="w-6 h-6 text-red-500" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-base font-extrabold break-all tracking-tight ${isSafe ? 'text-gray-900 dark:text-gray-100' : 'text-red-500 dark:text-red-400'}`}>{result.finalUrl}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Breakdown */}
          <AnalysisDetails analysis={result.analysis} score={result.riskScore} type={result.type} />
        </div>

        {/* Right Column: Evidence & Metadata */}
        <div className="space-y-8">
           <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6 mb-8">
                <ShieldAlert className="w-5 h-5 text-[#F27D26]" />
                <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Explainable Breakdown</h4>
              </div>

              <div className="space-y-4">
                {result.breakdown && result.breakdown.length > 0 ? (
                  result.breakdown.map((item, i) => (
                    <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5 transition-all hover:bg-gray-100/50 dark:hover:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight">{item.factor}</span>
                        <span className="font-mono text-xs font-bold text-[#FF4444]">+{item.impact}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.impact / 50) * 100}%` }}
                          className="h-full bg-red-500/50"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#00FF00]/5 border border-[#00FF00]/10 text-[#00FF00]">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase overflow-hidden">Negative Threat Correlation</span>
                  </div>
                )}
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50 dark:border-white/5">
                <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mb-5 uppercase tracking-[0.2em] font-bold">Telemetry_Data[]</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#121212] border dark:border-white/5">
                    <p className="text-[9px] font-mono text-gray-400 uppercase mb-1">Length</p>
                    <p className="text-sm font-bold dark:text-white uppercase">{result.analysis.urlLength}B</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#121212] border dark:border-white/5">
                    <p className="text-[9px] font-mono text-gray-400 uppercase mb-1">Redirects</p>
                    <p className="text-sm font-bold dark:text-white uppercase">{result.redirectChain.length - 1}</p>
                  </div>
                </div>
              </div>
           </div>

           <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6 mb-8">
                <ChevronRight className="w-5 h-5 text-[#F27D26]" />
                <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Verif_Logs</h4>
              </div>
              <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 overflow-auto max-h-[300px] leading-[1.8] scrollbar-none">
                <span className="text-[#00FF00]/60">[[ SYSLOG_START ]]</span><br/>
                [SYSTEM] Classify: {result.type.toUpperCase()}<br/>
                [DEBUG] Entry_Len: {result.originalUrl.length} bytes<br/>
                [TRACE] Resolving Redirect Pipeline...<br/>
                {result.redirectChain.map((hop, i) => {
                  let host = 'LOCAL_DATA';
                  try {
                    host = new URL(hop.url).hostname || 'localhost';
                  } catch(e) {
                    host = hop.url.substring(0, 15) + '...';
                  }
                  return (
                    <span key={i} className={i === result.redirectChain.length - 1 ? 'text-[#F27D26]' : ''}>
                      [HOP_{i}] → {hop.status} : {host}<br/>
                    </span>
                  );
                })}
                [BREADOWN] Appending Explainability Vectors...<br/>
                {result.breakdown.map((b, i) => (
                  <span key={i} className="text-red-500/60">
                    [ERR] +{b.impact}pts ({b.factor.substring(0, 15)}...)<br/>
                  </span>
                ))}
                [SCORE] Aggregate Intensity: {result.riskScore}%<br/>
                [STATE] Final Risk Level: {result.riskLevel.toUpperCase()}<br/>
                <span className="text-[#00FF00]/60">[[ SYSLOG_END ]]</span>
              </div>
           </div>
        </div>
      </div>

      {/* Advanced Override Modal */}
      <AnimatePresence>
        {showOverride && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D0D] border border-red-500/30 rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="bg-red-500/10 p-8 flex flex-col items-center text-center border-b border-red-500/20">
                <div className="p-4 bg-red-500/20 rounded-3xl mb-6">
                  <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
                <h4 className="text-2xl font-black text-white mb-3">SECURITY_OVERRIDE_REQUIRED</h4>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm font-medium">
                  The link you are trying to access has been classified as 
                  <span className="text-red-500 font-bold px-1">HIGH RISK ({result.riskScore}%)</span>.
                  Accessing it may lead to data theft, malware infection, or credential compromise.
                </p>
              </div>
              <div className="p-8 space-y-4">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest text-center mb-6">Proceeding bypasses Quishield safety protocols.</p>
                <div className="flex flex-col gap-3">
                  <a 
                    href={result.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-4 bg-white/5 hover:bg-red-500 text-white font-bold rounded-2xl transition-all text-center border border-white/10 flex items-center justify-center gap-2 group"
                  >
                    Proceed Anyway (Advanced)
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </a>
                  <button 
                    onClick={() => setShowOverride(false)}
                    className="w-full py-5 bg-[#F27D26] hover:bg-[#d66a1e] text-white font-black rounded-2xl transition-all shadow-xl shadow-[#F27D26]/20"
                  >
                    Stay Safe (Recommended)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
