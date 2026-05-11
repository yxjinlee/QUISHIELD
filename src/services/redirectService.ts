import { RedirectHop } from '../types';
import puppeteer from 'puppeteer';

export async function traceRedirects(initialUrl: string): Promise<RedirectHop[]> {
  const chain: RedirectHop[] = [];
  let currentUrl = initialUrl;
  const maxRedirects = 8;
  
  try {
    for (let i = 0; i < maxRedirects; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout per hop

        try {
          const response = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
          });

          clearTimeout(timeoutId);
          chain.push({ url: currentUrl, status: response.status });

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              const nextUrl = new URL(location, currentUrl).toString();
              if (chain.some(h => h.url === nextUrl)) break; // Prevent loops
              currentUrl = nextUrl;
              continue;
            }
          } 
          
          // If 200 OK, check for meta refresh
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

          break; // No more redirects
        } catch (innerErr) {
          console.warn(`[REDIRECT] Hop ${i} failed or timed out:`, innerErr);
          clearTimeout(timeoutId);
          // If we have some chain, return it, otherwise break
          if (chain.length === 0) {
            chain.push({ url: currentUrl, status: 0 }); // Indicate failure
          }
          break;
        }
    }
  } catch (error) {
    console.error('Error tracing redirects:', error);
  }
  
  return chain;
}

/**
 * [추가 사항 2] Puppeteer 기반 JS 리다이렉트 추적
 */
export async function traceRedirectsWithPuppeteer(initialUrl: string): Promise<RedirectHop[]> {
  const chain: RedirectHop[] = [];
  console.log('[PUPPETEER] Starting JS-aware trace...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 리다이렉트 응답 수집
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      if (status >= 300 && status < 400) {
        chain.push({ url, status });
      }
    });

    await page.goto(initialUrl, {
      waitUntil: 'networkidle2',
      timeout: 7000
    });

    const finalUrl = page.url();
    if (!chain.some(hop => hop.url === finalUrl)) {
      chain.push({ url: finalUrl, status: 200 });
    }
  } catch (err) {
    console.error('[PUPPETEER] Failed:', err);
    if (chain.length === 0) {
      chain.push({ url: initialUrl, status: 0 });
    }
  } finally {
    if (browser) await browser.close();
  }

  return chain;
}
