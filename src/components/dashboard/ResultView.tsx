import { motion } from 'motion/react';
import { ExternalLink, AlertTriangle, CheckCircle, ShieldAlert, ChevronRight, Hash, Globe, MousePointerClick, RefreshCw } from 'lucide-react';
import { ScanResult, RiskLevel } from '../../types';
import AnalysisDetails from './AnalysisDetails';

interface ResultViewProps {
  result: ScanResult;
}

export default function ResultView({ result }: ResultViewProps) {
  const isDangerous = result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH;
  const isWarning = result.riskLevel === RiskLevel.MEDIUM;
  const isSafe = result.riskLevel === RiskLevel.LOW;

  const getStatusColor = () => {
    if (result.riskLevel === RiskLevel.CRITICAL) return 'text-[#FF4444]';
    if (result.riskLevel === RiskLevel.HIGH) return 'text-[#FF4444]';
    if (result.riskLevel === RiskLevel.MEDIUM) return 'text-[#F27D26]';
    return 'text-[#00FF00]';
  };

  const getStatusBg = () => {
    if (result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH) return 'bg-[#FF4444]/10 border-[#FF4444]/20';
    if (result.riskLevel === RiskLevel.MEDIUM) return 'bg-[#F27D26]/10 border-[#F27D26]/20';
    return 'bg-[#00FF00]/10 border-[#00FF00]/20';
  };

  const getStatusIcon = () => {
    if (result.riskLevel === RiskLevel.CRITICAL || result.riskLevel === RiskLevel.HIGH) return <ShieldAlert className="w-10 h-10 text-[#FF4444]" />;
    if (result.riskLevel === RiskLevel.MEDIUM) return <AlertTriangle className="w-10 h-10 text-[#F27D26]" />;
    return <CheckCircle className="w-10 h-10 text-[#00FF00]" />;
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
      </div>

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

            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-mono text-gray-500 dark:text-gray-500 uppercase font-bold block mb-3">Decoded QR Entry Point</label>
                <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSafe ? 'bg-gray-50 dark:bg-[#121212] border-gray-100 dark:border-white/10 hover:border-[#F27D26]/30' : 'bg-red-500/5 dark:bg-red-500/[0.03] border-red-500/20'}`}>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-mono truncate break-all ${isSafe ? 'text-gray-600 dark:text-gray-300' : 'text-red-500/70 dark:text-red-400/60'}`}>{result.originalUrl}</p>
                  </div>
                  {isSafe ? (
                    <a href={result.originalUrl} target="_blank" rel="noreferrer" className="p-2.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
                      <ExternalLink className="w-4 h-4 text-[#F27D26]" />
                    </a>
                  ) : (
                    <div className="p-2.5 bg-red-500/10 rounded-xl cursor-not-allowed group relative" title="Direct access blocked for security">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-mono">
                        NAVI_BLOCKED: Security policy prevents direct access to suspicious endpoints.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {result.redirectChain.length > 1 && (
                <div className="relative py-6">
                  <div className="absolute left-[2.25rem] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#F27D26] via-[#FF4444]/40 to-transparent"></div>
                  <div className="space-y-6">
                     {result.redirectChain.slice(1, -1).map((url, i) => (
                       <div key={i} className="flex items-center gap-6 ml-4">
                          <div className="z-10 w-10 h-10 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                            <RefreshCw className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                          <div className="flex-1 p-3 rounded-xl bg-gray-50 dark:bg-[#050505] border border-gray-100 dark:border-white/10 overflow-hidden group transition-all hover:border-gray-200 dark:hover:border-white/20">
                            <p className="text-[11px] font-mono text-gray-400 dark:text-gray-400 truncate">{url}</p>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-gray-500 dark:text-gray-500 uppercase font-bold block mb-3">Target Application Path</label>
                <div className={`flex items-center gap-5 p-5 rounded-2xl border shadow-inner ${isSafe ? 'bg-[#f8f9fa] dark:bg-[#121212] border-[#F27D26]/20' : 'bg-red-500/[0.02] border-red-500/30'}`}>
                  <div className={`p-3 rounded-xl shrink-0 ${isSafe ? 'bg-[#F27D26]/10' : 'bg-red-500/10'}`}>
                    <MousePointerClick className={`w-6 h-6 ${isSafe ? 'text-[#F27D26]' : 'text-red-500'}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-base font-extrabold break-all tracking-tight ${isSafe ? 'text-gray-900 dark:text-gray-100' : 'text-red-500 dark:text-red-400'}`}>{result.finalUrl}</p>
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
                   <span className="font-mono font-bold text-[#F27D26] bg-[#F27D26]/10 px-3 py-1 rounded-lg">+{result.redirectChain.length - 1}</span>
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
                   {result.analysis.isEncoded && <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-extrabold border border-amber-500/20 uppercase">ENCODED_PAYLOAD</span>}
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
              <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 overflow-auto max-h-[240px] leading-[1.8] scrollbar-none">
                <span className="text-[#00FF00]/60">[[ SYSINIT_SEQUENCE ]]</span><br/>
                [SYSTEM] Scanning QR Payload...<br/>
                [DEBUG] Entry: {result.originalUrl.substring(0, 32)}...<br/>
                [TRACE] Traversing Node Path...<br/>
                {result.redirectChain.map((u, i) => (
                  <span key={i} className={i === result.redirectChain.length - 1 ? 'text-[#F27D26]' : ''}>
                    [HOP_{i}] → {new URL(u).hostname}<br/>
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
