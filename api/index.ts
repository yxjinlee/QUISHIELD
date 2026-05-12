import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jsQR from 'jsqr';
import { Jimp } from 'jimp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Global logging
app.use((req, res, next) => {
  console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// TYPES (Local to keep self-contained)
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

// LOGIC: QR Extraction
async function extractUrlFromImage(buffer: Buffer): Promise<string> {
  console.log(`[QR] Processing buffer. Length: ${buffer.length}, Hex start: ${buffer.slice(0, 8).toString('hex')}`);
  try {
    // Ensure we are working with a fresh view of the data
    const dataArray = Uint8Array.from(buffer);
    
    // In Jimp v1.x, we pass the buffer/array directly
    const image = await Jimp.read(dataArray as any);
    console.log(`[QR] Image loaded: ${image.width}x${image.height}`);
    
    const { data, width, height } = image.bitmap;
    
    // jsQR expects Uint8ClampedArray
    const code = jsQR(new Uint8ClampedArray(data), width, height, {
      inversionAttempts: "dontInvert"
    });
    
    if (code && code.data) {
      console.log(`[QR] Decoded: ${code.data}`);
      return code.data;
    }

    // Try again with inversion just in case
    const codeInverted = jsQR(new Uint8ClampedArray(data), width, height, {
      inversionAttempts: "attemptBoth"
    });

    if (codeInverted && codeInverted.data) return codeInverted.data;

    throw new Error('QR code not detected in image. Please try a clearer picture.');
  } catch (err: any) {
    console.error(`[QR FAIL] ${err.message}`);
    throw new Error(`QR Extraction failed: ${err.message}`);
  }
}

// LOGIC: Redirect Tracing
async function traceRedirects(initialUrl: string): Promise<string[]> {
  let current = initialUrl.trim();
  if (!current.startsWith('http')) current = 'https://' + current;
  const chain: string[] = [current];
  const max = 8;
  
  try {
    for (let i = 0; i < max; i++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(current, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        clearTimeout(id);
        const loc = res.headers.get('location');
        if (loc && (res.status >= 300 && res.status < 400)) {
          const next = new URL(loc, current).toString();
          if (chain.includes(next)) break;
          chain.push(next);
          current = next;
        } else break;
      } catch {
        clearTimeout(id);
        break;
      }
    }
  } catch {}
  return chain;
}

// LOGIC: Analysis
function analyzeUrl(originalUrl: string, finalUrl: string, chain: string[]) {
  const suspicious = ['login', 'verify', 'update', 'account', 'secure', 'bank', 'confirm', 'password', 'signin', 'support'];
  const shorteners = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'is.gd', 'buff.ly', 'ow.ly'];
  
  const details: AnalysisDetails = {
    shortenerFound: shorteners.some(s => originalUrl.toLowerCase().includes(s)),
    suspiciousKeywords: suspicious.filter(k => finalUrl.toLowerCase().includes(k)),
    redirectCount: chain.length - 1,
    domainMismatch: false,
    isEncoded: /%[0-9A-F]{2}/i.test(originalUrl) || /base64/i.test(originalUrl),
    isHttps: finalUrl.startsWith('https:'),
    urlLength: finalUrl.length
  };

  try {
    const oDomain = new URL(originalUrl.startsWith('http') ? originalUrl : 'https://'+originalUrl).hostname;
    const fDomain = new URL(finalUrl).hostname;
    details.domainMismatch = oDomain !== fDomain && !details.shortenerFound;
  } catch {}

  let score = 0;
  if (!details.isHttps) score += 20;
  if (details.shortenerFound) score += 20;
  if (details.redirectCount > 1) score += 15 * (details.redirectCount - 1);
  if (details.suspiciousKeywords.length > 0) score += 25 * details.suspiciousKeywords.length;
  if (details.domainMismatch) score += 30;
  if (details.isEncoded) score += 15;
  if (details.urlLength > 150) score += 15;

  let level = RiskLevel.LOW;
  if (score >= 70) level = RiskLevel.CRITICAL;
  else if (score >= 40) level = RiskLevel.HIGH;
  else if (score >= 20) level = RiskLevel.MEDIUM;

  return { score: Math.min(score, 100), level, details };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', time: new Date().toISOString() });
});

app.post('/api/scan', upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = await extractUrlFromImage(req.file.buffer);
    const chain = await traceRedirects(url);
    const final = chain[chain.length - 1];
    const analysis = analyzeUrl(url, final, chain);
    res.json({
      originalUrl: url,
      finalUrl: final,
      redirectChain: chain,
      riskScore: analysis.score,
      riskLevel: analysis.level,
      analysis: analysis.details,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const chain = await traceRedirects(url);
    const final = chain[chain.length - 1];
    const analysis = analyzeUrl(url, final, chain);
    res.json({
      originalUrl: url,
      finalUrl: final,
      redirectChain: chain,
      riskScore: analysis.score,
      riskLevel: analysis.level,
      analysis: analysis.details,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[CRITICAL SERVER ERROR]', err);
  res.status(500).json({ 
    error: 'A server error occurred. Please try again later.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Environment setup for local dev
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const startDev = async () => {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => console.log(`Dev Server running at http://localhost:${PORT}`));
  };
  startDev().catch(console.error);
} else if (!process.env.VERCEL) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => console.log(`Prod Server running at http://localhost:${PORT}`));
}

export default app;
