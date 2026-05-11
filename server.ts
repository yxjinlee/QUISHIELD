import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractUrlFromImage } from './src/services/qrService';
import { traceRedirects, traceRedirectsWithPuppeteer } from './src/services/redirectService';
import { classifyContent, analyzePayload, TRUSTED_DOMAINS } from './src/services/analysisService';
import { checkExternalIntelligence } from './src/services/externalIntelligenceService';
import { QrType, RedirectHop, RiskLevel, RiskFactor } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post('/api/scan', upload.single('qrImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      // 1. Extract content from QR
      const content = await extractUrlFromImage(req.file.buffer);
      
      const result = await processAnalysis(content);
      res.json(result);
    } catch (error: any) {
      console.error('Scan Error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/analyze-url', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'No URL provided' });
      }

      const result = await processAnalysis(url);
      res.json(result);
    } catch (error: any) {
      console.error('Analysis Error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  /**
   * [추가 사항 3] Cloaking 탐지 로직
   */
  async function detectCloaking(url: string): Promise<{ detected: boolean; factor: string; impact: number } | null> {
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

  async function processAnalysis(payload: string) {
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
          /**
           * [추가 사항] 외부 인텔리전스 API 연동 및 분석 병렬화
           */
          const [fetchChain, pupChain, cloakingResult, extIntel] = await Promise.all([
            traceRedirects(payload),
            traceRedirectsWithPuppeteer(payload).catch(e => {
              console.warn('[ANALYSIS] Puppeteer failed, using fetch only', e);
              return [];
            }),
            detectCloaking(payload),
            checkExternalIntelligence(payload)
          ]);

          // 더 긴 체인을 선택
          redirectChain = (fetchChain?.length || 0) >= (pupChain?.length || 0) ? fetchChain : pupChain;
          finalUrl = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].url : payload;

          if (cloakingResult) {
            // [수정 사항 2] 최종 목적지가 신뢰 도메인이면 클로킹 점수 면제
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
              // 100점 강제 및 위험 레벨 고정 비트 설정 (나중에 처리)
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

      // 추가 요인 반영
      let score = baseScore;
      const breakdown = [...baseBreakdown];
      let forceDangerous = (payload as any)._forceDangerous || false;
      
      additionalFactors.forEach(f => {
        score += f.impact;
        breakdown.push(f);
      });

      // 최종 정규화
      score = Math.min(100, score);
      if (forceDangerous) score = 100;

      let level = baseLevel;
      if (score >= 70 || forceDangerous) level = RiskLevel.DANGEROUS;
      else if (score >= 30) level = RiskLevel.WARNING;
      else level = RiskLevel.SAFE;

      console.log(`[ANALYSIS] Complete. Score: ${score}, Level: ${level}`);
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
      // Fallback result to ensure UI doesn't break
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
