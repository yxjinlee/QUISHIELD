import { motion } from 'motion/react';
import { ExternalLink, AlertTriangle, CheckCircle, ShieldAlert, ChevronRight, Hash, Globe, MousePointerClick, RefreshCw, Copy, Check } from 'lucide-react';
import { ScanResult, RiskLevel } from '../../types';
import AnalysisDetails from './AnalysisDetails';
import { useState } from 'react';

interface ResultViewProps {
  result: ScanResult;
}

export default function ResultView({ result }: ResultViewProps) {
  const [copied, setCopied] = useState(false);
  const isDangerous = result.riskLevel === RiskLevel.HIGH;
  const isWarning = result.riskLevel === RiskLevel.MEDIUM;
  const isSafe = result.riskLevel === RiskLevel.LOW;

  const getStatusColor = () => {
    if (result.riskLevel === RiskLevel.HIGH) return 'text-[#FF4444]';
    if (result.riskLevel === RiskLevel.MEDIUM) return 'text-[#F27D26]';
    return 'text-[#00FF00]';
  };

  const getStatusBg = () => {
    if (result.riskLevel === RiskLevel.HIGH) return 'bg-[#FF4444]/10 border-[#FF4444]/20';
    if (result.riskLevel === RiskLevel.MEDIUM) return 'bg-[#F27D26]/10 border-[#F27D26]/20';
    return 'bg-[#00FF00]/10 border-[#00FF00]/20';
  };

  const getStatusIcon = () => {
    if (result.riskLevel === RiskLevel.HIGH) return <ShieldAlert className="w-10 h-10 text-[#FF4444]" />;
    if (result.riskLevel === RiskLevel.MEDIUM) return <AlertTriangle className="w-10 h-10 text-[#F27D26]" />;
    return <CheckCircle className="w-10 h-10 text-[#00FF00]" />;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.originalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Risk Summary Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 rounded-[2rem] border ${getStatusBg()} flex flex-col lg:flex-row items-center gap-10 shadow-2xl shadow-current/[0.03] transition-all duration-300 bg-white/50 dark:bg-black/20 backdrop-blur-sm`}
      >
        <div className="p-6 rounded-3xl bg-white dark:bg-black/40 shadow-inner border border-white/20 dark:border-white/10">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
            <span className={`text-[11px] font-mono font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${getStatusBg()}`}>
              SECURITY_LEVEL: {result.riskLevel}
            </span>
            <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{new Date(result.timestamp).toLocaleString()}</span>
          </div>
          <h3 className={`text-4xl font-extrabold mb-3 tracking-tight ${getStatusColor()}`}>
            {isDangerous ? 'Dangerous Activity Detected' : isWarning ? 'Suspicious URL Patterns' : 'No Immediate Threats Found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-200 max-w-2xl text-lg font-medium leading-relaxed">
            {isDangerous 
              ? 'This URL shows high correlation with known phishing techniques, including redirect obfuscation and hostname spoofing.' 
              : isWarning 
              ? 'The analysis found some irregularities in the URL structure or redirect chain that suggest caution.' 
              : 'Our analysis indicates this URL follows standard patterns. However, always verify the source before interaction.'
            }
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/20 shadow-xl shadow-gray-200/20 dark:shadow-none min-w-[170px]">
           <div className={`text-6xl font-mono font-bold mb-1 tracking-tighter ${getStatusColor()}`}>{result.riskScore}</div>
           <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Risk Index</div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: URL Intelligence */}
        <div className="lg:col-span-2 space-y-8">
          {/* URL Tracing Card */}
          <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6">
              <div className="p-2 bg-[#F27D26]/10 rounded-lg">
                <Globe className="w-5 h-5 text-[#F27D26]" />
              </div>
              <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">URL Intelligence</h4>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label className="text-[11px] font-mono text-gray-400 dark:text-gray-500 uppercase font-bold block mb-3">Decoded QR Entry Point</label>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5 group relative">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-300 break-all">{result.originalUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCopy} className="p-2.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                    <a href={result.originalUrl} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                      <ExternalLink className="w-4 h-4 text-[#F27D26]" />
                    </a>
                  </div>
                </div>
              </div>

              {result.redirectChain.length > 1 && (
                <div className="relative py-4 ml-6 pl-10 border-l-2 border-dashed border-gray-100 dark:border-white/10 space-y-6">
                  {result.redirectChain.slice(1, -1).map((url, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[3.1rem] top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/10 flex items-center justify-center">
                        <RefreshCw className="w-3 h-3 text-gray-400" />
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-white/5 overflow-hidden">
                        <p className="text-[11px] font-mono text-gray-400 truncate">{url}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-gray-400 dark:text-gray-500 uppercase font-bold block mb-3">Target Application Path</label>
                <div className="flex items-center gap-5 p-5 rounded-3xl bg-[#f8f9fa] dark:bg-[#121212] border border-[#F27D26]/20 shadow-inner">
                  <div className="p-3 rounded-2xl bg-[#F27D26]/10 shrink-0">
                    <MousePointerClick className="w-6 h-6 text-[#F27D26]" />
                  </div>
                  <div className="flex-1 overflow-hidden text-left">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-100 break-all tracking-tight">{result.finalUrl}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Breakdown */}
          <AnalysisDetails analysis={result.analysis} score={result.riskScore} />
        </div>

        {/* Right Column: Evidence & Metadata */}
        <div className="space-y-8">
           <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6 mb-8">
                <Hash className="w-5 h-5 text-[#F27D26]" />
                <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Risk Signals</h4>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5 transition-all hover:bg-gray-100/50 dark:hover:border-white/10">
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Redirect Hops</span>
                   <span className="font-mono font-bold text-[#F27D26] bg-[#F27D26]/10 px-3 py-1 rounded-lg">+{result.analysis.redirectCount}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5">
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL complexity</span>
                   <span className="font-mono font-bold text-gray-700 dark:text-white">{result.analysis.urlLength}B</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5">
                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Protocol Status</span>
                   <span className={`font-mono font-bold px-3 py-1 rounded-lg ${result.analysis.isHttps ? 'text-[#00FF00] bg-[#00FF00]/10' : 'text-[#FF4444] bg-[#FF4444]/10'}`}>
                     {result.analysis.isHttps ? 'SECURE' : 'INSECURE'}
                   </span>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50 dark:border-white/5">
                <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mb-5 uppercase tracking-[0.2em] font-bold">Threat_Flags[]</p>
                <div className="flex flex-wrap gap-2.5">
                   {result.analysis.suspiciousKeywords.map((k, i) => (
                     <span key={i} className="px-3 py-1.5 rounded-xl bg-[#FF4444]/10 text-[#FF4444] text-[10px] font-extrabold border border-[#FF4444]/20 uppercase">
                       {k}
                     </span>
                   ))}
                   {result.analysis.domainMismatch && <span className="px-3 py-1.5 rounded-xl bg-red-900/20 text-red-500 text-[10px] font-extrabold border border-red-500/20 uppercase">DOMAIN_MISMATCH</span>}
                   {result.analysis.shortenerFound && <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-extrabold border border-amber-500/20 uppercase">SHORT_URL</span>}
                   {result.analysis.suspiciousKeywords.length === 0 && !result.analysis.domainMismatch && !result.analysis.shortenerFound && (
                     <span className="text-xs font-medium text-gray-400 dark:text-gray-500 italic">Heuristics: Normal</span>
                   )}
                </div>
              </div>
           </div>

           <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6 mb-8">
                <ChevronRight className="w-5 h-5 text-[#F27D26]" />
                <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Verif_Kernel</h4>
              </div>
              <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 overflow-auto max-h-[240px] leading-[1.8] scrollbar-hide text-left">
                <span className="text-[#00FF00]/60">[[ SYSINIT_SEQUENCE ]]</span><br/>
                [SYSTEM] Scanning QR Payload...<br/>
                [DEBUG] Entry: {result.originalUrl.substring(0, 32)}...<br/>
                [TRACE] Traversing Node Path...<br/>
                {result.redirectChain.map((u, i) => (
                  <span key={i} className={i === result.redirectChain.length - 1 ? 'text-[#F27D26]' : ''}>
                    [HOP_{i}] → {new URL(u.startsWith('http') ? u : 'https://' + u).hostname}<br/>
                  </span>
                ))}
                [HEURISTIC] Inspecting Domain Profile...<br/>
                [SCORE] Aggregate Intensity: {result.riskScore}%<br/>
                [STATE] Conclusion: {result.riskLevel.toUpperCase()}<br/>
                <span className="text-[#00FF00]/60">[[ SEQUENCE_TERMINATED ]]</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

