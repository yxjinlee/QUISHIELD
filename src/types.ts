export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AnalysisDetails {
  shortenerFound: boolean;
  suspiciousKeywords: string[];
  redirectCount: number;
  domainMismatch: boolean;
  isEncoded: boolean;
  isHttps: boolean;
  urlLength: number;
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
