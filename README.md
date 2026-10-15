# EchoDesk — Online Review Intelligence ⚡

> **Turn customer reviews into replies and business decisions.**  
> *A fast, privacy-first, one-time online audit tool for local businesses.*  
> Built as a demo submission for **Hacktoberfest 2026**.

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg)](https://vitejs.dev/)
[![Gemini & Gemma AI](https://img.shields.io/badge/Google%20AI-Gemini%20%26%20Gemma-8E75B2.svg)](https://ai.google.dev/)
[![SerpAPI](https://img.shields.io/badge/Live%20Extraction-SerpAPI-green.svg)](https://serpapi.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

Local business owners and operators often struggle with managing online reputation across Google Maps, Yelp, and delivery aggregators. While large enterprises use expensive, bloated reputation management SaaS, small local businesses (cafes, dental clinics, retail shops, bistros) simply need a **fast, one-time tool** to:

1. **Extract live reviews** directly from their Google Maps listing or paste recent customer feedback.
2. **Surface real operational friction** beneath the stars (peak-hour bottlenecks, kitchen turnaround, hospitality).
3. **Draft authentic, brand-voiced replies** in seconds to maintain positive customer relationships.

**EchoDesk** provides an instant, zero-friction review intelligence audit without mandatory sign-ups or subscription lock-ins.

---

## ✨ Key Features

### 🔗 1. Live Google Maps Review Extraction
- Paste any Google Maps location URL (or type a business query like `Benne Cyberhub`, `Blue Tokai Coffee`).
- Powered by a secure backend proxy integrating **SerpAPI**'s Google Maps Reviews engine.
- Automatically extracts genuine customer reviews, reviewer avatars, star ratings, timestamps, and business metadata.

### 📋 2. Batch Review Paste & CSV Import
- **Free up to 100 reviews per batch**: Paste raw customer reviews copied from Google, TripAdvisor, or POS feedback forms.
- Smart regex parser automatically infers customer names, star ratings (1–5 stars), and review text.
- Full CSV import and export capabilities for spreadsheets and team meetings.

### 🧠 3. AI Sentiment & Theme Detection (Gemma & Gemini)
- Categorizes sentiment into **Positive**, **Neutral**, and **Needs Attention**.
- Identifies operational themes:
  - ⏳ *Waiting Time & Peak Rush Delays*
  - 🤝 *Staff Hospitality & Service*
  - 🍽️ *Menu Availability & Dish Consistency*
  - ✨ *Cleanliness & Atmosphere*
  - 💰 *Pricing & Value*

### 📊 4. Reputation Index & Prioritized Action Plan
- Computes an actionable **0–100 Reputation Index** combining star ratings, sentiment balance, and review response rates.
- Generates **Prioritized Operational Actions** (e.g. *"Reduce peak-hour waiting: prep lines between 7–9 PM"*).
- One-click **Copy Strategic Action Plan** to share directly with floor staff and managers.

### ✍️ 5. Brand-Voice AI Reply Assistant
- Generates personalized, empathetic replies tailored to the specific customer experience.
- Supports 3 distinct brand tones:
  - **Warm & professional** (Default)
  - **Short & friendly**
  - **Apologetic & service-focused**
- Workflow management tags: *Needs Reply*, *Draft*, *Ready*, and *Posted*.

### ⚡ 6. One-Time Audit Architecture ("Analyze Another Business")
- No data lock-in. Clean state management allows operators or agency auditors to audit one business, review the metrics, and click **Analyze Another Business** to start fresh.

---

## 🏗️ Architecture & Tech Stack

```
EchoDesk Architecture
┌────────────────────────────────────────────────────────┐
│                      Client                            │
│  React 18 + TypeScript + Vite + Custom CSS Design Sys  │
│  - Dual Input (Google Maps Link / Paste Reviews)       │
│  - Reputation Dashboard & Prioritized Action Plan      │
│  - AI Reply Assistant Modal & Tone Switcher            │
└──────────────────────────┬─────────────────────────────┘
                           │  /api/extract-reviews
                           │  /api/ai/reply
                           │  /api/ai/discover-business
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js Backend Proxy                  │
│  (server/server.mjs - Lightweight, Loopback CORS)       │
├──────────────────────────┬─────────────────────────────┤
│                          │                             │
│     SerpAPI Engine       │     Google Generative AI    │
│  (Google Maps Extraction)│   (Gemini 2.5 / Gemma AI)   │
└──────────────────────────┴─────────────────────────────┘
```

- **Frontend**: React 18, TypeScript, Vite. Strict CSS variable tokens for responsive cards, micro-animations, and glassmorphic badges.
- **Backend**: Node.js server (`server/server.mjs`) running with `--env-file=.env`. Keeps sensitive API keys (SerpAPI, Google Gemini) completely out of the client bundle.
- **Security**: Local loopback origin enforcement, request sanitization, and structured error boundaries.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### 1. Clone the Repository
```bash
git clone https://github.com/guptapiyush16/EchoDesk.git
cd EchoDesk
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your API keys in `.env`:
```ini
PORT=8787
# Google Gemini API key (from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest

# SerpAPI Key for live Google Maps review extraction (from https://serpapi.com/)
SERPAPI_API_KEY=your_serpapi_key_here
```

> **Note**: If `GEMINI_API_KEY` is not provided, EchoDesk automatically falls back to deterministic mock AI replies so the application remains 100% testable offline.

### 4. Run Locally

In one terminal, start the backend API server:
```bash
node --env-file=.env server/server.mjs
```

In a second terminal, start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Production Build

To verify TypeScript types and build the production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📁 Project Structure

```
EchoDesk/
├── public/                     # Static assets and favicon
├── server/
│   └── server.mjs              # Secure Node.js backend proxy for SerpAPI & Gemini
├── src/
│   ├── ai.ts                   # Client API calls and mock reply fallback logic
│   ├── analysis.ts             # Sentiment scoring, theme classification rules
│   ├── App.tsx                 # Core UI dashboard, navigation, tabs, and modals
│   ├── demo.ts                 # 48 realistic benchmark reviews for instant testing
│   ├── OnboardingModal.tsx      # Business setup & discovery wizard
│   ├── profile.ts              # LocalStorage profile management & auto-cleanup
│   ├── storage.ts              # CSV parsing, paste block counter, export logic
│   ├── styles.css              # Custom styling, responsive layout, animations
│   ├── types.ts                # TypeScript domain models & interfaces
│   └── main.tsx                # React root entry point
├── .env.example                # Example environment variables template
├── index.html                  # HTML template with SEO meta tags
├── package.json                # Project scripts and dependencies
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite config with API proxy
```

---

## 🏆 Hacktoberfest 2026 Submission

This project is submitted for **Hacktoberfest 2026**.
- **Plans & Billing**: Included as a read-only architecture demonstration showing how tiered quotas and limits can be cleanly communicated to users without deceptive paywalls.
- **Open Source Focus**: Fast, transparent tooling built for independent business owners.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
