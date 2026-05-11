import punycode from 'punycode';
import Levenshtein from 'fast-levenshtein';
import puppeteer from 'puppeteer';

const RiskLevel = {
  SAFE: 'safe',
  WARNING: 'warning',
  DANGEROUS: 'dangerous',
};

const QrType = {
  URL: 'url',
  TEXT: 'text',
  WIFI: 'wifi',
  VCARD: 'vcard',
  ENCODED: 'encoded',
};

const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'update', 'account', 'secure', 'bank', 'confirm',
  'billing', 'signin', 'support', 'service', 'validation', 'microsoft',
  'google', 'paypal', 'apple', 'amazon', 'netflix'
];

const SUSPICIOUS_TLDS = [
  '.xyz', '.top', '.pw', '.icu', '.monster', '.loan', '.click', '.tk', '.ml', '.ga', '.cf', '.gq'
];

const SHORTENED_DOMAINS = [
  'bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'is.gd', 'buff.ly', 'ow.ly'
];

const TRUSTED_DOMAINS = [
  'google.com', 'apple.com', 'microsoft.com', 'kakao.com', 'naver.com',
  'github.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com'
];

const BRAND_KEYWORDS = [
  'youtube', 'google', 'naver', 'kakao', 'paypal', 'apple', 'microsoft', 'netflix', 'instagram', 'facebook'
];

// --- External Intelligence Logic ---
const vtCache = new Map();
let lastVtRequestTime = 0;
const VT_COOLDOWN = 15000;

async function checkSafeBrowsing(url) {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: "quishield", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.matches && data.matches.length > 0) {
      return {
        score: 100,
        factors: [{ factor: "Google Safe Browsing 데이터베이스 일치", impact: 100 }],
        forceDangerous: true
      };
    }
    return { score: 0, factors: [] };
  } catch (err) {
    console.warn('[SAFE_BROWSING] Check failed:', err);
    return null;
  }
}

async function checkVirusTotal(url) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return null;
  if (vtCache.has(url)) return vtCache.get(url);
  const now = Date.now();
  const timeSinceLast = now - lastVtRequestTime;
  if (timeSinceLast < VT_COOLDOWN) {
    const wait = VT_COOLDOWN - timeSinceLast;
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  try {
    lastVtRequestTime = Date.now();
    const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': apiKey }
    });
    if (response.status === 404) return { score: 0, factors: [] };
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const maliciousCount = data?.data?.attributes?.last_analysis_stats?.malicious || 0;
    let result;
    if (maliciousCount > 0) {
      const impact = Math.min(100, maliciousCount * 10);
      result = {
        score: impact,
        factors: [{ factor: `VirusTotal: ${maliciousCount}개 엔진에서 악성 탐지`, impact }]
      };
    } else {
      result = { score: 0, factors: [] };
    }
    vtCache.set(url, result);
    return result;
  } catch (err) {
    console.warn('[VIRUSTOTAL] Check failed:', err);
    return null;
  }
}

async function checkExternalIntelligence(url) {
  const results = { score: 0, factors: [] };
  let apiFailure = false;
  try {
    const [sbResult, vtResult] = await Promise.all([
      checkSafeBrowsing(url),
      checkVirusTotal(url)
    ]);
    if (sbResult === null || vtResult === null) apiFailure = true;
    if (sbResult) {
      if (sbResult.forceDangerous) {
        results.score = 100;
        results.forceDangerous = true;
      }
      results.factors.push(...sbResult.factors);
    }
    if (vtResult) {
      if (!results.forceDangerous) results.score += vtResult.score;
      results.factors.push(...vtResult.factors);
    }
  } catch (globalErr) {
    apiFailure = true;
  }
  if (apiFailure) {
    results.factors.push({ factor: "외부 위협 DB 조회 불가 (네트워크 제한)", impact: 0 });
  }
  results.score = Math.min(100, results.score);
  return results;
}

// --- Redirect Logic ---
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

// --- Analysis Logic ---
function classifyContent(content) {
  const trimmed = content.trim();
  if (/^https?:\/\//i.test(trimmed)) return QrType.URL;
  if (/^WIFI:/i.test(trimmed)) return QrType.WIFI;
  if (/^BEGIN:VCARD/i.test(trimmed)) return QrType.VCARD;
  if (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed) && !trimmed.includes(' ')) return QrType.ENCODED;
  return QrType.TEXT;
}

function analyzePayload(content, type, redirectChain = [], depth = 0) {
  let score = 0;
  const breakdown = [];
  const safeChain = Array.isArray(redirectChain) ? redirectChain : [];
  const finalUrl = safeChain.length > 0 ? safeChain[safeChain.length - 1].url : content;
  const details = {
    usesIpAddress: false, isHttps: true, subdomainDepth: 0,
    urlLength: content?.length || 0, hyphenCount: 0,
    suspiciousKeywords: [], suspiciousTLD: false, isShortened: false
  };

  if (type === QrType.URL && content) {
    try {
      const urlObj = new URL(content);
      const finalUrlObj = new URL(finalUrl || content);
      details.usesIpAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(urlObj.hostname);
      details.isHttps = urlObj.protocol === 'https:';
      details.subdomainDepth = urlObj.hostname.split('.').length - 2;
      details.hyphenCount = (urlObj.hostname.match(/-/g) || []).length;
      details.suspiciousKeywords = SUSPICIOUS_KEYWORDS.filter(k => content.toLowerCase().includes(k));
      details.suspiciousTLD = SUSPICIOUS_TLDS.some(tld => urlObj.hostname.endsWith(tld));
      details.isShortened = SHORTENED_DOMAINS.some(domain => urlObj.hostname.includes(domain));

      const isTrusted = TRUSTED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
      const isFinalTrusted = TRUSTED_DOMAINS.some(domain => finalUrlObj.hostname.endsWith(domain));
      const isPunycode = urlObj.hostname.includes('xn--');

      if (isPunycode) {
        try {
          const unicodeHostname = punycode.toUnicode(urlObj.hostname);
          const isBrandSpoofing = BRAND_KEYWORDS.some(brand => {
            const distance = Levenshtein.get(unicodeHostname.split('.')[0], brand);
            return distance > 0 && distance <= 2;
          });
          if (isBrandSpoofing) {
            score += 60;
            breakdown.push({ factor: `Unicode 스푸핑 도메인 감지 (${unicodeHostname})`, impact: 60 });
          } else {
            score += 30;
            breakdown.push({ factor: `Punycode 도메인 사용 (${unicodeHostname})`, impact: 30 });
          }
        } catch (err) {}
      }

      if (!details.isHttps) { score += 30; breakdown.push({ factor: 'No HTTPS Encryption', impact: 30 }); }
      if (details.usesIpAddress) { score += 50; breakdown.push({ factor: 'IP-based Hostname', impact: 50 }); }
      if (details.subdomainDepth > 2) { score += 15; breakdown.push({ factor: 'Excessive Subdomains', impact: 15 }); }
      if (details.urlLength > 100) { score += 10; breakdown.push({ factor: 'Unusually Long URL', impact: 10 }); }
      if (details.hyphenCount > 2) { score += 15; breakdown.push({ factor: 'Domain Obfuscation (Hyphens)', impact: 15 }); }
      if (details.suspiciousKeywords.length > 0 && !isTrusted) {
        const impact = 20 * details.suspiciousKeywords.length;
        score += impact;
        breakdown.push({ factor: `Phishing Keywords (${details.suspiciousKeywords.join(', ')})`, impact });
      } else if (details.suspiciousKeywords.length > 0 && isTrusted) {
        breakdown.push({ factor: `Ignored Keywords on Trusted Domain (${details.suspiciousKeywords.join(', ')})`, impact: 0 });
      }
      if (details.suspiciousTLD) { score += 40; breakdown.push({ factor: 'Untrusted/High-Risk TLD', impact: 40 }); }
      if (details.isShortened) {
        const impact = isFinalTrusted ? 8 : 15;
        score += impact;
        breakdown.push({ factor: 'URL Shortener Detected', impact });
      }
      if (redirectChain.length > 2) { score += 25; breakdown.push({ factor: 'Deep Redirect Chain', impact: 25 }); }
      if (urlObj.hostname !== finalUrlObj.hostname) {
        if (!details.isShortened) {
          score += 30;
          breakdown.push({ factor: 'Domain Mismatch in Redirect', impact: 30 });
        } else {
          breakdown.push({ factor: 'Allowed Domain Change for Shortener', impact: 0 });
        }
      }
      const hostnameParts = urlObj.hostname.split('.');
      const mainDomain = (hostnameParts.length > 1 ? hostnameParts[hostnameParts.length - 2] : hostnameParts[0]).toLowerCase();
      if (!isTrusted && !isPunycode) {
        BRAND_KEYWORDS.forEach(brand => {
          const distance = Levenshtein.get(mainDomain, brand);
          if (distance > 0 && distance <= 2) {
            score += 60;
            breakdown.push({ factor: `유사 도메인 스푸핑 감지 (${mainDomain} ≈ ${brand})`, impact: 60 });
          }
        });
      }
      if (content.includes('eyJ')) { score += 30; breakdown.push({ factor: 'JWT 토큰 난독화 페이로드 감지', impact: 30 }); }
      if (/^ww[0-9]+\./i.test(urlObj.hostname)) { score += 20; breakdown.push({ factor: '도메인 파킹 패턴 감지', impact: 20 }); }
    } catch (e) {
      score += 20;
      breakdown.push({ factor: 'Invalid URL Format', impact: 20 });
    }
  } else if (type === QrType.TEXT) {
    const phishingKeywords = SUSPICIOUS_KEYWORDS.filter(k => content.toLowerCase().includes(k));
    if (phishingKeywords.length > 0) {
      score += 40;
      breakdown.push({ factor: 'Suspicious Keywords in Plain Text', impact: 40 });
    }
  } else if (type === QrType.VCARD) {
    const urlMatch = content.match(/URL(?:;|:)(?:[^:]*:)?([^\s\r\n]+)/i);
    if (urlMatch && urlMatch[1] && depth < 3) {
      const extractedUrl = urlMatch[1];
      const subAnalysis = analyzePayload(extractedUrl, QrType.URL, [], depth + 1);
      score += subAnalysis.score;
      breakdown.push({ factor: `Embedded URL Analytics in vCard (${extractedUrl})`, impact: subAnalysis.score });
    }
  } else if (type === QrType.ENCODED) {
    score += 30;
    breakdown.push({ factor: 'Obfuscated/Encoded Payload', impact: 30 });
    if (depth < 3) {
      try {
        const decoded = Buffer.from(content, 'base64').toString('utf-8');
        const decodedType = classifyContent(decoded);
        const subAnalysis = analyzePayload(decoded, decodedType, [], depth + 1);
        score += subAnalysis.score;
        breakdown.push({ factor: `Decoded Payload Security Depth ${depth + 1}`, impact: subAnalysis.score });
      } catch (err) {}
    }
  }
  score = Math.min(100, score);
  let level = RiskLevel.SAFE;
  if (score >= 70) level = RiskLevel.DANGEROUS;
  else if (score >= 30) level = RiskLevel.WARNING;
  return { score, level, details, breakdown };
}

async function detectCloaking(url) {
  const uaBot = 'Googlebot/2.1';
  const uaUser = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  try {
    const [resBot, resUser] = await Promise.all([
      fetch(url, { headers: { 'User-Agent': uaBot } }),
      fetch(url, { headers: { 'User-Agent': uaUser } })
    ]);
    const finalUrlBot = resBot.url;
    const finalUrlUser = resUser.url;
    const bodyBot = await resBot.text();
    const bodyUser = await resUser.text();
    const diffLength = Math.max(bodyBot.length, bodyUser.length) > 0 
      ? Math.abs(bodyBot.length - bodyUser.length) / Math.max(bodyBot.length, bodyUser.length)
      : 0;
    const isUrlDifferent = new URL(finalUrlBot).hostname !== new URL(finalUrlUser).hostname;
    if (diffLength > 0.3 || isUrlDifferent) {
      return { detected: true, factor: '콘텐츠 클로킹 감지', impact: 40 };
    }
  } catch (err) {}
  return null;
}

async function processAnalysis(payload) {
  try {
    const type = classifyContent(payload);
    let redirectChain = [];
    let finalUrl = payload;
    const additionalFactors = [];
    if (type === QrType.URL) {
      try {
        const [fetchChain, pupChain, cloakingResult, extIntel] = await Promise.all([
          traceRedirects(payload),
          traceRedirectsWithPuppeteer(payload).catch(e => []),
          detectCloaking(payload),
          checkExternalIntelligence(payload)
        ]);
        redirectChain = (fetchChain?.length || 0) >= (pupChain?.length || 0) ? fetchChain : pupChain;
        finalUrl = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].url : payload;
        if (cloakingResult) {
          const finalHost = new URL(finalUrl).hostname;
          const isFinalTrusted = TRUSTED_DOMAINS.some(domain => finalHost.endsWith(domain));
          if (!isFinalTrusted) {
            additionalFactors.push({ factor: cloakingResult.factor, impact: cloakingResult.impact });
          } else {
            additionalFactors.push({ factor: `${cloakingResult.factor} (Ignored for Trusted Domain)`, impact: 0 });
          }
        }
        if (extIntel) {
          additionalFactors.push(...extIntel.factors);
          if (extIntel.forceDangerous) payload._forceDangerous = true;
        }
      } catch (err) {
        redirectChain = [{ url: payload, status: 0 }];
      }
    } else {
      redirectChain = [{ url: payload, status: 200 }];
    }
    const { score: baseScore, level: baseLevel, details, breakdown: baseBreakdown } = analyzePayload(payload, type, redirectChain);
    let score = baseScore;
    const breakdown = [...baseBreakdown];
    let forceDangerous = payload._forceDangerous || false;
    additionalFactors.forEach(f => {
      score += f.impact;
      breakdown.push(f);
    });
    score = Math.min(100, score);
    if (forceDangerous) score = 100;
    let level = baseLevel;
    if (score >= 70 || forceDangerous) level = RiskLevel.DANGEROUS;
    else if (score >= 30) level = RiskLevel.WARNING;
    else level = RiskLevel.SAFE;
    return {
      originalUrl: payload, finalUrl, redirectChain,
      riskScore: score, riskLevel: level, analysis: details,
      breakdown, type, timestamp: new Date().toISOString()
    };
  } catch (globalErr) {
    return {
      originalUrl: payload, finalUrl: payload,
      redirectChain: [{ url: payload, status: 0 }],
      riskScore: 50, riskLevel: RiskLevel.WARNING,
      analysis: { usesIpAddress: false, isHttps: false, subdomainDepth: 0, urlLength: payload.length, hyphenCount: 0, suspiciousKeywords: [], suspiciousTLD: false, isShortened: false },
      breakdown: [{ factor: 'Security Analysis Error (Recovery Mode)', impact: 50 }],
      type: QrType.TEXT, timestamp: new Date().toISOString(), errorRecovered: true
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });
    const result = await processAnalysis(url);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
