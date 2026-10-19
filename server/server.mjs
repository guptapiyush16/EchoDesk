import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, '..', 'dist');
const waitlistFile = path.join(root, '..', 'data', 'waitlist.json');
const port = Number(process.env.PORT || 8787);
const maxBodyBytes = 100_000;
const requestWindowMs = 60_000;
const rateLimits = new Map();
const sessions = new Map();
const sessionCookie = 'echodesk_session';
const sessionTtlMs = 24 * 60 * 60 * 1000;
const sessionSecret = process.env.SESSION_SECRET || 'echodesk-cloud-session-secret-2026-hacktoberfest';
const adminKey = process.env.ADMIN_KEY || 'echodesk2026';
const allowedTones = new Set([
  'Warm & professional',
  'Short & friendly',
  'Apologetic & service-focused',
]);

function json(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function clientAddress(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (process.env.TRUST_PROXY === 'true' && typeof forwarded === 'string'
    ? forwarded.split(',').at(-1)?.trim()
    : '') || request.socket.remoteAddress || 'unknown';
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const configuredOrigins = (process.env.APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const forwardedHost = request.headers['x-forwarded-host'];
  const host = forwardedHost || request.headers.host;

  try {
    const parsedOrigin = new URL(origin);

    // 1. Explicitly configured origins (e.g. from APP_ORIGIN env var)
    if (configuredOrigins.length && configuredOrigins.includes(parsedOrigin.origin)) {
      return true;
    }

    // 2. Direct host match or forwarded host match (handles reverse proxies on Render, Cloudflare, etc.)
    if (host) {
      const cleanHost = host.split(',')[0].trim();
      if (parsedOrigin.host === cleanHost || parsedOrigin.hostname === cleanHost.split(':')[0]) {
        return true;
      }
    }

    // 3. Render deployment domains (*.onrender.com)
    if (parsedOrigin.hostname.endsWith('.onrender.com')) {
      return true;
    }

    // 4. Local development / loopback origins
    const isOriginLocal =
      parsedOrigin.hostname === 'localhost' ||
      parsedOrigin.hostname === '127.0.0.1' ||
      parsedOrigin.hostname === '0.0.0.0';

    if (isOriginLocal) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function checkRateLimit(key, limit) {
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || now - current.startedAt >= requestWindowMs) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      cookies[key] = '';
    }
  }
  return cookies;
}

function signSession(id) {
  return crypto.createHmac('sha256', sessionSecret).update(id).digest('base64url');
}

function createSession(response) {
  if (!sessionSecret) throw new Error('SESSION_SECRET is not configured.');
  const id = crypto.randomBytes(32).toString('base64url');
  sessions.set(id, { createdAt: Date.now(), used: { reply: 0, discover: 0, extract: 0 } });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookie}=${encodeURIComponent(`${id}.${signSession(id)}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionTtlMs / 1000}${secure}`);
  return id;
}

function getSession(request, response, createIfMissing = false) {
  if (!sessionSecret) throw new Error('SESSION_SECRET is not configured.');
  const raw = parseCookies(request)[sessionCookie];
  if (!raw) return createIfMissing ? createSession(response) : null;
  const [id, signature] = raw.split('.');
  const expected = signSession(id || '');
  if (!id || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return createIfMissing ? createSession(response) : null;
  }
  const session = sessions.get(id);
  if (!session || Date.now() - session.createdAt > sessionTtlMs) return createIfMissing ? createSession(response) : null;
  return id;
}

function authorizeRequest(request, response, bucket, limit) {
  const sessionId = getSession(request, response);
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!checkRateLimit(`${bucket}:ip:${clientAddress(request)}`, limit) || !checkRateLimit(`${bucket}:session:${sessionId}`, limit)) return false;
  if (session.used[bucket] >= limit) return false;
  session.used[bucket] += 1;
  return true;
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) throw new Error('Request body is required.');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

function text(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  const result = value.trim();
  if (result.length > maxLength) throw new Error(`${field} is too long.`);
  return result;
}

function validateReply(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request.');
  const review = body.review;
  const business = body.business;
  if (!review || !business) throw new Error('Review and business are required.');
  return {
    tone: text(body.tone, 'tone', 80),
    review: {
      customer: text(review.customer, 'review.customer', 120),
      rating: Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 ? review.rating : 3,
      text: text(review.text, 'review.text', 5_000),
      themes: Array.isArray(review.themes) ? review.themes.filter((item) => typeof item === 'string').slice(0, 10) : [],
    },
    business: {
      name: text(business.name, 'business.name', 160),
      category: text(business.category, 'business.category', 100),
      location: text(business.location, 'business.location', 160),
      description: text(business.description, 'business.description', 600),
    },
  };
}

function validateDiscovery(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request.');
  return text(body.input, 'input', 300);
}

function validateExtract(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request.');
  return text(body.url, 'url', 1000);
}

function aiConfig() {
  return {
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    baseUrl: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
  };
}

async function callModel(prompt, generationConfig = {}) {
  const config = aiConfig();
  if (!config.key) throw new Error('AI backend is not configured. Set GEMINI_API_KEY.');
  const url = `${config.baseUrl}/${encodeURIComponent(config.model)}:generateContent`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.key,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message || `AI provider returned HTTP ${response.status}.`;
        if ((response.status === 429 || response.status === 503) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }
        throw new Error(message);
      }
      const result = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!result) throw new Error('AI provider returned an empty response.');
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('AI provider did not return a response.');
}

function parseJsonModelResponse(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI provider returned invalid structured data.');
  }
}

async function generateReply(body) {
  const data = validateReply(body);
  if (!allowedTones.has(data.tone)) throw new Error('Unsupported reply tone.');
  const prompt = `You write customer review replies for ${data.business.name}, a ${data.business.category} in ${data.business.location}.
Business description: ${data.business.description}
Tone: ${data.tone}
Customer: ${data.review.customer}
Rating: ${data.review.rating}/5
Themes: ${data.review.themes.join(', ') || 'General experience'}
Review: ${data.review.text}

Write one natural reply only. Address the customer by first name when available. Acknowledge specific complaints without inventing refunds, discounts, promises, facts, or contact details. Do not mention AI. Keep it under 120 words.`;
  const reply = await callModel(prompt, { temperature: 0.5, maxOutputTokens: 220 });
  return { reply: reply.replace(/^["']|["']$/g, '').trim() };
}

async function discoverBusiness(body) {
  const input = validateDiscovery(body);
  const prompt = `Infer a business profile from this website or business name: "${input}".
Return only valid JSON with exactly these string keys: name, category, location, description, tone, website.
Do not claim you visited the website. If uncertain, use conservative generic values.`;
  const result = parseJsonModelResponse(await callModel(prompt, {
    temperature: 0.2,
    maxOutputTokens: 220,
    responseMimeType: 'application/json',
  }));
  return {
    name: text(result.name, 'name', 160),
    category: text(result.category, 'category', 100),
    location: text(result.location, 'location', 160),
    description: text(result.description, 'description', 600),
    tone: text(result.tone, 'tone', 80),
    website: typeof result.website === 'string' ? result.website.slice(0, 300) : input,
  };
}

async function extractReviewsFromUrl(body) {
  const input = validateExtract(body);
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new Error('SerpAPI is not configured on the server. Set SERPAPI_API_KEY.');

  let targetUrl = input;
  let parsedInput = null;
  try {
    parsedInput = new URL(input);
  } catch {
    // Treat non-URL input as a Google Maps search query.
  }
  const shortLinkHosts = new Set(['maps.app.goo.gl', 'goo.gl']);
  const redirectHosts = new Set(['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com']);
  if (parsedInput && shortLinkHosts.has(parsedInput.hostname.toLowerCase())) {
    if (parsedInput.protocol !== 'https:') throw new Error('Only HTTPS Google Maps short links are supported.');
    try {
      const resp = await fetch(parsedInput, { method: 'GET', redirect: 'manual' });
      const location = resp.headers.get('location');
      if (location) {
        const redirected = new URL(location, parsedInput);
        if (redirected.protocol !== 'https:' || !redirectHosts.has(redirected.hostname.toLowerCase())) {
          throw new Error('The map link redirects to an untrusted host.');
        }
        targetUrl = redirected.toString();
      }
    } catch {
      throw new Error('Unable to safely resolve the Google Maps link.');
    }
  }

  // Extract clean search query from URL or plain text input
  let query = targetUrl;
  const placeMatch = targetUrl.match(/\/place\/([^/@?]+)/i);
  if (placeMatch) {
    let name = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ');
    query = name.split('/')[0].trim();
  } else {
    const searchMatch = targetUrl.match(/\/search\/([^/@?]+)/i);
    if (searchMatch) {
      query = decodeURIComponent(searchMatch[1]).replace(/\+/g, ' ').trim();
    } else {
      try {
        const u = new URL(targetUrl);
        if (u.searchParams.has('q')) {
          query = u.searchParams.get('q').trim();
        }
      } catch {
        // Plain text query
      }
    }
  }

  // 1. Search Google Maps to get the verified place card and data_id
  const searchUrl = new URL('https://serpapi.com/search.json');
  searchUrl.searchParams.set('engine', 'google_maps');
  searchUrl.searchParams.set('q', query || targetUrl);
  searchUrl.searchParams.set('api_key', apiKey);

  const searchRes = await fetch(searchUrl).then((r) => r.json());
  if (searchRes.error && !searchRes.place_results && !searchRes.local_results) {
    throw new Error(`SerpAPI search error: ${searchRes.error}`);
  }

  const placeResults = searchRes.place_results || searchRes.local_results?.[0] || {};
  let targetDataId = placeResults.data_id;

  // Fallback to dataId from URL if search didn't return one directly
  if (!targetDataId) {
    const dataIdMatch = targetUrl.match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i);
    if (dataIdMatch) {
      targetDataId = dataIdMatch[1];
    }
  }

  let rawReviews = [];
  let placeInfo = { ...placeResults };

  // 2. Fetch reviews from google_maps_reviews engine using verified data_id
  if (targetDataId) {
    const reviewsUrl = new URL('https://serpapi.com/search.json');
    reviewsUrl.searchParams.set('engine', 'google_maps_reviews');
    reviewsUrl.searchParams.set('data_id', targetDataId);
    reviewsUrl.searchParams.set('api_key', apiKey);

    try {
      const reviewsRes = await fetch(reviewsUrl).then((r) => r.json());
      if (Array.isArray(reviewsRes.reviews) && reviewsRes.reviews.length > 0) {
        rawReviews = [...reviewsRes.reviews];
        if (reviewsRes.place_info) placeInfo = { ...placeInfo, ...reviewsRes.place_info };

        if (reviewsRes.serpapi_pagination?.next_page_token && rawReviews.length < 15) {
          try {
            const page2Url = new URL('https://serpapi.com/search.json');
            page2Url.searchParams.set('engine', 'google_maps_reviews');
            page2Url.searchParams.set('data_id', targetDataId);
            page2Url.searchParams.set('next_page_token', reviewsRes.serpapi_pagination.next_page_token);
            page2Url.searchParams.set('api_key', apiKey);
            const page2Res = await fetch(page2Url).then((r) => r.json());
            if (Array.isArray(page2Res.reviews)) {
              rawReviews = rawReviews.concat(page2Res.reviews);
            }
          } catch {
            // Proceed with page 1 reviews
          }
        }
      }
    } catch {
      // Proceed to fallbacks if reviews API fails
    }
  }

  // 3. Fallback to user_reviews or reviews on placeResults if google_maps_reviews was empty
  if (rawReviews.length === 0 && Array.isArray(placeResults.user_reviews) && placeResults.user_reviews.length > 0) {
    rawReviews = placeResults.user_reviews;
  }
  if (rawReviews.length === 0 && Array.isArray(placeResults.reviews) && placeResults.reviews.length > 0) {
    rawReviews = placeResults.reviews;
  }

  if (rawReviews.length === 0) {
    const placeName = placeInfo.title || query;
    throw new Error(`No written reviews could be extracted for "${placeName}". The listing may have only star ratings without text comments, or you can paste reviews directly using "Paste Reviews" below.`);
  }

  const formattedReviews = rawReviews.map((r, idx) => {
    const rating = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)));
    return {
      id: `serp-${Date.now()}-${idx}`,
      customer: r.user?.name || 'Google Reviewer',
      rating,
      date: r.date || 'Recent',
      text: (r.snippet || r.extracted_snippet?.original || 'Customer left a star rating without written comment.').trim(),
      status: 'needs_reply',
      sentiment: rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative',
      themes: [],
    };
  });

  return {
    place: {
      title: placeInfo.title || 'Google Maps Business',
      address: placeInfo.address || '',
      rating: placeInfo.rating || null,
      reviewCount: placeInfo.reviews || formattedReviews.length,
      type: placeInfo.type || 'Local Business',
    },
    reviews: formattedReviews,
  };
}

async function getWaitlist() {
  try {
    if (!fs.existsSync(waitlistFile)) return [];
    const raw = await fs.promises.readFile(waitlistFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function recordWaitlist(body) {
  const email = (typeof body?.email === 'string' ? body.email.trim() : '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 150) {
    throw new Error('Please enter a valid email address.');
  }
  const businessName = typeof body?.businessName === 'string' ? body.businessName.trim().slice(0, 160) : '';
  const plan = typeof body?.plan === 'string' ? body.plan.trim().slice(0, 50) : 'EchoDesk Pro';

  const list = await getWaitlist();
  const existingIdx = list.findIndex((item) => item.email.toLowerCase() === email.toLowerCase());

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString().split('T')[1].slice(0, 8) + ' UTC';
  const humanReadable = now.toLocaleString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }) + ' (UTC)';

  const entry = {
    email,
    businessName: businessName || (existingIdx >= 0 ? list[existingIdx].businessName : ''),
    plan,
    date: existingIdx >= 0 ? (list[existingIdx].date || dateStr) : dateStr,
    time: existingIdx >= 0 ? (list[existingIdx].time || timeStr) : timeStr,
    submittedAt: existingIdx >= 0 ? (list[existingIdx].submittedAt || list[existingIdx].createdAt) : now.toISOString(),
    submittedAtFormatted: existingIdx >= 0 ? (list[existingIdx].submittedAtFormatted || humanReadable) : humanReadable,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = entry;
  } else {
    list.unshift(entry);
  }

  const dir = path.dirname(waitlistFile);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(waitlistFile, JSON.stringify(list, null, 2), 'utf8');

  // PERMANENT LOG: Render console logs are retained even across container reboots!
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📬 [WAITLIST LEAD CAPTURED]:');
  console.log(`   Email:                 ${entry.email}`);
  console.log(`   Business:              ${entry.businessName || '(Not specified)'}`);
  console.log(`   Plan:                  ${entry.plan}`);
  console.log(`   Date:                  ${entry.date}`);
  console.log(`   Time:                  ${entry.time}`);
  console.log(`   Date & Time (UTC):     ${entry.submittedAtFormatted}`);
  console.log(`   Timestamp (ISO):       ${entry.createdAt}`);
  console.log(`   Total Leads Count:     ${list.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Optional webhook dispatch (e.g. Discord, Slack, Zapier, Google Sheets)
  if (process.env.WAITLIST_WEBHOOK_URL) {
    try {
      fetch(process.env.WAITLIST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **New EchoDesk Pro Waitlist Signup!**\n📧 Email: \`${entry.email}\`\n🏢 Business: ${entry.businessName || 'N/A'}\n📦 Plan: ${entry.plan}\n📅 Date: ${entry.date}\n⏰ Time: ${entry.time}\n🕒 Full: ${entry.submittedAtFormatted}\n📈 Total Waitlist: ${list.length}`,
        }),
      }).catch((err) => console.error('Waitlist webhook error:', err.message));
    } catch (err) {
      console.error('Waitlist webhook dispatch error:', err.message);
    }
  }

  return { ok: true, total: list.length, entry };
}

function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const safePath = path.normalize(path.join(dist, requested));
  if (!safePath.startsWith(dist)) return json(response, 400, { error: 'Invalid path.' });
  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
    const fallback = path.join(dist, 'index.html');
    if (!fs.existsSync(fallback)) return json(response, 404, { error: 'Frontend is not built.' });
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(fallback).pipe(response);
  }
  const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(safePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  return fs.createReadStream(safePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  const allowed = isAllowedOrigin(request);
  const corsHeaders = origin && allowed ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie, x-admin-key',
  } : {};

  const sendJson = (status, body) => json(response, status, body, corsHeaders);

  try {
    const parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const isApiRequest = pathname.startsWith('/api/');

    if (request.method === 'OPTIONS' && isApiRequest) {
      if (!allowed) {
        return sendJson(403, { error: 'Cross-origin requests are not allowed.' });
      }
      response.writeHead(204, {
        ...corsHeaders,
        'Cache-Control': 'no-store',
      });
      return response.end();
    }

    if (isApiRequest && !allowed) {
      return sendJson(403, { error: 'Cross-origin requests are not allowed.' });
    }
    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(200, {
        ok: true,
        aiConfigured: Boolean(aiConfig().key),
        serpApiConfigured: Boolean(process.env.SERPAPI_API_KEY),
      });
    }
    if (request.method === 'GET' && pathname === '/api/session') {
      getSession(request, response, true);
      return sendJson(200, { ok: true });
    }
    // PUBLIC WAITLIST: Privacy first — returns total count only, never exposes emails
    if (request.method === 'GET' && pathname === '/api/waitlist') {
      const list = await getWaitlist();
      return sendJson(200, { ok: true, total: list.length });
    }
    // MAKER / ADMIN WAITLIST: Protected by admin key (query param ?key= or header x-admin-key)
    if (request.method === 'GET' && pathname === '/api/admin/waitlist') {
      const providedKey = parsedUrl.searchParams.get('key') || request.headers['x-admin-key'];
      if (!providedKey || providedKey !== adminKey) {
        return sendJson(401, { error: 'Unauthorized. Valid admin key required.' });
      }
      const list = await getWaitlist();

      // Support 1-click CSV download via direct URL: ?format=csv
      if (parsedUrl.searchParams.get('format') === 'csv') {
        const headers = ['Email', 'Business Name', 'Plan Tier', 'Date', 'Time', 'Date & Time Formatted', 'Timestamp ISO'];
        const rows = list.map((entry) => {
          const d = entry.createdAt ? new Date(entry.createdAt) : new Date();
          const dStr = entry.date || d.toISOString().split('T')[0];
          const tStr = entry.time || (d.toISOString().split('T')[1].slice(0, 8) + ' UTC');
          const fullFormatted = entry.submittedAtFormatted || d.toUTCString();
          return [
            `"${(entry.email || '').replace(/"/g, '""')}"`,
            `"${(entry.businessName || '').replace(/"/g, '""')}"`,
            `"${(entry.plan || 'EchoDesk Pro').replace(/"/g, '""')}"`,
            `"${dStr}"`,
            `"${tStr}"`,
            `"${fullFormatted.replace(/"/g, '""')}"`,
            `"${d.toISOString()}"`,
          ];
        });
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        response.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="echodesk-waitlist-${new Date().toISOString().split('T')[0]}.csv"`,
          'X-Content-Type-Options': 'nosniff',
          ...corsHeaders,
        });
        return response.end(csv);
      }

      return sendJson(200, { ok: true, total: list.length, entries: list });
    }
    if (request.method === 'POST' && pathname === '/api/waitlist') {
      // Create session cookie if missing, and rate limit by IP
      getSession(request, response, true);
      const ip = clientAddress(request);
      if (!checkRateLimit(`waitlist:ip:${ip}`, 30)) {
        return sendJson(429, { error: 'Usage limit reached. Try again in a minute.' });
      }
      const result = await recordWaitlist(await readJson(request));
      return sendJson(200, { ok: true, total: result.total });
    }
    if (request.method === 'POST' && pathname === '/api/extract-reviews') {
      const authorized = authorizeRequest(request, response, 'extract', 15);
      if (authorized === null) return sendJson(401, { error: 'Anonymous session required. Open the app first.' });
      if (!authorized) return sendJson(429, { error: 'Anonymous usage limit reached. Try again later.' });
      return sendJson(200, await extractReviewsFromUrl(await readJson(request)));
    }
    if (request.method === 'POST' && pathname === '/api/ai/reply') {
      const authorized = authorizeRequest(request, response, 'reply', 20);
      if (authorized === null) return sendJson(401, { error: 'Anonymous session required. Open the app first.' });
      if (!authorized) return sendJson(429, { error: 'Anonymous usage limit reached. Try again later.' });
      return sendJson(200, await generateReply(await readJson(request)));
    }
    if (request.method === 'POST' && pathname === '/api/ai/discover-business') {
      const authorized = authorizeRequest(request, response, 'discover', 10);
      if (authorized === null) return sendJson(401, { error: 'Anonymous session required. Open the app first.' });
      if (!authorized) return sendJson(429, { error: 'Anonymous usage limit reached. Try again later.' });
      return sendJson(200, await discoverBusiness(await readJson(request)));
    }
    if (request.method === 'GET') return serveStatic(request, response);
    return sendJson(404, { error: 'Not found.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = message.includes('required') || message.includes('too long') || message.includes('valid') || message.includes('Unsupported') ? 400 : 502;
    return sendJson(status, { error: message });
  }
});

setInterval(() => {
  const cutoff = Date.now() - requestWindowMs;
  for (const [key, value] of rateLimits) if (value.startedAt < cutoff) rateLimits.delete(key);
  for (const [id, session] of sessions) if (session.createdAt < Date.now() - sessionTtlMs) sessions.delete(id);
}, requestWindowMs).unref();

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  throw new Error('SESSION_SECRET must be configured in production.');
}

server.listen(port, '0.0.0.0', () => {
  console.log(`EchoDesk server listening on port ${port}`);
});
