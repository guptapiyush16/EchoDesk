import type { BusinessProfile, Review } from './types';

type ReplyTone = 'Warm & professional' | 'Short & friendly' | 'Apologetic & service-focused';

interface ApiError {
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as T | ApiError | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? payload.error
      : `Request failed with status ${response.status}`;
    throw new Error(message || 'AI request failed.');
  }

  return payload as T;
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch('/api/health', { credentials: 'same-origin' });
    const payload = (await response.json()) as { aiConfigured?: boolean };
    return payload.aiConfigured
      ? { ok: true, message: 'Secure AI backend is configured.' }
      : { ok: false, message: 'The secure AI backend is not configured.' };
  } catch {
    return { ok: false, message: 'The secure AI backend is unavailable.' };
  }
}

export async function generateAiReply(
  review: Review,
  tone: ReplyTone,
  business: BusinessProfile
): Promise<string> {
  const result = await postJson<{ reply: string }>('/api/ai/reply', {
    review: {
      customer: review.customer,
      rating: review.rating,
      text: review.text,
      themes: review.themes,
    },
    tone,
    business: {
      name: business.name,
      category: business.category,
      location: business.location,
      description: business.description,
    },
  });

  return result.reply;
}

export async function discoverBusinessInfo(input: string): Promise<BusinessProfile> {
  return postJson<BusinessProfile>('/api/ai/discover-business', { input });
}

export interface ExtractResult {
  place: {
    title: string;
    address?: string;
    rating?: number | null;
    reviewCount?: number;
    type?: string;
  };
  reviews: Review[];
}

export async function extractPlatformReviews(url: string): Promise<ExtractResult> {
  return postJson<ExtractResult>('/api/extract-reviews', { url });
}
