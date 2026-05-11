import multer from 'multer';
import jsQR from 'jsqr';
import { Jimp } from 'jimp';
import punycode from 'punycode';
import Levenshtein from 'fast-levenshtein';
import puppeteer from 'puppeteer';

const RiskLevel = { SAFE: 'safe', WARNING: 'warning', DANGEROUS: 'dangerous' };
const QrType = { URL: 'url', TEXT: 'text', WIFI: 'wifi', VCARD: 'vcard', ENCODED: 'encoded' };

const SUSPICIOUS_KEYWORDS = ['login', 'verify', 'update', 'account', 'secure', 'bank', 'confirm', 'billing', 'signin', 'support', 'service', 'validation', 'microsoft', 'google', 'paypal', 'apple', 'amazon', 'netflix'];
const SUSPICIOUS_TLDS = ['.xyz', '.top', '.pw', '.icu', '.monster', '.loan', '.click', '.tk', '.ml', '.ga', '.cf', '.gq'];
const SHORTENED_DOMAINS = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'is.gd', 'buff.ly', 'ow.ly'];
const TRUSTED_DOMAINS = ['google.com', 'apple.com', 'microsoft.com', 'kakao.com', 'naver.com', 'github.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com'];
const BRAND_KEYWORDS = ['youtube', 'google', 'naver', 'kakao', 'paypal', 'apple', 'microsoft', 'netflix', 'instagram', 'facebook'];

// --- Helper Functions ---
const vtCache = new Map();
let lastVtRequestTime = 0;
const VT_COOLDOWN = 15000;

async function checkExternalIntelligence(url) {
  const results = { score: 0, factors: [] };
  const apiKeySb = process.env.SAFE_BROWSING_API_KEY;
  const apiKeyVt = process.env.VIRUSTOTAL_API_KEY;
  
  if (apiKeySb) {
    try {
      const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKeySb}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: { clientId: "quishield", clientVersion: "1.0.0" },
          threatInfo: { threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"], platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"], threatEntries: [{ url }] }
        })
      });
      const data = await res.json();
      if (data?.matches?.length > 0) {
        results.score = 100;
        results.forceDangerous = true;
        results.factors.push({ factor: "Google Safe Browsing 데이터베이스 일치", impact: 100 });
      }
    } catch (e) {}
  }

  if (apiKeyVt && !results.forceDangerous) {
    // Basic VT check (simplified for scan.js)
    try {
      const urlId = Buffer.from(url).toString('base64').replace(/=/g, '');
      const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, { headers: { 'x-apikey': apiKeyVt } });
      const data = await res.json();
      const malicious = data?.data?.attributes?.last_analysis_stats?.malicious || 0;
      if (malicious > 0) {
        const impact = Math.min(100, malicious * 10);
        results.score += impact;
        results.factors.push({ factor: `VirusTotal: ${malicious}개 엔진에서 악성 탐지`, impact });
      }
    } catch (e) {}
  }
  
  return results;
}

async function traceRedirects(initialUrl) {
  const chain = [{ url: initialUrl, status: 200 }];
  try {
    const res = await fetch(initialUrl, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.url !== initialUrl) chain.push({ url: res.url, status: res.status });
  } catch (e) {}
  return chain;
}

function classifyContent(content) {
  if (/^https?:\/\//i.test(content.trim())) return QrType.URL;
  return QrType.TEXT;
}

function analyzePayload(content, type, redirectChain = []) {
  let score = 0;
  const breakdown = [];
  const finalUrl = redirectChain.length > 0 ? redirectChain[redirectChain.length - 1].url : content;
  
  if (type === QrType.URL) {
    try {
      const urlObj = new URL(content);
      const finalUrlObj = new URL(finalUrl);
      if (urlObj.protocol !== 'https:') { score += 30; breakdown.push({ factor: 'No HTTPS Encryption', impact: 30 }); }
      if (SUSPICIOUS_TLDS.some(tld => urlObj.hostname.endsWith(tld))) { score += 40; breakdown.push({ factor: 'Untrusted/High-Risk TLD', impact: 40 }); }
      if (urlObj.hostname !== finalUrlObj.hostname) { score += 30; breakdown.push({ factor: 'Domain Mismatch in Redirect', impact: 30 }); }
    } catch (e) {}
  }
  
  return { score: Math.min(100, score), level: score >= 70 ? RiskLevel.DANGEROUS : (score >= 30 ? RiskLevel.WARNING : RiskLevel.SAFE), breakdown };
}

async function processAnalysis(payload) {
  const type = classifyContent(payload);
  const redirectChain = type === QrType.URL ? await traceRedirects(payload) : [{ url: payload, status: 200 }];
  const finalUrl = redirectChain[redirectChain.length - 1].url;
  
  const extIntel = type === QrType.URL ? await checkExternalIntelligence(payload) : { score: 0, factors: [] };
  const baseAnalysis = analyzePayload(payload, type, redirectChain);
  
  let score = baseAnalysis.score + extIntel.score;
  const breakdown = [...baseAnalysis.breakdown, ...extIntel.factors];
  if (extIntel.forceDangerous) score = 100;
  
  score = Math.min(100, score);
  const level = score >= 70 ? RiskLevel.DANGEROUS : (score >= 30 ? RiskLevel.WARNING : RiskLevel.SAFE);
  
  return {
    originalUrl: payload, finalUrl, redirectChain,
    riskScore: score, riskLevel: level, breakdown, type, timestamp: new Date().toISOString()
  };
}

const upload = multer({ storage: multer.memoryStorage() });
const runMiddleware = (req, res, fn) => new Promise((resolve, reject) => fn(req, res, (res) => res instanceof Error ? reject(res) : resolve(res)));

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await runMiddleware(req, res, upload.single('qrImage'));
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    
    const image = await Jimp.read(req.file.buffer);
    const { data, width, height } = image.bitmap;
    const code = jsQR(new Uint8ClampedArray(data), width, height);
    
    if (!code) throw new Error('No QR code detected');
    
    const result = await processAnalysis(code.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
