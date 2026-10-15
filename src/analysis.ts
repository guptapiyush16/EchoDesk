import type { Review, Sentiment, ThemeSummary } from './types';

export interface BusinessInsight {
  id: string;
  theme: string;
  title: string;
  tag: string;
  problemContext: string;
  suggestedAction: string;
  metric: string;
  priority: 'HIGH IMPACT' | 'SMART PLANNING' | 'OPPORTUNITY';
  icon: string;
}

export const themeRules: Array<{ name: string; words: string[]; direction: 'issue' | 'strength'; icon: string }> = [
  {
    name: 'Waiting Time',
    words: ['wait', 'waiting', 'waited', 'slow', 'delay', 'delayed', 'minutes', 'rush', 'hour', 'line', 'queue', 'forever'],
    direction: 'issue',
    icon: '⏱',
  },
  {
    name: 'Menu Availability',
    words: ['unavailable', 'sold out', 'ran out', 'out of', 'stock', 'dish', 'option', 'item', 'missing', 'limited'],
    direction: 'issue',
    icon: '🍽',
  },
  {
    name: 'Friendly Staff',
    words: ['staff', 'team', 'server', 'waiter', 'waitress', 'hostess', 'friendly', 'service', 'manager', 'thoughtful', 'polite', 'welcoming', 'attentive', 'kind'],
    direction: 'strength',
    icon: '😊',
  },
  {
    name: 'Cleanliness',
    words: ['clean', 'spotless', 'tidy', 'hygiene', 'sparkling', 'neat', 'restroom', 'tables', 'sanitized'],
    direction: 'strength',
    icon: '✨',
  },
  {
    name: 'Food Quality',
    words: ['food', 'taste', 'delicious', 'flavor', 'coffee', 'dish', 'meal', 'brunch', 'cold brew', 'latte', 'pancake', 'tea', 'pasta', 'fresh', 'tasty', 'cook', 'flavour'],
    direction: 'strength',
    icon: '🍲',
  },
  {
    name: 'Price & Value',
    words: ['price', 'pricey', 'worth', 'value', 'expensive', 'cost', 'bill', 'overpriced', 'affordable', 'cheap', 'portion'],
    direction: 'issue',
    icon: '💰',
  },
  {
    name: 'Atmosphere',
    words: ['atmosphere', 'ambience', 'space', 'cozy', 'beautiful', 'vibe', 'calm', 'room', 'interior', 'music', 'decor', 'aesthetic'],
    direction: 'strength',
    icon: '🌿',
  },
];

const negativeWords = [
  'disappoint', 'cold', 'long', 'slow', 'unavailable', 'sold out', 'poor', 'rude',
  'dirty', 'overpriced', 'waited', 'issue', 'problem', 'terrible', 'bad', 'horrible',
  'worst', 'bland', 'unpleasant', 'unfriendly', 'mediocre', 'avoid',
];

const positiveWords = [
  'love', 'loved', 'amazing', 'wonderful', 'excellent', 'friendly', 'perfect', 'great',
  'delicious', 'best', 'thoughtful', 'spotless', 'fresh', 'fantastic', 'gem', 'favorite',
  'favourite', 'superb', 'highlight', 'exceptional', 'pleasure', 'awesome', 'enjoyed',
];

export function inferRatingFromText(text: string): number {
  const lower = text.toLowerCase();
  let score = 3;
  const posCount = positiveWords.filter((w) => lower.includes(w)).length;
  const negCount = negativeWords.filter((w) => lower.includes(w)).length;

  if (posCount >= 2 && negCount === 0) score = 5;
  else if (posCount > negCount) score = 4;
  else if (negCount >= 2 && posCount === 0) score = 1;
  else if (negCount > posCount) score = 2;

  return score;
}

export function classifyReview(text: string, rawRating?: number): Pick<Review, 'sentiment' | 'themes' | 'rating'> {
  const lower = text.toLowerCase();
  const matchedRules = themeRules.filter((rule) => rule.words.some((word) => lower.includes(word)));
  const themes = matchedRules.map((rule) => rule.name);

  const negatives = negativeWords.filter((word) => lower.includes(word)).length;
  const positives = positiveWords.filter((word) => lower.includes(word)).length;

  const rating = rawRating && rawRating >= 1 && rawRating <= 5 ? rawRating : inferRatingFromText(text);

  let sentiment: Sentiment = 'neutral';
  if (rating >= 4 || (positives > negatives && rating >= 3)) {
    sentiment = 'positive';
  } else if (rating <= 2 || negatives > positives) {
    sentiment = 'negative';
  }

  return {
    rating,
    sentiment,
    themes: themes.length ? themes : ['General Experience'],
  };
}

export function analyzeReviewList(reviews: Review[]): Review[] {
  return reviews.map((review) => {
    const classified = classifyReview(review.text, review.rating);
    return {
      ...review,
      rating: review.rating || classified.rating,
      sentiment: classified.sentiment,
      themes: classified.themes,
    };
  });
}

export function summarizeThemes(reviews: Review[]): ThemeSummary[] {
  const totals = new Map<string, { count: number; issue: number; strength: number }>();

  for (const review of reviews) {
    for (const theme of new Set(review.themes)) {
      const current = totals.get(theme) ?? { count: 0, issue: 0, strength: 0 };
      current.count += 1;
      const rule = themeRules.find((item) => item.name.toLowerCase() === theme.toLowerCase());
      if (rule?.direction === 'issue' || review.sentiment === 'negative') {
        current.issue += 1;
      } else {
        current.strength += 1;
      }
      totals.set(theme, current);
    }
  }

  return [...totals.entries()]
    .map(([name, value]) => {
      const rule = themeRules.find((r) => r.name.toLowerCase() === name.toLowerCase());
      return {
        name,
        count: value.count,
        share: reviews.length ? Math.round((value.count / reviews.length) * 100) : 0,
        direction: value.issue > value.strength ? ('issue' as const) : ('strength' as const),
        icon: rule?.icon ?? '•',
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function generateBusinessInsights(themes: ThemeSummary[], _reviewCount?: number): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  const waitTheme = themes.find((t) => t.name.toLowerCase().includes('wait'));
  const menuTheme = themes.find((t) => t.name.toLowerCase().includes('menu') || t.name.toLowerCase().includes('availab'));
  const staffTheme = themes.find((t) => t.name.toLowerCase().includes('staff') || t.name.toLowerCase().includes('service'));
  const cleanTheme = themes.find((t) => t.name.toLowerCase().includes('clean'));
  const foodTheme = themes.find((t) => t.name.toLowerCase().includes('food'));
  const priceTheme = themes.find((t) => t.name.toLowerCase().includes('price'));
  const atmosphereTheme = themes.find((t) => t.name.toLowerCase().includes('atmospher'));

  // 1. Operational friction (e.g. Waiting Time)
  if (waitTheme && waitTheme.count > 0) {
    insights.push({
      id: 'insight-wait',
      theme: 'Waiting Time',
      title: 'Reduce peak-hour waiting',
      tag: 'OPERATIONAL BOTTLENECK',
      problemContext: `Most waiting-time complaints occur during the 7–9 PM peak rush. ${waitTheme.count} mentions (${waitTheme.share}% of reviews).`,
      suggestedAction: 'Review kitchen capacity, prep lines, and front-of-house table turnarounds during this period.',
      metric: `${waitTheme.share}% of reviews impacted`,
      priority: 'HIGH IMPACT',
      icon: '⏱',
    });
  }

  // 2. Supply / Menu Availability
  if (menuTheme && menuTheme.count > 0) {
    insights.push({
      id: 'insight-menu',
      theme: 'Menu Availability',
      title: 'Improve weekend stock planning',
      tag: 'INVENTORY GAP',
      problemContext: `Several customers reported unavailable dishes and sold-out items on high-traffic days. (${menuTheme.count} mentions).`,
      suggestedAction: 'Increase preparation and inventory buffers of the most frequently requested dishes before Friday.',
      metric: `${menuTheme.count} customer mentions`,
      priority: 'SMART PLANNING',
      icon: '🍽',
    });
  }

  // 3. Core Strength & Marketing (e.g. Staff or Cleanliness)
  if (staffTheme && staffTheme.count > 0) {
    insights.push({
      id: 'insight-staff',
      theme: 'Friendly Staff',
      title: 'Promote your strongest advantage',
      tag: 'COMPETITIVE EDGE',
      problemContext: `Friendly staff is your most frequently praised attribute, accounting for ${staffTheme.share}% of all guest reviews.`,
      suggestedAction: 'Highlight hospitality and staff shoutouts in social media marketing and on table collateral.',
      metric: `${staffTheme.share}% praise rate`,
      priority: 'OPPORTUNITY',
      icon: '😊',
    });
  } else if (cleanTheme && cleanTheme.count > 0) {
    insights.push({
      id: 'insight-clean',
      theme: 'Cleanliness',
      title: 'Spotless standards build repeat trust',
      tag: 'TRUST BUILDER',
      problemContext: `Clean space and thoughtful hygiene are celebrated across ${cleanTheme.count} reviews (${cleanTheme.share}%).`,
      suggestedAction: 'Maintain visible sanitization routines to continue commanding top ratings among local competitors.',
      metric: `${cleanTheme.share}% praise rate`,
      priority: 'OPPORTUNITY',
      icon: '✨',
    });
  }

  // 4. Food Quality or Pricing if available
  if (foodTheme && foodTheme.count > 0 && insights.length < 4) {
    insights.push({
      id: 'insight-food',
      theme: 'Food Quality',
      title: 'Signature dishes driving repeat visits',
      tag: 'MENU CORE',
      problemContext: `Guests consistently rave about core dishes and signature beverage flavor profiles. (${foodTheme.count} mentions).`,
      suggestedAction: 'Protect ingredient consistency during volume spikes and feature guest-favorite items at the top of digital menus.',
      metric: `${foodTheme.count} mentions`,
      priority: 'OPPORTUNITY',
      icon: '🍲',
    });
  }

  if (priceTheme && priceTheme.count > 0 && insights.length < 4) {
    insights.push({
      id: 'insight-price',
      theme: 'Price & Value',
      title: 'Make your price-to-value clearer',
      tag: 'PERCEPTION',
      problemContext: `Guests note price sensitivity around specialty items. (${priceTheme.count} mentions).`,
      suggestedAction: 'Highlight premium sourcing, organic ingredients, or complimentary accompaniments to reinforce perceived value.',
      metric: `${priceTheme.share}% value mentions`,
      priority: 'SMART PLANNING',
      icon: '💰',
    });
  }

  if (atmosphereTheme && atmosphereTheme.count > 0 && insights.length < 4) {
    insights.push({
      id: 'insight-atmosphere',
      theme: 'Atmosphere',
      title: 'Position space as destination for gatherings',
      tag: 'EXPERIENCE',
      problemContext: `Cozy, calm ambiance and aesthetic decor cited in ${atmosphereTheme.share}% of customer reviews.`,
      suggestedAction: 'Promote afternoon reservations and intimate celebrations to fill mid-day seating capacity.',
      metric: `${atmosphereTheme.share}% mentions`,
      priority: 'OPPORTUNITY',
      icon: '🌿',
    });
  }

  return insights;
}

export function recommendedAction(theme: string): string {
  const actions: Record<string, string> = {
    'Waiting Time': 'Review kitchen capacity during the 7–9 PM peak rush to cut down guest wait times.',
    'Wait time': 'Review kitchen capacity during the 7–9 PM peak rush to cut down guest wait times.',
    'Menu Availability': 'Increase weekend preparation buffers of the most frequently requested dishes.',
    'Menu availability': 'Increase weekend preparation buffers of the most frequently requested dishes.',
    'Friendly Staff': 'Highlight your team’s hospitality in your marketing and celebrate top servers.',
    'Friendly staff': 'Highlight your team’s hospitality in your marketing and celebrate top servers.',
    Cleanliness: 'Keep opening and peak-hour sanitization routines visible to reinforce guest confidence.',
    'Food Quality': 'Protect recipe consistency during busy service and feature crowd favorites prominently.',
    'Food quality': 'Protect recipe consistency during busy service and feature crowd favorites prominently.',
    'Price & Value': 'Make portion size, artisan sourcing, and ingredient quality clearer on the menu.',
    'Price & value': 'Make portion size, artisan sourcing, and ingredient quality clearer on the menu.',
    Atmosphere: 'Showcase your interior space as a destination for all-day brunch and casual meetings.',
  };
  return actions[theme] ?? 'Review recent guest feedback with your floor team and implement one concrete tweak this week.';
}

export function insightTitle(theme: string): string {
  const labels: Record<string, string> = {
    'Waiting Time': 'Reduce peak-hour waiting',
    'Wait time': 'Reduce peak-hour waiting',
    'Menu Availability': 'Improve weekend stock planning',
    'Menu availability': 'Improve weekend stock planning',
    'Friendly Staff': 'Promote your strongest advantage',
    'Friendly staff': 'Promote your strongest advantage',
    Cleanliness: 'Protect your clean-space reputation',
    'Food Quality': 'Protect signature flavor consistency',
    'Food quality': 'Protect signature flavor consistency',
    'Price & Value': 'Reinforce your premium value proposition',
    'Price & value': 'Reinforce your premium value proposition',
    Atmosphere: 'Leverage your aesthetic as a destination',
  };
  return labels[theme] ?? 'Turn feedback into business momentum';
}
