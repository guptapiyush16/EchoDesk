import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, '..', 'dist');
const port = Number(process.env.PORT || 8787);
const maxBodyBytes = 100_000;
const requestWindowMs = 60_000;
const rateLimits = new Map();
const allowedTones = new Set([
  'Warm & professional',
  'Short & friendly',
  'Apologetic & service-focused',
]);

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'",
  });
  response.end(JSON.stringify(body));
}

function clientAddress(request) {
  const forwarded = request.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || request.socket.remoteAddress || 'unknown';
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers.host;
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.host === host) return true;
    if (
      parsedOrigin.hostname === 'localhost' ||
      parsedOrigin.hostname === '127.0.0.1' ||
      parsedOrigin.hostname === '0.0.0.0' ||
      parsedOrigin.hostname.endsWith('.onrender.com') ||
      parsedOrigin.hostname.endsWith('.vercel.app')
    ) {
      return true;
    }
    const forwardedHost = request.headers['x-forwarded-host'];
    if (forwardedHost && parsedOrigin.host === forwardedHost) return true;
    return false;
  } catch {
    return false;
  }
}

function checkRateLimit(request, bucket, limit) {
  const key = `${bucket}:${clientAddress(request)}`;
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || now - current.startedAt >= requestWindowMs) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
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
  if (input.includes('maps.app.goo.gl') || input.includes('goo.gl/maps')) {
    try {
      const resp = await fetch(input, { method: 'GET', redirect: 'follow' });
      if (resp.url) targetUrl = resp.url;
    } catch {
      // Ignore redirect failure and use original input
    }
  }

  let targetDataId = null;
  const dataIdMatch = targetUrl.match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i);
  if (dataIdMatch) {
    targetDataId = dataIdMatch[1];
  } else {
    const placeMatch = targetUrl.match(/place\/([^/@?]+)/i);
    const query = placeMatch
      ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      : targetUrl.replace(/^https?:\/\/[^/]+\/?/i, '').trim() || targetUrl;

    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google_maps');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('api_key', apiKey);

    const searchRes = await fetch(searchUrl).then((r) => r.json());
    if (searchRes.error) throw new Error(`SerpAPI search error: ${searchRes.error}`);
    targetDataId = searchRes.place_results?.data_id || searchRes.local_results?.[0]?.data_id;
  }

  if (!targetDataId) {
    throw new Error('Could not identify a Google Maps place from the provided link or search query.');
  }

  const reviewsUrl = new URL('https://serpapi.com/search.json');
  reviewsUrl.searchParams.set('engine', 'google_maps_reviews');
  reviewsUrl.searchParams.set('data_id', targetDataId);
  reviewsUrl.searchParams.set('api_key', apiKey);

  const reviewsRes = await fetch(reviewsUrl).then((r) => r.json());
  if (reviewsRes.error) throw new Error(`SerpAPI review error: ${reviewsRes.error}`);

  let rawReviews = Array.isArray(reviewsRes.reviews) ? [...reviewsRes.reviews] : [];

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
      // Proceed with page 1 reviews if page 2 fails
    }
  }

  const placeInfo = reviewsRes.place_info || {};
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
  try {
    if (!isAllowedOrigin(request)) return json(response, 403, { error: 'Cross-origin requests are not allowed.' });
    if (request.method === 'GET' && request.url === '/api/health') {
      return json(response, 200, {
        ok: true,
        aiConfigured: Boolean(aiConfig().key),
        serpApiConfigured: Boolean(process.env.SERPAPI_API_KEY),
      });
    }
    if (request.method === 'POST' && request.url === '/api/extract-reviews') {
      if (!checkRateLimit(request, 'extract', 15)) return json(response, 429, { error: 'Too many extraction requests. Try again later.' });
      return json(response, 200, await extractReviewsFromUrl(await readJson(request)));
    }
    if (request.method === 'POST' && request.url === '/api/ai/reply') {
      if (!checkRateLimit(request, 'reply', 20)) return json(response, 429, { error: 'Too many reply requests. Try again later.' });
      return json(response, 200, await generateReply(await readJson(request)));
    }
    if (request.method === 'POST' && request.url === '/api/ai/discover-business') {
      if (!checkRateLimit(request, 'discover', 10)) return json(response, 429, { error: 'Too many discovery requests. Try again later.' });
      return json(response, 200, await discoverBusiness(await readJson(request)));
    }
    if (request.method === 'GET') return serveStatic(request, response);
    return json(response, 404, { error: 'Not found.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const status = message.includes('required') || message.includes('too long') || message.includes('valid') || message.includes('Unsupported') ? 400 : 502;
    return json(response, status, { error: message });
  }
});

setInterval(() => {
  const cutoff = Date.now() - requestWindowMs;
  for (const [key, value] of rateLimits) if (value.startedAt < cutoff) rateLimits.delete(key);
}, requestWindowMs).unref();

server.listen(port, '0.0.0.0', () => {
  console.log(`EchoDesk server listening on port ${port}`);
});
