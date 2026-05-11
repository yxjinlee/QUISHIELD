# QUISHIELD: QR Phishing (Quishing) Detector

QUISHIELD is a technical prototype designed to expose malicious URLs hidden inside QR codes. It goes beyond simple decoding by tracing the full redirect chain to reveal the actual destination and analyzing the URL path for phishing patterns.

## Core Features
- **QR Decoding**: Extracting URLs from image uploads (PNG/JPG/WEBP).
- **Redirect Tracing**: Following HTTP 3xx locations to find the final landing page.
- **Risk Analysis**: Heuristic scoring based on URL length, TLD reputation, keyword detection, and hostname structure.
- **Technical Dashboard**: High-fidelity UI for results and threat intelligence.

## Technical Architecture (MVP Implementation)
While the design document suggested a Python/FastAPI backend, this MVP is implemented using a **unified TypeScript Full-Stack architecture** (Node.js/Express + React) to ensure seamless performance and compatibility in the provided sandboxed environment.

- **Backend**: Express.js with `jsqr` for QR processing and `fetch` logic for redirect tracing.
- **Frontend**: React 19, Tailwind CSS 4, and Framer Motion for a polished dashboard experience.
- **Services**: Modularized logic for QR extraction, URL analysis, and redirect tracing.

## Setup & Running Locally

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start the development server (Full-stack)
npm run dev
```

### Usage
1. Open the application in your browser.
2. Upload a QR code image (Example phishing QR or a standard one).
3. Wait for the "Analyzing Redirect Pipeline" phase.
4. Review the risk score, redirect chain, and structural analysis factors.

## Presentation Focus Points
1. **The Visibility Gap**: Explain how standard email filters miss QR payloads.
2. **Path Discovery**: Highlight that we analyze the *final destination*, not just the *embedded URL*.
3. **Automated Heuristics**: Show the risk factors that contribute to the score.

---
*Note: This is a prototype for educational/demonstration purposes.*
