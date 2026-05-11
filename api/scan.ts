import multer from 'multer';
import { extractUrlFromImage } from '../src/services/qrService';
import { processAnalysis } from '../src/services/analysisManager';

const upload = multer({ storage: multer.memoryStorage() });

// Helper to run middleware
const runMiddleware = (req: any, res: any, fn: any) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export const config = {
  api: {
    bodyParser: false, // Disabling bodyParser to let multer handle it
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, upload.single('qrImage'));

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const content = await extractUrlFromImage(req.file.buffer);
    const result = await processAnalysis(content);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Scan Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
