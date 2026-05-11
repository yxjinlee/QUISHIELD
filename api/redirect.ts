import { traceRedirects, traceRedirectsWithPuppeteer } from '../src/services/redirectService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, usePuppeteer } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    const chain = usePuppeteer 
      ? await traceRedirectsWithPuppeteer(url)
      : await traceRedirects(url);

    return res.status(200).json({ chain });
  } catch (error: any) {
    console.error('Redirect Trace Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
