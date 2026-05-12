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
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  });

  // API Routes
  app.post('/api/scan', upload.single('qrImage'), async (req, res, next) => {
    try {
      console.log('Received scan request');
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      console.log('Extracting URL from image...');
      const originalUrl = await extractUrlFromImage(req.file.buffer);
      console.log('Extracted URL:', originalUrl);
      
      const result = await processAnalysis(originalUrl);
      res.json(result);
    } catch (error: any) {
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
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      path: req.path
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
