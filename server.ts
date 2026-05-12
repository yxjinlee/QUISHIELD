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

  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post('/api/scan', upload.single('qrImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }

      // 1. Extract URL
      const originalUrl = await extractUrlFromImage(req.file.buffer);
      
      const result = await processAnalysis(originalUrl);
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

  async function processAnalysis(originalUrl: string) {
    // 2. Trace Redirects
    const redirectChain = await traceRedirects(originalUrl);
    const finalUrl = redirectChain[redirectChain.length - 1];

    // 3. Analyze
    const { score, level, details } = analyzeUrl(originalUrl, finalUrl, redirectChain);

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
