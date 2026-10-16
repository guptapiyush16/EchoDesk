# 🚀 Deploying EchoDesk to Render

EchoDesk is configured for **turnkey, full-stack deployment on [Render](https://render.com/)** (Free Tier).

Because EchoDesk includes both the Vite-built React frontend and the secure Node.js backend proxy (`server/server.mjs`), a single Render Web Service deploys the entire application with zero extra infrastructure.

---

## ⚡ Option 1: Automatic Blueprint Deployment (Fastest)

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub repository:
   ```
   https://github.com/guptapiyush16/EchoDesk
   ```
4. Render will automatically read [`render.yaml`](render.yaml) and pre-fill:
   - **Name**: `echodesk`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, fill in your secret keys:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key from [AI Studio](https://aistudio.google.com/))*
   - `SERPAPI_API_KEY`: *(Your SerpAPI Key from [SerpAPI](https://serpapi.com/))*
6. Click **Apply**. Render will build and deploy your live URL (e.g. `https://echodesk.onrender.com`).

---

## 🛠️ Option 2: Manual Web Service Deployment

If you prefer configuring the Web Service manually:

1. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Web Service**.
2. Select **Build and deploy from a Git repository** and connect `guptapiyush16/EchoDesk`.
3. Configure the service settings:
   - **Name**: `echodesk` (or your preferred name)
   - **Region**: Any (e.g., *Oregon (US West)* or *Frankfurt (EU)*)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: **Free**
4. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_VERSION` | `20.18.0` | Node runtime version |
   | `GEMINI_API_KEY` | `your_gemini_key` | Google Gemini API key |
   | `GEMINI_MODEL` | `gemini-flash-lite-latest` | Model identifier |
   | `SERPAPI_API_KEY` | `your_serpapi_key` | SerpAPI key for Google Maps live review extraction |
5. Click **Create Web Service**.

---

## ✅ Post-Deployment Health Check

Once Render finishes building:

1. Open your live application URL: `https://<your-service-name>.onrender.com`
2. Test the health endpoint:
   ```
   https://<your-service-name>.onrender.com/api/health
   ```
   You should receive:
   ```json
   {
     "ok": true,
     "aiConfigured": true,
     "serpApiConfigured": true
   }
   ```
3. Test a live extraction:
   - Paste a Google Maps link (e.g. `Benne Cyberhub` or `Blue Tokai Coffee`) or paste customer reviews.
   - Verify that reviews, sentiment breakdown, reputation score, and AI reply assistant generate seamlessly.
