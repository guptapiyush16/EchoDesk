export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ReplyStatus = 'needs_reply' | 'draft' | 'ready' | 'posted';
export type View = 'dashboard' | 'reviews' | 'insights' | 'import' | 'plans';

export interface BusinessProfile {
  name: string;
  category: string;
  location: string;
  description: string;
  tone: string;
  website?: string;
}

export interface Review {
  id: string;
  customer: string;
  date: string;
  rating: number;
  text: string;
  sentiment: Sentiment;
  themes: string[];
  reply?: string;
  status: ReplyStatus;
}

export interface ThemeSummary {
  name: string;
  count: number;
  share: number;
  direction: 'issue' | 'strength';
  icon: string;
}

export interface ReplyDraft {
  tone: 'Warm & professional' | 'Short & friendly' | 'Apologetic & service-focused';
  text: string;
}
