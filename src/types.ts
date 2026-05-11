export enum RiskLevel {
  SAFE = 'safe',
  WARNING = 'warning',
  DANGEROUS = 'dangerous',
}

export enum QrType {
  URL = 'url',
  TEXT = 'text',
  WIFI = 'wifi',
  VCARD = 'vcard',
  ENCODED = 'encoded',
}

export interface RiskFactor {
  factor: string;
  impact: number;
}

export interface RedirectHop {
  url: string;
  status: number;
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
  redirectChain: RedirectHop[];
  riskScore: number;
  riskLevel: RiskLevel;
  analysis: AnalysisDetails;
  breakdown: RiskFactor[];
  type: QrType;
  timestamp: string;
}
