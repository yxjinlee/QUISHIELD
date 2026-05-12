export async function traceRedirects(initialUrl: string): Promise<string[]> {
  const chain: string[] = [initialUrl];
  let currentUrl = initialUrl;
  const maxRedirects = 10;
  
  try {
    for (let i = 0; i < maxRedirects; i++) {
       // We use a fetch with redirect manual to capture the path
       const response = await fetch(currentUrl, {
         method: 'HEAD', // Faster than GET
         redirect: 'manual',
         headers: {
           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
         }
       });

       if (response.status >= 300 && response.status < 400) {
         const location = response.headers.get('location');
         if (location) {
           // Handle relative URLs
           const nextUrl = new URL(location, currentUrl).toString();
           if (chain.includes(nextUrl)) break; // Prevent loops
           chain.push(nextUrl);
           currentUrl = nextUrl;
         } else {
           break;
         }
       } else {
         break;
       }
    }
  } catch (error) {
    console.error('Error tracing redirects:', error);
    // Even on error, we return what we have so far
  }
  
  return chain;
}
