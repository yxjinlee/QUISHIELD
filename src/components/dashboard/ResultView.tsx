import { motion } from 'motion/react';
import { ExternalLink, CheckCircle, Globe, Copy, Check } from 'lucide-react';
import { ScanResult } from '../../types';
import { useState } from 'react';

interface ResultViewProps {
  result: ScanResult;
}

export default function ResultView({ result }: ResultViewProps) {
  const [copied, setCopied] = useState(false);

  const getRiskColor = () => {
    if (result.riskLevel === 'HIGH') return 'text-red-500';
    if (result.riskLevel === 'MEDIUM') return 'text-amber-500';
    return 'text-green-500';
  };

  const getRiskBg = () => {
    if (result.riskLevel === 'HIGH') return 'bg-red-500/10 border-red-500/20';
    if (result.riskLevel === 'MEDIUM') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.originalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-[2.5rem] bg-white dark:bg-[#0D0D0D] border border-gray-100 dark:border-white/10 shadow-2xl flex flex-col items-center text-center"
      >
        <div className={`mb-6 flex gap-4 items-center px-6 py-3 rounded-full border ${getRiskBg()}`}>
           <div className={`text-3xl font-mono font-bold ${getRiskColor()}`}>{result.riskScore}%</div>
           <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10" />
           <div className={`text-sm font-bold uppercase tracking-widest ${getRiskColor()}`}>RISK_{result.riskLevel}</div>
        </div>
        
        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 mb-2 tracking-tight">Intelligence Report</h3>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">Structural Analysis & Redirect Trace Complete</p>

        <div className="w-full bg-gray-50 dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 mb-8 relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-1.5 bg-[#F27D26]/10 rounded-lg">
                <Globe className="w-4 h-4 text-[#F27D26]" />
             </div>
             <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">QR_DECODED_URL</span>
          </div>
          <p className="text-xl font-mono text-gray-800 dark:text-[#F27D26] break-all leading-relaxed font-bold mb-6">
            {result.originalUrl}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
             {[
               { label: 'Subdomains', value: result.analysis.subdomainDepth, status: result.analysis.subdomainDepth > 2 ? 'warning' : 'safe' },
               { label: 'Hyphens', value: result.analysis.hyphenCount, status: result.analysis.hyphenCount > 2 ? 'warning' : 'safe' },
               { label: 'Security', value: result.analysis.isHttps ? 'HTTPS' : 'HTTP Only', status: result.analysis.isHttps ? 'safe' : 'danger' },
               { label: 'Hostname', value: result.analysis.isIpAddress ? 'IP ADDR' : 'Domain', status: result.analysis.isIpAddress ? 'danger' : 'safe' }
             ].map((feature, idx) => (
               <div key={idx} className="p-3 bg-white dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 text-left">
                 <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">{feature.label}</div>
                 <div className={`text-xs font-mono font-bold ${feature.status === 'danger' ? 'text-red-500' : feature.status === 'warning' ? 'text-amber-500' : 'text-green-500'}`}>
                   {feature.value}
                 </div>
               </div>
             ))}
          </div>

          {result.redirectChain.length > 1 && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-white/10 text-left">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold block mb-4">Redirect_Chain_Chain</span>
              <div className="space-y-4">
                {result.redirectChain.map((url, i) => (
                  <div key={i} className="flex gap-4 group/hop">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-mono text-[10px] font-bold ${i === result.redirectChain.length - 1 ? 'bg-[#F27D26] text-white border-[#F27D26]' : 'bg-white dark:bg-[#222] text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10'}`}>
                        {i + 1}
                      </div>
                      {i < result.redirectChain.length - 1 && (
                        <div className="w-[2px] flex-1 bg-gray-200 dark:bg-white/5 my-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5">
                       <p className={`text-xs font-mono break-all leading-relaxed ${i === result.redirectChain.length - 1 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                         {url}
                       </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button 
            onClick={handleCopy}
            className="flex-1 px-8 py-5 bg-white dark:bg-[#1A1A1A] text-gray-800 dark:text-white border border-gray-200 dark:border-white/10 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-[#222] transition-all transform active:scale-95 shadow-sm flex items-center justify-center gap-3"
          >
            {copied ? <Check className="w-5 h-5 text-[#00FF00]" /> : <Copy className="w-5 h-5 text-[#F27D26]" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <a 
            href={result.originalUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 px-8 py-5 bg-[#F27D26] text-white rounded-2xl font-bold hover:bg-[#d66a1e] transition-all transform active:scale-95 shadow-xl shadow-[#F27D26]/30 dark:shadow-[#F27D26]/20 flex items-center justify-center gap-3"
          >
            <ExternalLink className="w-5 h-5" />
            Open Link
          </a>
        </div>

        <p className="mt-8 text-[10px] font-mono text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em]">
          SECURITY_VERIFIED :: END_OF_TRANSMISSION
        </p>
      </motion.div>
    </div>
  );
}
