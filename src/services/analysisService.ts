import { AnalysisDetails, RiskLevel } from '../types';

const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'update', 'account', 'secure', 'bank', 'confirm',
  'billing', 'signin', 'support', 'service', 'validation', 'microsoft',
  'google', 'paypal', 'apple', 'amazon', 'netflix'
];

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.pw', '.icu', '.monster', '.loan', '.click', '.tk', '.ml', '.ga', '.cf', '.gq'
];

const SHORTENED_DOMAINS = [
  'bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'is.gd', 'buff.ly', 'ow.ly'
];

export function analyzeUrl(url: string, finalUrl: string, redirectChain: string[]): { score: number; level: RiskLevel; details: AnalysisDetails } {
  const urlObj = new URL(url);
  const finalUrlObj = new URL(finalUrl);
  
  const details: AnalysisDetails = {
    usesIpAddress: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(urlObj.hostname),
    isHttps: urlObj.protocol === 'https:',
    subdomainDepth: urlObj.hostname.split('.').length - 2,
    urlLength: url.length,
    hyphenCount: (urlObj.hostname.match(/-/g) || []).length,
    suspiciousKeywords: SUSPICIOUS_KEYWORDS.filter(k => url.toLowerCase().includes(k)),
    suspiciousTLD: SUSPICIOUS_TLDS.some(tld => urlObj.hostname.endsWith(tld)),
    isShortened: SHORTENED_DOMAINS.some(domain => urlObj.hostname.includes(domain))
  };

  let score = 0;

  // Analysis logic
  if (!details.isHttps) score += 30;
  if (details.usesIpAddress) score += 50;
  if (details.subdomainDepth > 2) score += 15;
  if (details.urlLength > 100) score += 10;
  if (details.hyphenCount > 2) score += 15;
  if (details.suspiciousKeywords.length > 0) score += 20 * details.suspiciousKeywords.length;
  if (details.suspiciousTLD) score += 40;
  if (details.isShortened) score += 10;

  // Redirect-specific scoring
  if (redirectChain.length > 2) score += 20;
  if (urlObj.hostname !== finalUrlObj.hostname) score += 25;

  // Normalize score
  score = Math.min(100, score);

  let level = RiskLevel.SAFE;
  if (score >= 70) level = RiskLevel.DANGEROUS;
  else if (score >= 30) level = RiskLevel.WARNING;

  return { score, level, details };
}
