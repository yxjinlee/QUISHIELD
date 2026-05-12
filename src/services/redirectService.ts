export async function traceRedirects(initialUrl: string): Promise<string[]> {
  // Ensure the URL has a protocol
  let sanitizedUrl = initialUrl.trim();
  if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
    sanitizedUrl = 'https://' + sanitizedUrl;
  }

  const chain: string[] = [sanitizedUrl];
  let currentUrl = sanitizedUrl;
  const maxRedirects = 10;
  const timeoutMs = 5000;
  
  try {
    for (let i = 0; i < maxRedirects; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch(currentUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          clearTimeout(timeoutId);

          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              const nextUrl = new URL(location, currentUrl).toString();
              if (chain.includes(nextUrl)) break;
              chain.push(nextUrl);
              currentUrl = nextUrl;
            } else {
              break;
            }
          } else {
            break;
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          console.error(`Fetch error for ${currentUrl}:`, fetchError.message);
          break;
        }
    }
  } catch (error) {
    console.error('Error tracing redirects:', error);
  }
  
  return chain;
}
