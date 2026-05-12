import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractUrlFromImage } from './src/services/qrService';
import { traceRedirects } from './src/services/redirectService';
import { analyzeUrl } from './src/services/analysisService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Global logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
    res.json({ status: 'ok', version: '1.1', time: new Date().toISOString() });
  });

  app.post('/api/scan', upload.single('qrImage'), async (req, res, next) => {
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
      next(error);
    }
  });

  app.post('/api/analyze-url', async (req, res, next) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'No URL provided' });
      }

      const result = await processAnalysis(url);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  async function processAnalysis(originalUrl: string) {
    console.log('Processing analysis for:', originalUrl);
    // 2. Trace Redirects
    const redirectChain = await traceRedirects(originalUrl);
    console.log('Redirect chain:', redirectChain);
    const finalUrl = redirectChain[redirectChain.length - 1];

    // 3. Analyze
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SERVER ERROR:', err);
    // Ensure we always return JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
