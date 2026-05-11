import { processAnalysis } from '../src/services/analysisManager';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const result = await processAnalysis(url);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Analysis Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
