import { Shield, Globe, Type, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { AnalysisDetails as AnalysisDetailsType } from '../../types';

interface AnalysisDetailsProps {
  analysis: AnalysisDetailsType;
  score: number;
}

export default function AnalysisDetails({ analysis, score }: AnalysisDetailsProps) {
  const getItemStatus = (val: boolean | number, type: 'protocol' | 'hostname' | 'keywords' | 'subdomain') => {
    switch (type) {
      case 'protocol':
        return val ? { text: 'POSITIVE', color: 'text-[#00FF00] bg-[#00FF00]/10 border-[#00FF00]/20' } : { text: 'SECURE_FAIL', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
      case 'hostname':
        return !(val as boolean) ? { text: 'SAFE', color: 'text-[#00FF00] bg-[#00FF00]/10 border-[#00FF00]/20' } : { text: 'SUSPICIOUS', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'keywords':
        return (val as number) === 0 ? { text: 'CLEAN', color: 'text-[#00FF00] bg-[#00FF00]/10 border-[#00FF00]/20' } : { text: 'FLAGGED', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
      case 'subdomain':
        return (val as number) <= 2 ? { text: 'LOW', color: 'text-[#00FF00] bg-[#00FF00]/10 border-[#00FF00]/20' } : { text: 'WARN', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      default:
        return { text: 'UKNOWN', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
    }
  };

  const protocol = getItemStatus(analysis.isHttps, 'protocol');
  const hostname = getItemStatus(analysis.isIpAddress, 'hostname');
  const keywords = getItemStatus(analysis.suspiciousKeywords.length, 'keywords');
  const subdomains = getItemStatus(analysis.subdomainDepth, 'subdomain');

  return (
    <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6 mb-8">
        <div className="p-2 bg-[#F27D26]/10 rounded-lg">
          <Shield className="w-5 h-5 text-[#F27D26]" />
        </div>
        <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Structural Analysis</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security Protocol</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{analysis.isHttps ? 'HTTPS Secure' : 'Insecure HTTP'}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${protocol.color}`}>{protocol.text}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hostname Format</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{analysis.isIpAddress ? 'IP Address Detected' : 'Standard Hostname'}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${hostname.color}`}>{hostname.text}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                <Type className="w-4 h-4 text-gray-400 dark:text-gray-500" />
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keywords Analysis</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{analysis.suspiciousKeywords.length} Detected</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${keywords.color}`}>{keywords.text}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                <Layers className="w-4 h-4 text-gray-400 dark:text-gray-500" />
             </div>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subdomain Depth</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{analysis.subdomainDepth} Levels</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${subdomains.color}`}>{subdomains.text}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risk Distribution Indicator</span>
          <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200">{score}% Intensity</span>
        </div>
        <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden border border-gray-200/50 dark:border-white/5">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${score}%` }}
             transition={{ duration: 1, ease: "easeOut" }}
             className={`h-full bg-gradient-to-r ${score > 70 ? 'from-[#F27D26] to-red-500' : 'from-[#F27D26] to-[#F27D26]'}`}
           />
        </div>
      </div>
    </div>
  );
}
