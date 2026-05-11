import { RedirectHop, QrType, RiskFactor, RiskLevel } from '../types';
import { traceRedirects, traceRedirectsWithPuppeteer } from './redirectService';
import { classifyContent, analyzePayload, TRUSTED_DOMAINS } from './analysisService';
import { checkExternalIntelligence } from './externalIntelligenceService';

/**
 * Cloaking Detection Logic
 */
export async function detectCloaking(url: string): Promise<{ detected: boolean; factor: string; impact: number } | null> {
  const uaBot = 'Googlebot/2.1';
  const uaUser = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

  console.log('[CLOAKING] Running check...');
  try {
    const [resBot, resUser] = await Promise.all([
      fetch(url, { headers: { 'User-Agent': uaBot } }),
      fetch(url, { headers: { 'User-Agent': uaUser } })
    ]);

    const finalUrlBot = resBot.url;
    const finalUrlUser = resUser.url;

    const bodyBot = await resBot.text();
    const bodyUser = await resUser.text();

    const diffLength = Math.max(bodyBot.length, bodyUser.length) > 0 
      ? Math.abs(bodyBot.length - bodyUser.length) / Math.max(bodyBot.length, bodyUser.length)
      : 0;
      
    const isUrlDifferent = new URL(finalUrlBot).hostname !== new URL(finalUrlUser).hostname;

    if (diffLength > 0.3 || isUrlDifferent) {
      console.log(`[CLOAKING] Detected! Diff: ${Math.round(diffLength * 100)}%, URI Diff: ${isUrlDifferent}`);
      return { detected: true, factor: '콘텐츠 클로킹 감지', impact: 40 };
    }
  } catch (err) {
    console.warn('[CLOAKING] Detection failed:', err);
  }
  return null;
}

export async function processAnalysis(payload: string) {
  console.log(`[ANALYSIS] Starting for: ${payload.substring(0, 50)}...`);
  try {
    // 1. Classify
    const type = classifyContent(payload);
    
    let redirectChain: RedirectHop[] = [];
    let finalUrl = payload;
    const additionalFactors: RiskFactor[] = [];

    // 2. Trace Redirects (only for URLs)
    if (type === QrType.URL) {
      try {
        const [fetchChain, pupChain, cloakingResult, extIntel] = await Promise.all([
          traceRedirects(payload),
          traceRedirectsWithPuppeteer(payload).catch(e => {
            console.warn('[ANALYSIS] Puppeteer failed, using fetch only', e);
            return [];
          }),
          detectCloaking(payload),
          checkExternalIntelligence(payload)
        ]);

        // Select longer chain
        redirectChain = (fetchChain?.length || 0) >= (pupChain?.length || 0) ? fetchChain : pupChain;
        finalUrl = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].url : payload;

        if (cloakingResult) {
          const finalHost = new URL(finalUrl).hostname;
          const isFinalTrusted = TRUSTED_DOMAINS.some(domain => finalHost.endsWith(domain));
          
          if (!isFinalTrusted) {
            additionalFactors.push({ factor: cloakingResult.factor, impact: cloakingResult.impact });
          } else {
            additionalFactors.push({ factor: `${cloakingResult.factor} (Ignored for Trusted Domain)`, impact: 0 });
          }
        }

        if (extIntel) {
          additionalFactors.push(...extIntel.factors);
          if (extIntel.forceDangerous) {
            (payload as any)._forceDangerous = true; 
          }
        }
      } catch (err) {
        console.warn('[ANALYSIS] Redirect tracing failed, using fallback:', err);
        redirectChain = [{ url: payload, status: 0 }];
      }
    } else {
      redirectChain = [{ url: payload, status: 200 }];
    }

    // 3. Analyze
    const { score: baseScore, level: baseLevel, details, breakdown: baseBreakdown } = analyzePayload(payload, type, redirectChain);

    let score = baseScore;
    const breakdown = [...baseBreakdown];
    let forceDangerous = (payload as any)._forceDangerous || false;
    
    additionalFactors.forEach(f => {
      score += f.impact;
      breakdown.push(f);
    });

    score = Math.min(100, score);
    if (forceDangerous) score = 100;

    let level = baseLevel;
    if (score >= 70 || forceDangerous) level = RiskLevel.DANGEROUS;
    else if (score >= 30) level = RiskLevel.WARNING;
    else level = RiskLevel.SAFE;

    return {
      originalUrl: payload,
      finalUrl,
      redirectChain,
      riskScore: score,
      riskLevel: level,
      analysis: details,
      breakdown,
      type,
      timestamp: new Date().toISOString()
    };
  } catch (globalErr: any) {
    console.error('[ANALYSIS] Critical failure, returning SAFE fallback:', globalErr);
    return {
      originalUrl: payload,
      finalUrl: payload,
      redirectChain: [{ url: payload, status: 0 }],
      riskScore: 50,
      riskLevel: RiskLevel.WARNING,
      analysis: {
        usesIpAddress: false,
        isHttps: false,
        subdomainDepth: 0,
        urlLength: payload.length,
        hyphenCount: 0,
        suspiciousKeywords: [],
        suspiciousTLD: false,
        isShortened: false
      },
      breakdown: [{ factor: 'Security Analysis Error (Recovery Mode)', impact: 50 }],
      type: QrType.TEXT,
      timestamp: new Date().toISOString(),
      errorRecovered: true
    };
  }
}
