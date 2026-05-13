import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Minimal health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.1.0' });
});

// Redirect Tracing & Analysis Logic
function analyzeUrlStructure(url: string) {
  const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
  const hostname = urlObj.hostname;
  const path = urlObj.pathname;

  const features = {
    isHttps: urlObj.protocol === 'https:',
    hyphenCount: (hostname.match(/-/g) || []).length,
    subdomainDepth: hostname.split('.').length - 2, // e.g., app.example.com -> 3 parts - 2 = 1 subdomain
    isIpAddress: /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname),
    urlLength: url.length,
    suspiciousKeywords: ['login', 'verify', 'update', 'account', 'bank', 'secure', 'signin', 'support'].filter(k => url.toLowerCase().includes(k))
  };

  // Heuristic-based risk scoring (Simulating a classifier approach)
  let score = 0;
  if (!features.isHttps) score += 40;
  if (features.isIpAddress) score += 50;
  if (features.hyphenCount > 2) score += 20;
  if (features.subdomainDepth > 2) score += 25;
  if (features.urlLength > 100) score += 15;
  score += features.suspiciousKeywords.length * 20;

  let level = 'LOW';
  if (score >= 70) level = 'HIGH';
  else if (score >= 30) level = 'MEDIUM';

  return {
    score: Math.min(score, 100),
    level,
    details: {
      ...features,
      shortenerFound: ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com'].some(s => hostname.includes(s))
    }
  };
}

async function traceRedirects(initialUrl: string): Promise<string[]> {
  let current = initialUrl.trim();
  if (!current.startsWith('http')) current = 'https://' + current;
  const chain: string[] = [current];
  const maxHops = 10;
  
  try {
    for (let i = 0; i < maxHops; i++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout per hop

      try {
        const res = await fetch(current, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
          }
        });
        clearTimeout(timeoutId);

        const location = res.headers.get('location');
        if (location && res.status >= 300 && res.status < 400) {
          const nextUrl = new URL(location, current).toString();
          if (chain.includes(nextUrl)) break; // Cycle detected
          chain.push(nextUrl);
          current = nextUrl;
        } else {
          break; // End of chain
        }
      } catch (err) {
        clearTimeout(timeoutId);
        break;
      }
    }
  } catch (err) {
    console.error('Tracing error:', err);
  }
  return chain;
}

app.post('/api/trace', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  const chain = await traceRedirects(url);
  const finalUrl = chain[chain.length - 1];
  const analysis = analyzeUrlStructure(finalUrl);
  
  res.json({ 
    chain,
    analysis: {
      ...analysis,
      redirectCount: chain.length - 1
    }
  });
});

// Environment setup for local dev / production
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
