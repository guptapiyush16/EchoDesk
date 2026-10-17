# EchoDesk — Online Review Intelligence & Operational Fixes ⚡

> **Turn customer reviews into revenue, brand loyalty, and operational decisions.**  
> *A fast, privacy-first, one-time online audit tool and micro-SaaS for local businesses.*  
> Built for **Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle**.

[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Render](https://img.shields.io/badge/Render-Hosted%20Live-46E3B7.svg?style=flat&logo=render)](https://render.com/)
[![Google AI](https://img.shields.io/badge/Google%20AI-Gemma%20%26%20Gemini-8E75B2.svg?style=flat&logo=google)](https://ai.google.dev/)
[![SerpAPI](https://img.shields.io/badge/Live%20Extraction-SerpAPI-00AA6C.svg?style=flat)](https://serpapi.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 The Problem & The Solution

Independent storefront owners—cafe operators, dentists, salon owners, boutique retail managers—live in dread of their Google Maps notifications. A single 2-star review about slow service can ruin their morning.

Meanwhile, enterprise reputation management software like Birdeye or Yext charges **$200 to $500 per month**, locks owners into annual contracts, and buries them in corporate jargon. Small business owners don't need a bloated CRM; they need answers to two simple questions:

1. **"What is actually breaking on my floor or in my kitchen during rush hour?"**
2. **"How do I draft an empathetic, professional reply to this customer in 10 seconds without sounding like a robotic bot?"**

**EchoDesk** is an open-source, privacy-first review intelligence audit tool and micro-SaaS side hustle that translates unstructured feedback into prioritized operational actions and tone-matched customer responses in seconds.

---

## ⚡ The Core Loop

```
  ┌───────────────────────────┐
  │   1. Live Ingestion       │  Enter Google Maps URL or query (e.g. "Blue Tokai Coffee")
  │   (Powered by SerpApi)    │  Extracts genuine reviews, ratings, reviewer info & timestamps
  └─────────────┬─────────────┘
                │
  ┌─────────────▼─────────────┐
  │   2. AI Root-Cause Engine │  Clusters reviews into operational themes: Waiting Times,
  │   (Open-Weight / Gemma)   │  Staff Hospitality, Menu Consistency, Cleanliness, Pricing
  └─────────────┬─────────────┘
                │
  ┌─────────────▼─────────────┐
  │   3. Brand-Voice Replies  │  Drafts empathetic responses in 3 brand tones:
  │   (Context-Aware AI)      │  Warm & Professional, Short & Friendly, Apologetic
  └─────────────┬─────────────┘
                │
  ┌─────────────▼─────────────┐
  │   4. Action Checklist     │  Interactive operational checklist + 1-Click CSV export
  │   & Demand Validation     │  Pro Waitlist modal (50% off lifetime) + Demand Tracker
  └───────────────────────────┘
```

---

## ✨ Key Features

### 🔗 1. Live Google Maps Review Extraction (SerpApi)
- Paste any Google Maps location URL or type a business query like `Benne Cyberhub`, `Blue Tokai Coffee`.
- Powered by a secure backend proxy integrating **SerpApi's Google Maps Reviews API**.
- Extracts live reviews, star ratings, reviewer metadata, and place info without requiring complicated Google Business Profile OAuth setup.

### 📋 2. Batch Review Paste & CSV Import
- Paste raw review text copied from Google, TripAdvisor, Yelp, or customer feedback sheets.
- Smart regex parser automatically infers reviewer names, 1–5 star ratings, and timestamps.
- Built-in guardrails (50-review free audit cap) with smooth batch processing.

### 🧠 3. AI Sentiment & Operational Theme Detection (Gemma & Google AI)
- Categorizes sentiment into **Positive**, **Neutral**, and **Needs Attention**.
- Discovers recurring operational bottlenecks:
  - ⏳ *Peak-Hour Waiting Delays*
  - 🤝 *Staff Hospitality & Service*
  - 🍽️ *Menu Consistency & Taste*
  - ✨ *Ambiance, Noise & Cleanliness*
  - 💰 *Value & Pricing Perception*

### ✍️ 4. Brand-Voice AI Reply Assistant
- Generates personalized, empathetic replies tailored to the specific customer review.
- Supports 3 distinct brand tones:
  - **Warm & professional** (Default)
  - **Short & friendly**
  - **Apologetic & service-focused**
- Never hallucinates fake discounts, contact info, or false promises.
- Workflow management: *Needs Reply*, *Draft*, *Ready*, and *Posted*.

### 📋 5. Interactive Operational Action Checklist
- Converts customer complaints into concrete business fixes (e.g. *"Prep secondary line between 7–9 PM to reduce pickup delays"*).
- Interactive **Add Action ✓** button with toggle state.
- **1-Click CSV Export** so business owners can print or share actionable tasks directly with floor staff.

### 💰 6. "Fake Door" Pro Waitlist & Demand Validation Engine
- Validates real commercial demand before investing in payment gateways.
- When users click **"Upgrade to Pro"**, a high-converting modal offers:  
  *"EchoDesk Pro is launching next week! Enter your email to get 50% off lifetime access."*
- **Real-Time Owner Analytics Tracker**: Displays progress towards the demand validation goal (10–20 business owners).
- **Submissions Viewer & CSV Export**: Inspect captured emails, business names, and timestamps, and export leads in one click.

---

## 🏗️ Architecture & Tech Stack

```
EchoDesk Architecture
┌────────────────────────────────────────────────────────┐
│                      Client                            │
│  React 18 + TypeScript + Vite + Custom CSS Design Sys  │
│  - Dual Input (Google Maps URL / Paste Reviews / CSV)  │
│  - Reputation Dashboard & Prioritized Action Checklist │
│  - AI Reply Assistant Modal & Tone Switcher            │
│  - Pro Waitlist Modal & Demand Validation Tracker      │
└──────────────────────────┬─────────────────────────────┘
                           │  /api/extract-reviews
                           │  /api/ai/reply
                           │  /api/ai/discover-business
                           │  /api/waitlist (GET & POST)
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js Backend Proxy                  │
│  (server/server.mjs - Lightweight, CORS & Rate Limits) │
├──────────────────────────┬─────────────────────────────┤
│                          │                             │
│     SerpApi Engine       │     Google Generative AI    │
│  (Google Maps Extraction)│    (Gemma / Gemini Models)  │
└──────────────────────────┴─────────────────────────────┘
```

- **Frontend**: React 18, TypeScript, Vite. Tailored CSS variable design system, warm amber/terracotta palette, responsive cards, glassmorphic badges, and micro-animations.
- **Backend**: Node.js HTTP server (`server/server.mjs`) with zero external frameworks, providing request rate-limiting, session protection, and CORS isolation.
- **Data Layer**: Local storage for instant client-side persistence + server-side `data/waitlist.json` with file streaming.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v20+ recommended)
- [npm](https://www.npmjs.com/)

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
Create a `.env` file in the project root:
```ini
PORT=8787
NODE_ENV=development

# Google Gemini / Gemma API key (from https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest

# SerpAPI Key for live Google Maps review extraction (from https://serpapi.com/)
SERPAPI_API_KEY=your_serpapi_key_here
```

> **Note**: If `GEMINI_API_KEY` is not provided, EchoDesk automatically falls back to deterministic local mock AI replies so the application remains 100% testable offline.

### 4. Run Locally

In one terminal, start the backend server:
```bash
npm start
```

In a second terminal, start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Render

EchoDesk is configured for **turnkey full-stack deployment on [Render](https://render.com/)** using the included [`render.yaml`](render.yaml) Blueprint:

1. In Render, select **New +** > **Blueprint**.
2. Connect `guptapiyush16/EchoDesk`.
3. Provide your `GEMINI_API_KEY` and `SERPAPI_API_KEY`.
4. Click **Apply**. Render will automatically build the React bundle and deploy the Node.js service.

See [DEPLOY.md](DEPLOY.md) for step-by-step deployment instructions.

---

## 🧪 Production Verification

Verify TypeScript compilation and Vite production build:
```bash
npm run build
```

---

## 📁 Project Structure

```
EchoDesk/
├── data/
│   └── waitlist.json           # Server-side persistent waitlist storage
├── public/                     # Static assets and favicon
├── server/
│   └── server.mjs              # Secure Node.js proxy for SerpApi, Gemma & Waitlist
├── src/
│   ├── ai.ts                   # Client AI API wrappers & deterministic fallback
│   ├── analysis.ts             # Sentiment scoring, theme classification rules
│   ├── App.tsx                 # Core dashboard, audit workflow, checklists & modals
│   ├── demo.ts                 # 48 realistic benchmark reviews for instant testing
│   ├── OnboardingModal.tsx      # Business setup & discovery wizard
│   ├── profile.ts              # LocalStorage profile management & auto-cleanup
│   ├── storage.ts              # CSV parsing, downloadFile helper, export routines
│   ├── styles.css              # Custom styling, responsive layout, animations
│   ├── types.ts                # TypeScript domain models & interfaces
│   └── main.tsx                # React root entry point
├── render.yaml                 # Render Infrastructure-as-Code Blueprint
├── DEPLOY.md                   # Render deployment guide
├── SUBMISSION.md               # Hacktoberfest Week 2 DEV Challenge writeup
├── package.json                # Project dependencies and npm scripts
└── vite.config.ts              # Vite configuration with API reverse proxy
```

---

## 🏆 Hacktoberfest Open-Source AI Challenge Week 2

This project is submitted for the **Hacktoberfest Open-Source AI Challenge: Week 2 - Side Hustle**:
- Built to solve an urgent, real-world monetization challenge for small businesses.
- Leverages open-weight AI models to deliver enterprise-grade reputation intelligence at micro-SaaS unit economics.
- Fully validated with a live Google Maps audit on real local business reviews and an integrated Pro waitlist demand engine.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
