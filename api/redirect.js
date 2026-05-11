import puppeteer from 'puppeteer';

async function traceRedirects(initialUrl) {
  const chain = [];
  let currentUrl = initialUrl;
  const maxRedirects = 8;
  try {
    for (let i = 0; i < maxRedirects; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        try {
          const response = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          clearTimeout(timeoutId);
          chain.push({ url: currentUrl, status: response.status });
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              const nextUrl = new URL(location, currentUrl).toString();
              if (chain.some(h => h.url === nextUrl)) break;
              currentUrl = nextUrl;
              continue;
            }
          } 
          if (response.status === 200) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
              const text = await response.text();
              const metaMatch = text.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i);
              if (metaMatch && metaMatch[1]) {
                const nextUrl = new URL(metaMatch[1], currentUrl).toString();
                if (chain.some(h => h.url === nextUrl)) break;
                currentUrl = nextUrl;
                continue;
              }
            }
          }
          break;
        } catch (innerErr) {
          clearTimeout(timeoutId);
          if (chain.length === 0) chain.push({ url: currentUrl, status: 0 });
          break;
        }
    }
  } catch (error) {}
  return chain;
}

async function traceRedirectsWithPuppeteer(initialUrl) {
  const chain = [];
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      if (status >= 300 && status < 400) {
        chain.push({ url, status });
      }
    });
    await page.goto(initialUrl, { waitUntil: 'networkidle2', timeout: 7000 });
    const finalUrl = page.url();
    if (!chain.some(hop => hop.url === finalUrl)) {
      chain.push({ url: finalUrl, status: 200 });
    }
  } catch (err) {
    if (chain.length === 0) chain.push({ url: initialUrl, status: 0 });
  } finally {
    if (browser) await browser.close();
  }
  return chain;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, usePuppeteer } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const chain = usePuppeteer 
      ? await traceRedirectsWithPuppeteer(url)
      : await traceRedirects(url);

    return res.status(200).json({ chain });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
