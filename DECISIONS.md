# ReviewReply / EchoDesk Production Decisions

## 1. Product & Architecture
- **Product Name**: ReviewReply (by EchoDesk)
- **Tagline**: *"Turn customer reviews into replies and business decisions."*
- **Target Audience**: Local business owners who receive customer reviews on platforms like Google, but need a structured tool to understand sentiment, respond quickly, and pinpoint operational fixes.

## 2. AI Architecture & Hybrid Model Support
- **Core AI**: ReviewReply integrates with Google's Gemma and Gemini developer APIs (targeting `gemini-flash-lite-latest`, `gemma-4-26b-a4b-it`, and `gemini-3.8-flash` via Google AI Studio).
- **Hybrid Resilience**:
  - Live API integration with direct model processing running seamlessly in the background.
  - Automatic graceful fallback to client-side heuristic classification and reply generation when offline or when an API key is not configured.
  - The application guarantees zero downtime and instant response times under all network conditions.
- **AI Capabilities**:
  1. *Understand*: Rating parsing, sentiment extraction (Positive/Neutral/Negative), and multi-theme detection.
  2. *Respond*: Tone-specific reply generation tailored to the customer's exact praise or complaint, using the business's unique profile.
  3. *Improve*: Operational root-cause mapping (e.g. peak-hour waiting time -> kitchen prep capacity; sold-out items -> weekend inventory buffers).
  4. *Discover*: Automatic business discovery from website URL or name (e.g. `oliveandbean.com` -> Cafe, Gurugram, Brunch, Warm & premium tone).

## 3. Core MVP Flows & Features
- **Dashboard**:
  - Reputation Index (0-100)
  - Review statistics (48 reviews benchmark, 4.6 ★, 79% positive, 13% neutral, 8% negative)
  - Response Queue (pending count with average wait indicator)
  - Recurring themes breakdown with mention counts and percentages
  - Prioritized operational recommendations
- **Review Inbox**:
  - Dynamic filtering by status (*Needs reply, Positive, Neutral, Negative*) and by theme chips (*Waiting Time, Menu Availability, Friendly Staff, Cleanliness, etc.*).
  - Search by customer name, review text, or theme.
  - Direct review status cycle: *Draft* -> *Ready* -> *Posted*.
  - Export reviews to CSV for reporting and spreadsheet backups.
  - Quick single-review creation modal.
- **Import & Analysis**:
  - Giant unstructured text paste box supporting stars, numbers, or raw text blocks.
  - CSV file import with automated column mapping.
  - One-click benchmark restore (48 realistic reviews).
- **Reply Assistant**:
  - Exactly 3 MVP tones: *Warm & professional*, *Short & friendly*, *Apologetic & service-focused*.
  - AI regeneration with smooth progress animation.
  - One-click clipboard copy and draft saving.
- **Onboarding Flow**:
  - 3-step lightweight flow: Welcome -> AI Business Discovery -> Review Import -> Confirmation.
  - AI website discovery that autofills name, category, location, and tone.
- **Monetization Preview**:
  - Free (20 reviews/mo), Starter (₹299/mo, 500 reviews), and Pro (₹799/mo, multi-location) with monthly quota tracking.
