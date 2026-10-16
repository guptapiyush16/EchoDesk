import { analyzeReviewList, inferRatingFromText } from './analysis';
import type { Review } from './types';

const STORAGE_KEY = 'ecodesk.reviews.v1';

export function loadReviews(): Review[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Review[]) : [];
  } catch {
    return [];
  }
}

export function saveReviews(reviews: Review[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // The current session remains usable if browser storage is unavailable.
  }
}

const customerNames = [
  'Aarav M.', 'Maya S.', 'Vikram K.', 'Priya S.', 'Ananya R.', 'Rohan G.',
  'Siddharth B.', 'Dev P.', 'Neha T.', 'Ishita C.', 'Arjun B.', 'Kavita N.',
];

export const MAX_PASTE_REVIEWS = 50;

export function countReviewBlocks(input: string): number {
  if (!input.trim()) return 0;
  const rawBlocks = input
    .split(/\n\s*\n|(?=\n[^\n]*?(?:★★★★★|★★★★|★★★|★★|★|⭐⭐⭐⭐⭐|⭐⭐⭐⭐|⭐⭐⭐|⭐⭐|⭐))/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 3);
  return rawBlocks.length === 1 && input.trim().split('\n').filter((l) => l.trim().length > 10).length > 1
    ? input.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 3).length
    : rawBlocks.length;
}

export function parseReviewPaste(input: string, limit = MAX_PASTE_REVIEWS): Review[] {
  if (!input.trim()) return [];

  // Split on double newlines OR when a line starts with stars or customer pattern
  const rawBlocks = input
    .split(/\n\s*\n|(?=\n[^\n]*?(?:★★★★★|★★★★|★★★|★★|★|⭐⭐⭐⭐⭐|⭐⭐⭐⭐|⭐⭐⭐|⭐⭐|⭐))/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 3);

  // If user pasted single-line reviews separated only by single newlines
  const allBlocks = rawBlocks.length === 1 && input.trim().split('\n').filter((l) => l.trim().length > 10).length > 1
    ? input.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 3)
    : rawBlocks;

  const blocks = allBlocks.slice(0, limit);

  return blocks.map((block, index) => {
    // Extract stars if present
    const starMatch = block.match(/(★{1,5}|⭐{1,5})/);
    const slashMatch = block.match(/([1-5])\s*\/\s*5/);
    const explicitRating = block.match(/(?:rating\s*[:=]|^)(\s*[1-5])\b/i);

    let rating: number;
    if (starMatch) {
      rating = Math.min(starMatch[0].length, 5);
    } else if (slashMatch) {
      rating = Number(slashMatch[1]);
    } else if (explicitRating) {
      rating = Number(explicitRating[1].trim());
    } else {
      // Intelligently infer rating from sentiment of text
      rating = inferRatingFromText(block);
    }

    // Clean text by stripping leading rating tokens
    const text = block
      .replace(/^(?:\s*[★⭐]{1,5}\s*|\s*[1-5]\s*\/\s*5\s*|\s*rating\s*[:=]\s*[1-5]\s*[:\-]?\s*)/i, '')
      .replace(/^(?:["'])(.*)(?:["'])$/, '$1')
      .trim();

    const customerName = customerNames[index % customerNames.length];

    const base: Review = {
      id: `import-${Date.now()}-${index}`,
      customer: customerName,
      date: 'Just now',
      rating,
      text: text || block,
      sentiment: 'neutral',
      themes: [],
      status: 'needs_reply',
    };

    return analyzeReviewList([base])[0];
  }).filter((review) => review.text.length > 2);
}

export function parseCsv(input: string): Review[] {
  const rows = input.split(/\r?\n/).filter((line) => line.trim());
  if (!rows.length) return [];

  const splitCsv = (line: string) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && line[i + 1] === '"' && quoted) {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    cells.push(cell.trim());
    return cells;
  };

  const first = splitCsv(rows[0]).map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ''));
  const hasHeader = first.some((cell) => ['review', 'text', 'rating', 'customer', 'name', 'comment'].includes(cell));
  const header = hasHeader ? first : ['rating', 'review', 'customer', 'date'];
  const data = hasHeader ? rows.slice(1) : rows;

  const indexOf = (...keys: string[]) => header.findIndex((cell) => keys.includes(cell));

  return data.map((row, i) => {
    const cells = splitCsv(row);
    const ratingIndex = indexOf('rating', 'stars', 'score');
    const textIndex = indexOf('review', 'text', 'comment', 'content');
    const customerIndex = indexOf('customer', 'name', 'author');
    const dateIndex = indexOf('date', 'createdat', 'time');

    const rawRating = ratingIndex >= 0 ? Number(cells[ratingIndex]) : NaN;
    const text = cells[textIndex >= 0 ? textIndex : Math.min(1, cells.length - 1)] ?? '';
    const rating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5
      ? Math.round(rawRating)
      : inferRatingFromText(text);

    const base: Review = {
      id: `csv-${Date.now()}-${i}`,
      customer: cells[customerIndex >= 0 ? customerIndex : -1] || `Guest ${i + 1}`,
      date: cells[dateIndex >= 0 ? dateIndex : -1] || 'Imported',
      rating,
      text: text.replace(/^"|"$/g, '').trim(),
      sentiment: 'neutral',
      themes: [],
      status: 'needs_reply',
    };
    return analyzeReviewList([base])[0];
  }).filter((review) => review.text.length > 2);
}

export function exportReviewsToCsv(reviews: Review[]): string {
  const headers = ['ID', 'Customer', 'Date', 'Rating', 'Sentiment', 'Themes', 'Status', 'Review Text', 'Reply'];
  const csvCell = (value: string | number): string => {
    const text = String(value);
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const rows = reviews.map((r) => [
    csvCell(r.id),
    csvCell(r.customer),
    csvCell(r.date),
    csvCell(r.rating),
    csvCell(r.sentiment),
    csvCell(r.themes.join(', ')),
    csvCell(r.status),
    csvCell(r.text),
    csvCell(r.reply || ''),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
