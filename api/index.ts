import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractUrlFromImage } from './services/qrService.js';
import { traceRedirects } from './services/redirectService.js';
import { analyzeUrl } from './services/analysisService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Global logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.5.2', time: new Date().toISOString() });
});

app.post('/api/scan', upload.single('qrImage'), async (req, res) => {
  try {
    console.log('--- SCAN REQUEST START ---');
    if (!req.file) {
      console.log('Error: No file in request');
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log(`Extracting URL from image: ${req.file.originalname} (${req.file.size} bytes)`);
    const originalUrl = await extractUrlFromImage(req.file.buffer);
    console.log('Extracted URL SUCCESS:', originalUrl);
    
    if (!originalUrl || originalUrl.trim().length === 0) {
      throw new Error('Extracted URL is empty or invalid.');
    }

    const result = await processAnalysis(originalUrl);
    console.log('--- SCAN REQUEST COMPLETE ---');
    res.json(result);
  } catch (error: any) {
    console.error('--- SCAN REQUEST FAILED ---');
    console.error(error);
    res.status(500).json({
      error: error.message || 'Scan processing failed',
      timestamp: new Date().toISOString()
    });
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
    console.error('Analyze URL error:', error);
    res.status(500).json({
      error: error.message || 'URL analysis failed',
      timestamp: new Date().toISOString()
    });
  }
});

async function processAnalysis(originalUrl: string) {
  console.log('Processing analysis for:', originalUrl);
  const redirectChain = await traceRedirects(originalUrl);
  console.log('Redirect chain:', redirectChain);
  const finalUrl = redirectChain[redirectChain.length - 1];

  const { score, level, details } = analyzeUrl(originalUrl, finalUrl, redirectChain);
  console.log('Analysis result:', { score, level });

  return {
    originalUrl,
    finalUrl,
    redirectChain,
    riskScore: score,
    riskLevel: level,
    analysis: details,
    timestamp: new Date().toISOString()
  };
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('--- GLOBAL SERVER ERROR ---');
  console.error(err);
  res.setHeader('Content-Type', 'application/json');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Vite and Static Files Handling (only for local development)
async function startApp() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    console.log('Starting Vite development server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Normal production server
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server v1.5.2 running on http://0.0.0.0:${PORT}`);
    });
  }
}

startApp().catch(err => {
  console.error("Start app error:", err);
});

export default app;
