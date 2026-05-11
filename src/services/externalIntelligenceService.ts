import { RiskFactor } from '../types';

interface ExternalThreatResult {
  score: number;
  factors: RiskFactor[];
  forceDangerous?: boolean;
}

// Simple in-memory cache
const vtCache = new Map<string, ExternalThreatResult>();

// Rate limiting for VT (15s between requests)
let lastVtRequestTime = 0;
const VT_COOLDOWN = 15000;

/**
 * Google Safe Browsing API Check
 * // TODO: 실제 배포 시 백엔드(Express)로 이전 필요
 */
async function checkSafeBrowsing(url: string): Promise<ExternalThreatResult | null> {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: "quishield", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data && data.matches && data.matches.length > 0) {
      return {
        score: 100,
        factors: [{ factor: "Google Safe Browsing 데이터베이스 일치", impact: 100 }],
        forceDangerous: true
      };
    }
    return { score: 0, factors: [] };
  } catch (err) {
    console.warn('[SAFE_BROWSING] Check failed:', err);
    return null; // Return null to indicate network/API failure
  }
}

/**
 * VirusTotal API Check
 * // TODO: 실제 배포 시 백엔드(Express)로 이전 필요
 */
async function checkVirusTotal(url: string): Promise<ExternalThreatResult | null> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return null;

  // Check cache
  if (vtCache.has(url)) {
    console.log('[VIRUSTOTAL] Returning cached result for:', url);
    return vtCache.get(url)!;
  }

  // Manage rate limit
  const now = Date.now();
  const timeSinceLast = now - lastVtRequestTime;
  if (timeSinceLast < VT_COOLDOWN) {
    const wait = VT_COOLDOWN - timeSinceLast;
    console.log(`[VIRUSTOTAL] Rate limiting. Waiting ${wait}ms...`);
    await new Promise(resolve => setTimeout(resolve, wait));
  }

  try {
    lastVtRequestTime = Date.now();
    // VT URL ID is base64 without padding
    const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
    
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': apiKey }
    });

    if (response.status === 404) {
      return { score: 0, factors: [] };
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const maliciousCount = data?.data?.attributes?.last_analysis_stats?.malicious || 0;

    let result: ExternalThreatResult;
    if (maliciousCount > 0) {
      const impact = Math.min(100, maliciousCount * 10);
      result = {
        score: impact,
        factors: [{ factor: `VirusTotal: ${maliciousCount}개 엔진에서 악성 탐지`, impact }]
      };
    } else {
      result = { score: 0, factors: [] };
    }
    
    vtCache.set(url, result);
    return result;

  } catch (err) {
    console.warn('[VIRUSTOTAL] Check failed:', err);
    return null; // Return null to indicate network/API failure
  }
}

export async function checkExternalIntelligence(url: string): Promise<ExternalThreatResult> {
  const results: ExternalThreatResult = { score: 0, factors: [] };
  let apiFailure = false;

  try {
    // Run in parallel
    const [sbResult, vtResult] = await Promise.all([
      checkSafeBrowsing(url),
      checkVirusTotal(url)
    ]);

    if (sbResult === null || vtResult === null) {
      apiFailure = true;
    }

    if (sbResult) {
      if (sbResult.forceDangerous) {
        results.score = 100;
        results.forceDangerous = true;
      }
      results.factors.push(...sbResult.factors);
    }

    if (vtResult) {
      if (!results.forceDangerous) {
        results.score += vtResult.score;
      }
      results.factors.push(...vtResult.factors);
    }

  } catch (globalErr) {
    console.error('[EXT_INTEL] Global failure:', globalErr);
    apiFailure = true;
  }

  if (apiFailure) {
    results.factors.push({ factor: "외부 위협 DB 조회 불가 (네트워크 제한)", impact: 0 });
  }

  results.score = Math.min(100, results.score);
  return results;
}
