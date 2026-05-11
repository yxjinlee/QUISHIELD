import { AnalysisDetails, RiskLevel, QrType, RiskFactor, RedirectHop } from '../types';
import punycode from 'punycode';
import Levenshtein from 'fast-levenshtein';

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

/**
 * [수정 사항 2] 신뢰할 수 있는 도메인 화이트리스트 선언
 */
export const TRUSTED_DOMAINS = [
  'google.com', 'apple.com', 'microsoft.com', 'kakao.com', 'naver.com',
  'github.com', 'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com'
];

/**
 * [추가 사항 1] 유명 브랜드 도메인 목록 (타이포스쿼팅 및 Punycode 스푸핑 탐지용)
 */
const BRAND_KEYWORDS = [
  'youtube', 'google', 'naver', 'kakao', 'paypal', 'apple', 'microsoft', 'netflix', 'instagram', 'facebook'
];

/**
 * [수정 사항 1] Sigmoid 정규화 함수 추가
 */
export function normalizeWithSigmoid(raw: number): number {
  return Math.round(100 / (1 + Math.exp(-0.05 * (raw - 50))));
}

export function classifyContent(content: string): QrType {
  const trimmed = content.trim();
  
  if (/^https?:\/\//i.test(trimmed)) return QrType.URL;
  if (/^WIFI:/i.test(trimmed)) return QrType.WIFI;
  if (/^BEGIN:VCARD/i.test(trimmed)) return QrType.VCARD;
  
  // Basic encoded check
  if (/^[A-Za-z0-9+/=]{20,}$/.test(trimmed) && !trimmed.includes(' ')) return QrType.ENCODED;
  
  return QrType.TEXT;
}

export function analyzePayload(
  content: string, 
  type: QrType, 
  redirectChain: RedirectHop[] = [], 
  depth: number = 0
): { score: number; level: RiskLevel; details: AnalysisDetails; breakdown: RiskFactor[] } {
  let score = 0;
  const breakdown: RiskFactor[] = [];
  
  // Ensure we have a valid redirect chain or fallback
  const safeChain = Array.isArray(redirectChain) ? redirectChain : [];
  const finalUrl = safeChain.length > 0 ? safeChain[safeChain.length - 1].url : content;
  
  const details: AnalysisDetails = {
    usesIpAddress: false,
    isHttps: true,
    subdomainDepth: 0,
    urlLength: content?.length || 0,
    hyphenCount: 0,
    suspiciousKeywords: [],
    suspiciousTLD: false,
    isShortened: false
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

      /**
       * [수정 사항 2] 화이트리스트 도메인 체크
       * 신뢰할 수 있는 도메인의 경우 키워드 점수를 0으로 처리하여 오탐 방지
       */
      const isTrusted = TRUSTED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
      const isFinalTrusted = TRUSTED_DOMAINS.some(domain => finalUrlObj.hostname.endsWith(domain));

      /**
       * [추가 사항 1] Punycode 도메인 탐지 및 브랜드 스푸핑 체크
       */
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
            score += 30; // 일반적인 Punycode도 위험 점수 부여
            breakdown.push({ factor: `Punycode 도메인 사용 (${unicodeHostname})`, impact: 30 });
          }
        } catch (err) {
          console.warn('[ANALYSIS] Punycode decoding failed:', err);
        }
      }

      // Scoring & Breakdown
      if (!details.isHttps) {
        score += 30;
        breakdown.push({ factor: 'No HTTPS Encryption', impact: 30 });
      }
      if (details.usesIpAddress) {
        score += 50;
        breakdown.push({ factor: 'IP-based Hostname', impact: 50 });
      }
      if (details.subdomainDepth > 2) {
        score += 15;
        breakdown.push({ factor: 'Excessive Subdomains', impact: 15 });
      }
      if (details.urlLength > 100) {
        score += 10;
        breakdown.push({ factor: 'Unusually Long URL', impact: 10 });
      }
      if (details.hyphenCount > 2) {
        score += 15;
        breakdown.push({ factor: 'Domain Obfuscation (Hyphens)', impact: 15 });
      }
      
      // 키워드 점수 반영 (신뢰할 수 없는 도메인인 경우에만)
      if (details.suspiciousKeywords.length > 0 && !isTrusted) {
        const impact = 20 * details.suspiciousKeywords.length;
        score += impact;
        breakdown.push({ factor: `Phishing Keywords (${details.suspiciousKeywords.join(', ')})`, impact });
      } else if (details.suspiciousKeywords.length > 0 && isTrusted) {
        breakdown.push({ factor: `Ignored Keywords on Trusted Domain (${details.suspiciousKeywords.join(', ')})`, impact: 0 });
      }

      if (details.suspiciousTLD) {
        score += 40;
        breakdown.push({ factor: 'Untrusted/High-Risk TLD', impact: 40 });
      }
      if (details.isShortened) {
        // [수정 사항 3] 단축URL 최종 목적지가 신뢰 도메인이면 점수 경감
        const impact = isFinalTrusted ? 8 : 15;
        score += impact;
        breakdown.push({ factor: 'URL Shortener Detected', impact });
      }

      // Redirect-specific scoring
      if (redirectChain.length > 2) {
        score += 25;
        breakdown.push({ factor: 'Deep Redirect Chain', impact: 25 });
      }
      if (urlObj.hostname !== finalUrlObj.hostname) {
        // [수정 사항 1] 단축URL 서비스 사용 시 도메인 불일치 페널티 제외
        if (!details.isShortened) {
          score += 30;
          breakdown.push({ factor: 'Domain Mismatch in Redirect', impact: 30 });
        } else {
          breakdown.push({ factor: 'Allowed Domain Change for Shortener', impact: 0 });
        }
      }

      /**
       * [추가 사항 1] 타이포스쿼팅 탐지
       */
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

      /**
       * [추가 사항 2] JWT 토큰 파라미터 탐지
       */
      if (content.includes('eyJ')) {
        score += 30;
        breakdown.push({ factor: 'JWT 토큰 난독화 페이로드 감지', impact: 30 });
      }

      /**
       * [추가 사항 3] ww1./ww2. 서브도메인 패턴 탐지
       */
      if (/^ww[0-9]+\./i.test(urlObj.hostname)) {
        score += 20;
        breakdown.push({ factor: '도메인 파킹 패턴 감지', impact: 20 });
      }
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
    /**
     * [수정 사항 3] vCard URL 필드 추출 및 재분석
     */
    const urlMatch = content.match(/URL(?:;|:)(?:[^:]*:)?([^\s\r\n]+)/i);
    if (urlMatch && urlMatch[1] && depth < 3) {
      const extractedUrl = urlMatch[1];
      const subAnalysis = analyzePayload(extractedUrl, QrType.URL, [], depth + 1);
      score += subAnalysis.score;
      breakdown.push({ factor: `Embedded URL Analytics in vCard (${extractedUrl})`, impact: subAnalysis.score });
      // Merge details if needed, or keep vCard focus
    }
  } else if (type === QrType.ENCODED) {
    /**
     * [수정 사항 4] ENCODED 타입 재귀 분석 (Base64)
     */
    score += 30; // 기본 인코딩 위험 점수
    breakdown.push({ factor: 'Obfuscated/Encoded Payload', impact: 30 });

    if (depth < 3) {
      try {
        const decoded = atob(content);
        const decodedType = classifyContent(decoded);
        const subAnalysis = analyzePayload(decoded, decodedType, [], depth + 1);
        score += subAnalysis.score;
        breakdown.push({ factor: `Decoded Payload Security Depth ${depth + 1}`, impact: subAnalysis.score });
      } catch (err) {
        // Not a valid base64 or decoding failed
      }
    }
  }

  /**
   * [수정 사항 1] 점수 정규화 및 캡 적용
   */
  score = Math.min(100, score);

  let level = RiskLevel.SAFE;
  if (score >= 70) level = RiskLevel.DANGEROUS;
  else if (score >= 30) level = RiskLevel.WARNING;

  return { score, level, details, breakdown };
}
