export enum RiskLevel {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGEROUS = 'dangerous',
}

export interface AnalysisDetails {
  usesIpAddress: boolean;
  isHttps: boolean;
  subdomainDepth: number;
  urlLength: number;
  hyphenCount: number;
  suspiciousKeywords: string[];
  suspiciousTLD: boolean;
  isShortened: boolean;
}

export interface ScanResult {
  originalUrl: string;
  finalUrl: string;
  redirectChain: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  analysis: AnalysisDetails;
  timestamp: string;
}
