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

// Redirect Tracing Logic
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
  res.json({ chain });
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
