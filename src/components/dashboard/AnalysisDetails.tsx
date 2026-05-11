import { AnalysisDetails as IAnalysisDetails, QrType } from '../../types';
import { AlertCircle, ShieldCheck, Link, Text, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

interface AnalysisDetailsProps {
  analysis: IAnalysisDetails;
  score: number;
  type?: QrType;
}

export default function AnalysisDetails({ analysis, score, type = QrType.URL }: AnalysisDetailsProps) {
  const isUrl = type === QrType.URL;
  
  const factors = [
    {
      icon: <ShieldCheck className="w-4 h-4" />,
      label: 'Security Protocol',
      value: !isUrl ? 'N/A' : (analysis.isHttps ? 'HTTPS Secure' : 'HTTP Insecure'),
      impact: !isUrl ? 'Neutral' : (analysis.isHttps ? 'Safe' : 'Critical'),
      color: !isUrl ? 'text-gray-400' : (analysis.isHttps ? 'text-[#00FF00]' : 'text-[#FF4444]'),
      hidden: !isUrl
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: 'Hostname Format',
      value: !isUrl ? 'N/A' : (analysis.usesIpAddress ? 'Direct IP Address' : 'Standard Hostname'),
      impact: !isUrl ? 'Neutral' : (analysis.usesIpAddress ? 'Critical' : 'Safe'),
      color: !isUrl ? 'text-gray-400' : (analysis.usesIpAddress ? 'text-[#FF4444]' : 'text-[#00FF00]'),
      hidden: !isUrl
    },
    {
      icon: <Text className="w-4 h-4" />,
      label: 'Content Pattern',
      value: isUrl ? `${analysis.suspiciousKeywords.length} Detected` : 'Pattern Scanned',
      impact: analysis.suspiciousKeywords.length > 0 ? 'Negative' : 'Clean',
      color: analysis.suspiciousKeywords.length > 0 ? 'text-[#F27D26]' : 'text-[#00FF00]'
    },
    {
      icon: <Link className="w-4 h-4" />,
      label: 'Payload Entropy',
      value: isUrl ? `${analysis.subdomainDepth} Levels` : `${analysis.urlLength} Bytes`,
      impact: isUrl ? (analysis.subdomainDepth > 2 ? 'Warning' : 'Low') : 'Verified',
      color: isUrl ? (analysis.subdomainDepth > 2 ? 'text-[#F27D26]' : 'text-[#888]') : 'text-[#00FF00]'
    }
  ];

  return (
    <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 bg-white dark:bg-[#0A0A0A] space-y-8 shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-50 dark:border-white/5 pb-6">
        <div className="p-2 bg-[#F27D26]/10 rounded-lg">
          <AlertCircle className="w-5 h-5 text-[#F27D26]" />
        </div>
        <h4 className="font-bold uppercase text-sm tracking-[0.1em] text-gray-800 dark:text-gray-200">Structural Analysis</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {factors.map((factor, i) => (
          <div key={i} className="p-5 rounded-2xl bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/10 hover:border-[#F27D26]/30 dark:hover:border-white/20 transition-all group">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white dark:bg-[#1A1A1A] text-[#F27D26] shadow-sm group-hover:scale-110 transition-transform border dark:border-white/5">
                {factor.icon}
              </div>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">{factor.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{factor.value}</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border border-current ${factor.color} bg-current/10`}>
                {factor.impact}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-50 dark:border-white/5">
        <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest">Risk Distribution Indicator</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{score}% Intensity</span>
        </div>
        <div className="h-2.5 w-full bg-gray-100 dark:bg-[#121212] rounded-full overflow-hidden flex shadow-inner border dark:border-white/10">
           <div className={`h-full transition-all duration-1000 ease-out ${score > 70 ? 'bg-[#FF4444]' : score > 30 ? 'bg-[#F27D26]' : 'bg-[#00FF00]'}`} 
                style={{ width: `${score}%` }}></div>
        </div>
        <div className="flex justify-between mt-3 font-mono text-[10px] font-bold text-gray-300 dark:text-gray-500">
           <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-[#FF4444]" /> THREAT_MAX</span>
           <span className="flex items-center gap-1">SYSTEM_SECURE <CheckCircle className="w-3 h-3 text-[#00FF00]" /></span>
        </div>
      </div>
    </div>
  );
}
