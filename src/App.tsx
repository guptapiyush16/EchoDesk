import { useEffect, useMemo, useRef, useState } from 'react';
import {
  analyzeReviewList,
  generateBusinessInsights,
  insightTitle,
  summarizeThemes,
  themeRules,
  type BusinessInsight,
} from './analysis';
import { demoReviews, starterPaste } from './demo';
import { countReviewBlocks, downloadFile, exportReviewsToCsv, loadReviews, MAX_PASTE_REVIEWS, parseCsv, parseReviewPaste, saveReviews } from './storage';
import { defaultProfile, OnboardingModal } from './OnboardingModal';
import { clearBusinessProfile, loadBusinessProfile, saveBusinessProfile } from './profile';
import { extractPlatformReviews, generateAiReply } from './ai';
import type { BusinessProfile, ReplyStatus, Review, View } from './types';
import './styles.css';

type IconName =
  | 'grid'
  | 'reviews'
  | 'spark'
  | 'upload'
  | 'credit'
  | 'search'
  | 'bell'
  | 'chevron'
  | 'arrow'
  | 'plus'
  | 'trend'
  | 'clock'
  | 'star'
  | 'smile'
  | 'alert'
  | 'check'
  | 'copy'
  | 'send'
  | 'filter'
  | 'calendar'
  | 'download'
  | 'file'
  | 'close'
  | 'refresh'
  | 'reply'
  | 'menu'
  | 'external'
  | 'lock'
  | 'shield'
  | 'coffee'
  | 'settings'
  | 'trash';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.4" />
        <rect x="14" y="3" width="7" height="7" rx="1.4" />
        <rect x="3" y="14" width="7" height="7" rx="1.4" />
        <rect x="14" y="14" width="7" height="7" rx="1.4" />
      </>
    ),
    reviews: (
      <>
        <path d="M20 14a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </>
    ),
    credit: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4 4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    trend: (
      <>
        <path d="m3 17 6-6 4 3 8-9" />
        <path d="M15 5h6v6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9z" />,
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 4.3 2.7 18a2 2 0 0 0 1.8 3h15a2 2 0 0 0 1.8-3l-7.6-13.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 4h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M7 12h10m-7 6h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" />
      </>
    ),
    reply: (
      <>
        <path d="M10 8 5 12l5 4" />
        <path d="M5 12h9a5 5 0 0 1 5 5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    external: (
      <>
        <path d="M14 3h7v7M10 14 21 3" />
        <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    coffee: (
      <>
        <path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
        <path d="M17 10h2a2 2 0 1 1 0 4h-2M8 3v2m5-2v2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.7l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.6Z"
          transform="translate(-2 -2)"
        />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const navItems: { id: View; label: string; icon: IconName; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'reviews', label: 'Review inbox', icon: 'reviews', badge: '7' },
  { id: 'insights', label: 'Business insights', icon: 'spark' },
  { id: 'import', label: 'Import & analyze', icon: 'upload' },
];

const statusLabels: Record<ReplyStatus, string> = {
  needs_reply: 'Needs reply',
  draft: 'Draft',
  ready: 'Ready',
  posted: 'Posted',
};

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="brand-mark-core" />
      <span className="brand-mark-ring" />
    </div>
  );
}

function Rating({ value, compact = false }: { value: number; compact?: boolean }) {
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`rating ${compact ? 'rating-compact' : ''}`} aria-label={`${value} out of 5 stars`}>
      <span className="rating-stars">{'★'.repeat(clamped)}</span>
      <span className="rating-empty">{'★'.repeat(5 - clamped)}</span>
    </span>
  );
}

function SentimentTag({ sentiment }: { sentiment: Review['sentiment'] }) {
  return (
    <span className={`sentiment-tag ${sentiment}`}>
      {sentiment === 'positive' ? 'Positive' : sentiment === 'neutral' ? 'Neutral' : 'Needs attention'}
    </span>
  );
}

function StatusTag({ status }: { status: ReplyStatus }) {
  return (
    <span className={`status-tag ${status}`}>
      {status === 'posted' && <Icon name="check" size={12} />} {statusLabels[status]}
    </span>
  );
}

function ReviewRow({
  review,
  onReply,
  onStatus,
  onDelete,
}: {
  review: Review;
  onReply: (review: Review) => void;
  onStatus: (id: string, status: ReplyStatus) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <article className="review-row">
      <div className="review-avatar">
        {review.customer.replace(/[^A-Z]/gi, '').slice(0, 1).toUpperCase() || 'G'}
      </div>
      <div className="review-main">
        <div className="review-meta">
          <strong>{review.customer}</strong>
          <span className="meta-dot">·</span>
          <span>{review.date}</span>
          <span className="review-source">
            <span className="google-g">G</span> Google
          </span>
        </div>
        <div className="review-rating-line">
          <Rating value={review.rating} />
          <span className="rating-number">{review.rating}.0</span>
        </div>
        <p className="review-text">{review.text}</p>
        <div className="review-tags">
          {review.themes.slice(0, 3).map((theme) => (
            <span key={theme} className="theme-tag">
              {theme}
            </span>
          ))}
          <SentimentTag sentiment={review.sentiment} />
        </div>
        {review.reply && (
          <div className="saved-reply">
            <span>
              <Icon name="reply" size={14} />
            </span>
            <p>{review.reply}</p>
          </div>
        )}
      </div>
      <div className="review-actions">
        <StatusTag status={review.status} />
        {review.status === 'needs_reply' || !review.reply ? (
          <button className="button button-outline button-small" onClick={() => onReply(review)}>
            <Icon name="reply" size={14} /> Generate reply
          </button>
        ) : (
          <button
            className="button button-quiet button-small"
            onClick={() =>
              review.status === 'posted'
                ? onReply(review)
                : onStatus(review.id, review.status === 'draft' ? 'ready' : 'posted')
            }
          >
            {review.status === 'posted'
              ? 'View reply'
              : 'Mark as ' + (review.status === 'draft' ? 'ready' : 'posted')}
          </button>
        )}
        {onDelete && (
          <button
            className="icon-button"
            title="Delete review"
            style={{ width: '26px', height: '26px', opacity: 0.5 }}
            onClick={() => onDelete(review.id)}
          >
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>
    </article>
  );
}

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [reviews, setReviews] = useState<Review[]>(loadReviews);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(loadBusinessProfile);

  // Reply assistant state
  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyTone, setReplyTone] = useState<'Warm & professional' | 'Short & friendly' | 'Apologetic & service-focused'>(
    'Warm & professional'
  );
  const [replyText, setReplyText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Import state
  const [paste, setPaste] = useState(starterPaste);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [platformUrl, setPlatformUrl] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);
  const [landingInputTab, setLandingInputTab] = useState<'link' | 'paste'>('link');

  // Filters & search
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('All reviews');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  // New review modal
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState('');

  // Limit modal state
  const [limitModal, setLimitModal] = useState<{
    type: 'more_than_50' | 'audit_locked' | 'capacity_exceeded';
    enteredCount: number;
    existingCount: number;
    availableRemaining: number;
  } | null>(null);

  const hasReachedAuditLimit = reviews.length >= MAX_PASTE_REVIEWS;

  // Action checklist state
  const [actionChecklist, setActionChecklist] = useState<Array<{
    id: string;
    title: string;
    suggestedAction: string;
    problemContext: string;
    priority: string;
    icon?: string;
    completed?: boolean;
  }>>(() => {
    try {
      const saved = localStorage.getItem('ecodesk.action-checklist.v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ecodesk.action-checklist.v1', JSON.stringify(actionChecklist));
    } catch {
      // ignore
    }
  }, [actionChecklist]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveReviews(reviews), [reviews]);
  useEffect(() => saveBusinessProfile(businessProfile), [businessProfile]);

  // If no reviews are loaded (empty state/fresh audit tool), guarantee no lingering business profile is kept
  useEffect(() => {
    if (reviews.length === 0 && (businessProfile.name !== defaultProfile.name || Boolean(localStorage.getItem('ecodesk.business-profile.v2')))) {
      setBusinessProfile(defaultProfile);
      clearBusinessProfile();
    }
  }, [reviews.length, businessProfile.name]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  // Global keyboard shortcuts (Cmd+K for search, Esc to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setView('reviews');
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setReplyReview(null);
        setShowOnboarding(false);
        setShowAddReviewModal(false);
        setLimitModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute metrics dynamically from actual review data
  const analyzedReviews = useMemo(() => analyzeReviewList(reviews), [reviews]);
  const themes = useMemo(() => summarizeThemes(analyzedReviews), [analyzedReviews]);
  const businessInsights = useMemo(
    () => generateBusinessInsights(themes, analyzedReviews.length),
    [themes, analyzedReviews.length]
  );

  const totalReviews = analyzedReviews.length || 1;
  const pendingCount = analyzedReviews.filter((review) => review.status === 'needs_reply').length;
  const positiveCount = analyzedReviews.filter((review) => review.sentiment === 'positive').length;
  const neutralCount = analyzedReviews.filter((review) => review.sentiment === 'neutral').length;

  const sentimentStats = {
    positive: Math.round((positiveCount / totalReviews) * 100),
    neutral: Math.round((neutralCount / totalReviews) * 100),
    negative: Math.max(0, 100 - Math.round((positiveCount / totalReviews) * 100) - Math.round((neutralCount / totalReviews) * 100)),
  };

  const avgRating = analyzedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const reputationIndex = Math.min(99, Math.round(avgRating * 16.5 + sentimentStats.positive * 0.25));

  const quotaUsed = Math.min(500, reviews.length);
  const quotaRemaining = Math.max(0, 500 - quotaUsed);

  // Business is only considered selected if reviews exist and a specific business name was set
  const hasSelectedBusiness =
    reviews.length > 0 &&
    Boolean(businessProfile?.name) &&
    businessProfile.name !== defaultProfile.name &&
    businessProfile.name !== 'My Business';

  // Top issue for hero spotlight
  const waitingTheme = themes.find((t) => t.name.toLowerCase().includes('wait')) ?? themes[0];

  // Filtering reviews in inbox
  const filteredReviews = useMemo(() => {
    const term = search.toLowerCase().trim();
    return analyzedReviews.filter((review) => {
      const matchesSearch =
        !term || [review.customer, review.text, ...review.themes].join(' ').toLowerCase().includes(term);

      const matchesStatus =
        reviewFilter === 'All reviews' ||
        (reviewFilter === 'Needs reply'
          ? review.status === 'needs_reply'
          : review.sentiment === reviewFilter.toLowerCase());

      const matchesTheme =
        !selectedThemeFilter ||
        review.themes.some((t) => t.toLowerCase() === selectedThemeFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesTheme;
    });
  }, [analyzedReviews, reviewFilter, search, selectedThemeFilter]);

  const changeView = (next: View) => {
    setView(next);
    setMobileNav(false);
  };

  const openOnboarding = (step = 0) => {
    setOnboardingStep(step);
    setShowOnboarding(true);
  };

  const updateBusinessProfile = (field: keyof BusinessProfile, value: string) => {
    setBusinessProfile((current) => ({ ...current, [field]: value }));
  };

  // Reply assistant actions
  const beginReply = async (review: Review) => {
    setReplyReview(review);
    const tone = 'Warm & professional';
    setReplyTone(tone);
    if (review.reply) {
      setReplyText(review.reply);
    } else {
      setIsGeneratingAi(true);
      try {
        const generated = await generateAiReply(review, tone, businessProfile);
        setReplyText(generated);
      } catch (error) {
        setReplyReview(null);
        setToast(error instanceof Error ? error.message : 'Unable to generate a reply.');
      } finally {
        setIsGeneratingAi(false);
      }
    }
  };

  const regenerateReply = async (newTone: typeof replyTone) => {
    if (!replyReview) return;
    setReplyTone(newTone);
    setIsGeneratingAi(true);
    try {
      const generated = await generateAiReply(replyReview, newTone, businessProfile);
      setReplyText(generated);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to generate a reply.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const updateStatus = (id: string, status: ReplyStatus) => {
    setReviews((current) => current.map((r) => (r.id === id ? { ...r, status } : r)));
    setReplyReview((current) => (current?.id === id ? { ...current, status } : current));
    setToast(`Reply status marked as ${statusLabels[status].toLowerCase()}.`);
  };

  const deleteReview = (id: string) => {
    setReviews((current) => current.filter((r) => r.id !== id));
    setToast('Review removed from inbox.');
  };

  const performLinkExtraction = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input) {
      setToast('Please enter a Google Maps link or business name.');
      return;
    }
    setIsExtractingUrl(true);
    try {
      const data = await extractPlatformReviews(input);
      if (!data.reviews || data.reviews.length === 0) {
        setToast('No reviews found for this Google Maps location.');
        return;
      }
      setReviews(data.reviews);
      if (data.place?.title && data.place.title !== 'Google Maps Business') {
        const addr = data.place.address ? data.place.address.split(',') : [];
        const loc = addr.length > 2 ? addr.slice(-3, -1).join(',').trim() : (data.place.address || 'Local');
        setBusinessProfile({
          name: data.place.title,
          category: data.place.type || 'South Indian restaurant',
          location: loc,
          description: `Extracted from Google Maps (${data.place.reviewCount || data.reviews.length} total customer reviews, rating: ${data.place.rating || '4.0'}★).`,
          tone: 'Warm & professional',
          website: input.startsWith('http') ? input : '',
        });
      }
      setPlatformUrl('');
      setPaste('');
      setReviewFilter('All reviews');
      setSelectedThemeFilter(null);
      setSearch('');
      changeView('reviews');
      setToast(`Extracted ${data.reviews.length} live Google reviews with star ratings for ${data.place?.title || 'Google Maps'}!`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Unable to extract reviews from this link.');
    } finally {
      setIsExtractingUrl(false);
    }
  };

  const analyzePasteAction = () => {
    const trimmed = paste.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('google.com/maps') ||
      trimmed.includes('maps.google.') ||
      trimmed.includes('maps.app.goo.gl')
    ) {
      void performLinkExtraction(trimmed);
      return;
    }

    const totalBlocks = countReviewBlocks(paste);
    if (!totalBlocks) {
      setToast('Please paste customer reviews or enter a Google Maps link.');
      return;
    }

    if (reviews.length >= MAX_PASTE_REVIEWS) {
      setLimitModal({
        type: 'audit_locked',
        enteredCount: totalBlocks,
        existingCount: reviews.length,
        availableRemaining: 0,
      });
      return;
    }

    if (totalBlocks > MAX_PASTE_REVIEWS) {
      setLimitModal({
        type: 'more_than_50',
        enteredCount: totalBlocks,
        existingCount: reviews.length,
        availableRemaining: Math.max(0, MAX_PASTE_REVIEWS - reviews.length),
      });
      return;
    }

    if (reviews.length > 0 && reviews.length + totalBlocks > MAX_PASTE_REVIEWS) {
      const remaining = Math.max(0, MAX_PASTE_REVIEWS - reviews.length);
      setLimitModal({
        type: 'capacity_exceeded',
        enteredCount: totalBlocks,
        existingCount: reviews.length,
        availableRemaining: remaining,
      });
      return;
    }

    const imported = parseReviewPaste(paste, MAX_PASTE_REVIEWS);
    if (!imported.length) {
      setToast('Please paste customer reviews or enter a Google Maps link.');
      return;
    }
    setIsAnalyzing(true);
    setTimeout(() => {
      setReviews((current) => (current.length ? [...imported, ...current].slice(0, MAX_PASTE_REVIEWS) : imported));
      setPaste('');
      setIsAnalyzing(false);
      changeView('dashboard');
      setToast(`${imported.length} reviews parsed & analyzed with AI.`);
    }, 600);
  };

  const importCsvFile = async (file?: File) => {
    if (!file) return;
    if (reviews.length >= MAX_PASTE_REVIEWS) {
      setLimitModal({
        type: 'audit_locked',
        enteredCount: 0,
        existingCount: reviews.length,
        availableRemaining: 0,
      });
      return;
    }
    try {
      const text = await file.text();
      const imported = parseCsv(text);
      if (!imported.length) {
        setToast('No review rows found. Please upload a CSV with review text.');
        return;
      }
      const available = MAX_PASTE_REVIEWS - reviews.length;
      if (imported.length > available) {
        setLimitModal({
          type: 'more_than_50',
          enteredCount: imported.length,
          existingCount: reviews.length,
          availableRemaining: available,
        });
        return;
      }
      setReviews((current) => [...imported, ...current].slice(0, MAX_PASTE_REVIEWS));
      changeView('reviews');
      setToast(`${imported.length} reviews imported from ${file.name}.`);
    } catch {
      setToast('That file could not be read. Please try another CSV.');
    }
  };

  const resetDemoData = () => {
    setReviews(demoReviews);
    setPaste(starterPaste);
    changeView('dashboard');
    setToast('Restored 48 realistic benchmark reviews.');
  };

  const clearDatabase = () => {
    setReviews([]);
    setBusinessProfile(defaultProfile);
    clearBusinessProfile();
    setActionChecklist([]);
    try {
      localStorage.removeItem('ecodesk.action-checklist.v1');
    } catch {
      // ignore
    }
    setToast('Database cleared. Ready for a new business audit.');
  };

  const toggleActionItem = (insight: BusinessInsight) => {
    const isAdded = actionChecklist.some((item) => item.id === insight.id);
    if (isAdded) {
      setActionChecklist((prev) => prev.filter((item) => item.id !== insight.id));
      setToast(`Removed from action checklist: "${insight.title}"`);
    } else {
      setActionChecklist((prev) => [
        ...prev,
        {
          id: insight.id,
          title: insight.title,
          suggestedAction: insight.suggestedAction,
          problemContext: insight.problemContext,
          priority: insight.priority,
          icon: insight.icon,
          completed: false,
        },
      ]);
      setToast(`Added to action checklist: "${insight.title}"`);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setActionChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const removeChecklistItem = (id: string) => {
    setActionChecklist((prev) => prev.filter((item) => item.id !== id));
    setToast('Item removed from checklist.');
  };

  const clearChecklist = () => {
    setActionChecklist([]);
    setToast('Action checklist cleared.');
  };

  const downloadChecklistCsv = () => {
    if (!actionChecklist.length) return;
    const headers = ['Status', 'Priority', 'Action Title', 'Suggested Business Action', 'Identified Issue Context'];
    const rows = actionChecklist.map((item) => [
      item.completed ? 'Completed' : 'Pending',
      `"${item.priority.replace(/"/g, '""')}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.suggestedAction.replace(/"/g, '""')}"`,
      `"${item.problemContext.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const filename = `${businessProfile.name.toLowerCase().replace(/\s+/g, '-')}-action-checklist.csv`;
    downloadFile(csv, filename, 'text/csv');
    setToast('Action checklist downloaded as CSV.');
  };

  const handleExtractFromUrl = (targetUrl?: string) => {
    void performLinkExtraction(targetUrl || platformUrl);
  };

  const copyReplyText = async () => {
    try {
      await navigator.clipboard.writeText(replyText);
      setToast('Reply copied to clipboard! Ready to paste into Google.');
    } catch {
      setToast('Please select and copy the text manually.');
    }
  };

  const saveReplyStatus = (status: ReplyStatus) => {
    if (!replyReview) return;
    setReviews((current) =>
      current.map((r) => (r.id === replyReview.id ? { ...r, reply: replyText, status } : r))
    );
    setReplyReview(null);
    setToast(status === 'ready' ? 'Reply saved and marked ready.' : 'Reply saved as a draft.');
  };

  const handleExportCsv = () => {
    const csvContent = exportReviewsToCsv(analyzedReviews);
    downloadFile(csvContent, `${businessProfile.name.toLowerCase().replace(/\s+/g, '-')}-reviews.csv`, 'text/csv');
    setToast('Reviews exported to CSV successfully.');
  };

  const handleCopyActionPlan = async () => {
    const plan = businessInsights
      .map(
        (ins, idx) =>
          `${idx + 1}. ${ins.title.toUpperCase()}\nIssue: ${ins.problemContext}\nAction: ${ins.suggestedAction}\nMetric: ${ins.metric}`
      )
      .join('\n\n---\n\n');
    const fullPlan = `ECODESK ACTION PLAN for ${businessProfile.name}\nGenerated on ${new Date().toLocaleDateString()}\nReputation Score: ${reputationIndex}/100\n\n${plan}`;

    try {
      await navigator.clipboard.writeText(fullPlan);
      setToast('Action plan copied to clipboard! Great for your team meeting.');
    } catch {
      setToast('Select and copy the action items manually.');
    }
  };

  const handleAddSingleReview = () => {
    if (!newText.trim()) {
      setToast('Please enter review text.');
      return;
    }
    const customer = newCustomer.trim() || 'Guest Reviewer';
    const single = parseReviewPaste(`${newRating} stars: ${newText}`)[0];
    const newRev: Review = {
      ...single,
      id: `manual-${Date.now()}`,
      customer,
      date: 'Just now',
      rating: newRating,
      text: newText.trim(),
      status: 'needs_reply',
    };
    setReviews((prev) => [newRev, ...prev]);
    setShowAddReviewModal(false);
    setNewCustomer('');
    setNewText('');
    setNewRating(5);
    setToast(`Added review from ${customer}.`);
  };

  // ----------------------------------------------------
  // SCREEN 1: DASHBOARD
  // ----------------------------------------------------
  const renderDashboard = () => (
    <>
      <section className="welcome-row">
        <div>
          <h1>
            Welcome to EchoDesk<span className="heading-period">.</span>
          </h1>
          <p className="welcome-subtitle">
            Turn customer reviews into replies and business decisions.
          </p>
        </div>
        <div className="welcome-actions">
          {reviews.length > 0 ? (
            <>
              <span className="health-pill">
                <span className="pulse-dot" /> Healthy reputation
              </span>
              <button className="button button-outline" onClick={clearDatabase} title="Start fresh audit for another business">
                <Icon name="refresh" size={15} /> Analyze Another Business
              </button>
              {!hasReachedAuditLimit ? (
                <button className="button button-primary" onClick={() => changeView('import')}>
                  <Icon name="plus" size={16} /> Add / Paste more
                </button>
              ) : (
                <button className="button button-soft" onClick={() => changeView('plans')} title="50/50 review limit reached for this audit">
                  <Icon name="lock" size={14} /> 50/50 Free Limit Reached
                </button>
              )}
            </>
          ) : (
            <button className="button button-primary" onClick={() => changeView('import')}>
              <Icon name="plus" size={16} /> Import reviews
            </button>
          )}
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="audit-tier-banner">
          <div className="audit-tier-badge">
            <Icon name="shield" size={14} /> FREE TIER AUDIT
          </div>
          <div className="audit-tier-copy">
            <strong>
              {reviews.length >= MAX_PASTE_REVIEWS
                ? `Free tier audit limit reached (50 / 50 reviews analyzed).`
                : reviews.length <= 20
                ? `Displaying ${reviews.length} recent live reviews from Google Maps.`
                : `Displaying ${reviews.length} customer reviews (free tier limit: 50 reviews per audit).`}
            </strong>
            <span>
              {reviews.length >= MAX_PASTE_REVIEWS
                ? 'To analyze another business or batch, start a new audit with "Analyze Another Business" or upgrade to Pro.'
                : reviews.length <= 20
                ? 'Only up to 15–20 reviews can be extracted via public links in the free tier. If you want more reviews, explore our Starter & Pro plans.'
                : 'Pasting reviews is free up to 50 reviews per batch. If you want more reviews, explore our Pro plan.'}
            </span>
          </div>
          <button
            className="button button-outline button-small"
            onClick={() => changeView('plans')}
          >
            View Plans (Read-Only Demo) <Icon name="arrow" size={13} />
          </button>
        </section>
      )}

      {reviews.length === 0 ? (
        <section className="landing-empty-panel">
          <div className="landing-empty-hero">
            <span className="landing-badge">ONLINE REVIEW INTELLIGENCE</span>
            <h2>
              Turn customer reviews into{' '}
              <span className="headline-accent">replies and business decisions.</span>
            </h2>
            <p className="landing-subtitle">
              EchoDesk is a fast, one-time online audit tool for local businesses.
              Extract live reviews from Google Maps or paste customer feedback to instantly analyze reputation, detect sentiment, and draft AI replies.
            </p>

            <div className="hero-link-box">
              <div className="tool-input-tabs">
                <button
                  type="button"
                  className={`tool-tab-btn ${landingInputTab === 'link' ? 'active' : ''}`}
                  onClick={() => setLandingInputTab('link')}
                >
                  🔗 Google Maps / Business Link
                </button>
                <button
                  type="button"
                  className={`tool-tab-btn ${landingInputTab === 'paste' ? 'active' : ''}`}
                  onClick={() => setLandingInputTab('paste')}
                >
                  📋 Paste Reviews (Free up to 50)
                </button>
              </div>

              {landingInputTab === 'link' ? (
                <div className="link-extract-panel" style={{ textAlign: 'left', margin: '0 0 10px' }}>
                  <div className="link-extract-header">
                    <span className="link-extract-badge">SERPAPI LIVE</span>
                    <div>
                      <strong>Extract any Google Maps location directly</strong>
                      <div><small>Paste your Google Maps link or type a business name to pull live reviews with star ratings.</small></div>
                    </div>
                  </div>
                  <div className="link-input-row">
                    <input
                      type="text"
                      value={platformUrl}
                      onChange={(e) => setPlatformUrl(e.target.value)}
                      placeholder="Paste Google Maps link (e.g. Benne Cyberhub, Blue Tokai)..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleExtractFromUrl();
                      }}
                    />
                    <button
                      className="button button-primary"
                      onClick={() => handleExtractFromUrl()}
                      disabled={isExtractingUrl}
                    >
                      {isExtractingUrl ? (
                        <>
                          <span className="ai-spinner" /> Extracting...
                        </>
                      ) : (
                        <>
                          <Icon name="download" size={15} /> Run Audit ⚡
                        </>
                      )}
                    </button>
                  </div>
                  <div className="link-suggestion-row">
                    <span>Quick try:</span>
                    <button
                      type="button"
                      className="link-chip"
                      onClick={() => {
                        setPlatformUrl('https://www.google.com/maps/place/Benne+-+Heritage+Bangalore+Dosa+-+Cyberhub/@28.495163,77.0872266,17.3z/data=!4m6!3m5!1s0x390d199e61884157:0x4091207b0e80c2cc!8m2!3d28.4960896!4d77.0889002!16s%2Fg%2F11zxk881xc');
                        handleExtractFromUrl('https://www.google.com/maps/place/Benne+-+Heritage+Bangalore+Dosa+-+Cyberhub/@28.495163,77.0872266,17.3z/data=!4m6!3m5!1s0x390d199e61884157:0x4091207b0e80c2cc!8m2!3d28.4960896!4d77.0889002!16s%2Fg%2F11zxk881xc');
                      }}
                    >
                      Benne Dosa Cyberhub
                    </button>
                    <button
                      type="button"
                      className="link-chip"
                      onClick={() => {
                        setPlatformUrl('Blue Tokai Coffee Gurgaon');
                        handleExtractFromUrl('Blue Tokai Coffee Gurgaon');
                      }}
                    >
                      Blue Tokai Gurgaon
                    </button>
                  </div>
                  <div className="tier-limit-note">
                    <span>
                      ⚡ <strong>Free Tier Limit:</strong> Only up to 15–20 reviews can be extracted from public links in the free tier.
                    </span>
                    <button type="button" onClick={() => changeView('plans')}>
                      Want more? View Plans (Demo) →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="link-extract-panel" style={{ textAlign: 'left', margin: '0 0 10px' }}>
                  <div className="link-extract-header">
                    <span className="link-extract-badge">{hasReachedAuditLimit ? 'LIMIT REACHED (50/50)' : 'FREE UP TO 50'}</span>
                    <div>
                      <strong>Paste raw customer reviews</strong>
                      <div><small>Pasting reviews is free up to 50 reviews per batch. Gemma & Gemini AI extract sentiment and themes.</small></div>
                    </div>
                  </div>

                  {hasReachedAuditLimit && (
                    <div className="audit-locked-alert">
                      <div className="audit-locked-info">
                        <span className="audit-locked-badge">
                          <Icon name="lock" size={13} /> AUDIT LIMIT REACHED (50/50)
                        </span>
                        <p>
                          You have analyzed 50 reviews in this audit. To enter another batch, start a new audit with <strong>Analyze Another Business</strong> or upgrade.
                        </p>
                      </div>
                      <div className="audit-locked-actions">
                        <button className="button button-outline button-small" onClick={clearDatabase}>
                          <Icon name="refresh" size={13} /> Analyze Another Business
                        </button>
                        <button className="button button-primary button-small" onClick={() => changeView('plans')}>
                          View Plans
                        </button>
                      </div>
                    </div>
                  )}

                  <textarea
                    className="large-review-input"
                    value={hasReachedAuditLimit ? '' : paste}
                    onChange={(e) => {
                      if (hasReachedAuditLimit) {
                        setLimitModal({
                          type: 'audit_locked',
                          enteredCount: 0,
                          existingCount: reviews.length,
                          availableRemaining: 0,
                        });
                        return;
                      }
                      setPaste(e.target.value);
                    }}
                    disabled={hasReachedAuditLimit}
                    placeholder={
                      hasReachedAuditLimit
                        ? 'Free tier audit limit reached (50/50 reviews analyzed). You cannot enter another batch of reviews to this audit. Click "Analyze Another Business" to start fresh, or upgrade.'
                        : 'Paste customer reviews here separated by blank lines...'
                    }
                    rows={4}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '9px', color: '#637e76' }}>
                      {countReviewBlocks(paste)} / {MAX_PASTE_REVIEWS} free reviews detected
                    </span>
                    <button
                      className="button button-primary button-small"
                      onClick={analyzePasteAction}
                      disabled={isAnalyzing || hasReachedAuditLimit}
                    >
                      {isAnalyzing ? (
                        'Analyzing with AI...'
                      ) : hasReachedAuditLimit ? (
                        <>
                          <Icon name="lock" size={13} /> 50/50 Limit Reached
                        </>
                      ) : (
                        'Analyze Reviews ⚡'
                      )}
                    </button>
                  </div>
                  <div className="tier-limit-note">
                    <span>
                      ⚡ <strong>Free Tier Limit:</strong> Pasting reviews is free up to 50 reviews per batch.
                    </span>
                    <button type="button" onClick={() => changeView('plans')}>
                      Want more? View Plans (Demo) →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="landing-actions-grid">
            <div className="landing-action-card" onClick={() => changeView('import')}>
              <span className="landing-card-icon">📋</span>
              <h3>Paste Customer Reviews</h3>
              <p>Quickly paste reviews or feedback in any format. Gemma & Gemini AI will extract ratings and themes.</p>
              <button className="button button-primary button-small">Paste Reviews</button>
            </div>

            <div className="landing-action-card" onClick={() => changeView('import')}>
              <span className="landing-card-icon">📁</span>
              <h3>Upload CSV Export</h3>
              <p>Import reviews exported from Google Business Profile, TripAdvisor, Zomato, or your POS.</p>
              <button className="button button-outline button-small">Upload CSV</button>
            </div>

            <div className="landing-action-card" onClick={resetDemoData}>
              <span className="landing-card-icon">⚡</span>
              <h3>Explore Benchmark Demo</h3>
              <p>Load 48 realistic benchmark customer reviews to test analysis, insights, and AI replies instantly.</p>
              <button className="button button-quiet button-small">Load 48 Reviews</button>
            </div>

            <div className="landing-action-card" onClick={() => changeView('import')}>
              <span className="landing-card-icon">🔗</span>
              <h3>Extract via Platform Link</h3>
              <p>Provide your Google Maps or review platform URL to pull live reviews and star ratings.</p>
              <button className="button button-outline button-small">Extract Link</button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* METRIC STRIP */}
      <section className="metrics-grid" aria-label="Review overview">
        {/* REPUTATION INDEX */}
        <div className="metric-card reputation-card">
          <div className="metric-heading">
            <span>REPUTATION INDEX</span>
            <span className="metric-icon green">
              <Icon name="shield" size={17} />
            </span>
          </div>
          <div className="metric-main">
            <strong>{reputationIndex}</strong>
            <span>/100</span>
            <span className="trend-chip">
              <Icon name="trend" size={12} /> +4 pts this month
            </span>
          </div>
          <div className="reputation-meter">
            <span style={{ width: `${reputationIndex}%` }} />
          </div>
          <div className="metric-footer">Top 15% of local businesses</div>
        </div>

        {/* REVIEWS & RATING */}
        <div className="metric-card">
          <div className="metric-heading">
            <span>REVIEWS & RATING</span>
            <span className="metric-icon gold">
              <Icon name="star" size={17} />
            </span>
          </div>
          <div className="metric-main">
            <strong>{reviews.length}</strong>
            <span className="metric-inline-label">reviews</span>
          </div>
          <div className="metric-footer">
            <Rating value={Math.round(avgRating)} /> <b>{avgRating.toFixed(1)}</b>
            <span className="muted"> average rating</span>
            <span className="metric-separator">·</span>
            <span className="muted">Google</span>
          </div>
        </div>

        {/* SENTIMENT BALANCE */}
        <div className="metric-card">
          <div className="metric-heading">
            <span>SENTIMENT BALANCE</span>
            <span className="metric-icon mint">
              <Icon name="smile" size={17} />
            </span>
          </div>
          <div className="sentiment-number">
            <strong>{sentimentStats.positive}%</strong>
            <span>positive</span>
          </div>
          <div className="sentiment-bar">
            <span className="bar-positive" style={{ width: `${sentimentStats.positive}%` }} />
            <span className="bar-neutral" style={{ width: `${sentimentStats.neutral}%` }} />
            <span className="bar-negative" style={{ width: `${sentimentStats.negative}%` }} />
          </div>
          <div className="metric-footer sentiment-legend">
            <span>
              <i className="legend-dot positive-dot" />
              {sentimentStats.positive}% Positive
            </span>
            <span>
              <i className="legend-dot neutral-dot" />
              {sentimentStats.neutral}% Neutral
            </span>
            <span>
              <i className="legend-dot negative-dot" />
              {sentimentStats.negative}% Negative
            </span>
          </div>
        </div>

        {/* RESPONSE QUEUE */}
        <div className="metric-card response-card">
          <div className="metric-heading">
            <span>RESPONSE QUEUE</span>
            <span className="metric-icon amber">
              <Icon name="alert" size={17} />
            </span>
          </div>
          <div className="metric-main">
            <strong>{pendingCount}</strong>
            <span className="metric-inline-label">need reply</span>
            <span className="response-alert">Avg. wait 1d</span>
          </div>
          <div className="metric-footer">
            <span className="open-dot" /> {pendingCount} open in inbox{' '}
            <button
              className="text-link"
              onClick={() => {
                setReviewFilter('Needs reply');
                changeView('reviews');
              }}
            >
              View all <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>
      </section>

      {/* DASHBOARD SPLIT COLUMNS */}
      <section className="dashboard-columns">
        <div className="left-stack">
          {/* RECURRING THEMES */}
          <section className="panel themes-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Operational analysis <span className="ampersand">&</span> recurring themes
                </h2>
                <p className="panel-description">
                  What keeps coming up most often across your customer feedback.
                </p>
              </div>
              <button
                className="icon-button panel-more"
                title="Explore all insights"
                onClick={() => changeView('insights')}
              >
                <Icon name="external" size={16} />
              </button>
            </div>
            <div className="theme-list">
              {themes.slice(0, 4).map((theme, index) => (
                <div
                  className="theme-row"
                  key={theme.name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedThemeFilter(theme.name);
                    changeView('reviews');
                  }}
                  title={`Filter inbox by ${theme.name}`}
                >
                  <span className={`theme-icon theme-${index}`}>{theme.icon}</span>
                  <div className="theme-copy">
                    <div className="theme-title-line">
                      <strong>{theme.name}</strong>
                      <span className={`theme-kind ${theme.direction}`}>
                        {theme.direction === 'issue'
                          ? 'RECURRING OPERATIONAL FRICTION'
                          : 'PRIMARY STRENGTH'}
                      </span>
                    </div>
                    <div className="theme-progress">
                      <span style={{ width: `${Math.min(100, theme.share * 2.2)}%` }} />
                    </div>
                  </div>
                  <div className="theme-count">
                    <strong>{theme.count}</strong>
                    <span>
                      mentions ({theme.share}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="panel-footer-link" onClick={() => changeView('insights')}>
              View all themes and operational insights <Icon name="arrow" size={14} />
            </button>
          </section>

          {/* RECENT REVIEWS STREAM */}
          <section className="panel review-stream">
            <div className="panel-heading stream-heading">
              <div>
                <h2>Recent reviews</h2>
                <p className="panel-description">Real customer experiences shaping your reputation.</p>
              </div>
              <button className="button button-outline button-small" onClick={() => changeView('reviews')}>
                Open inbox <Icon name="arrow" size={14} />
              </button>
            </div>
            {analyzedReviews.slice(0, 3).map((review) => (
              <ReviewRow
                key={review.id}
                review={review}
                onReply={beginReply}
                onStatus={updateStatus}
                onDelete={deleteReview}
              />
            ))}
            <button className="panel-footer-link" onClick={() => changeView('reviews')}>
              View all {reviews.length} reviews <Icon name="arrow" size={14} />
            </button>
          </section>
        </div>

        {/* RIGHT COLUMN: PRIORITIZED ACTIONS & QUICK IMPORT */}
        <aside className="right-stack">
          {/* PRIORITIZED ACTIONS */}
          <section className="panel actions-panel">
            <div className="panel-heading action-heading">
              <div>
                <h2>Prioritized actions</h2>
              </div>
              <span className="recommendation-count">{businessInsights.length} suggestions</span>
            </div>
            <div className="action-list">
              {businessInsights.slice(0, 3).map((insight, index) => (
                <article className="action-item" key={insight.id}>
                  <div className="action-topline">
                    <span className={`action-index index-${index}`}>0{index + 1}</span>
                    <span className={`action-priority priority-${index}`}>{insight.priority}</span>
                  </div>
                  <h3>{insight.title}</h3>
                  <p>{insight.problemContext}</p>
                  <div className="suggestion">
                    <span>Suggested action</span>
                    <p>{insight.suggestedAction}</p>
                  </div>
                  <button className="text-link action-link" onClick={() => changeView('insights')}>
                    Explore this insight <Icon name="arrow" size={13} />
                  </button>
                </article>
              ))}
            </div>
            <button className="panel-footer-link" onClick={() => changeView('insights')}>
              See full strategic action plan <Icon name="arrow" size={14} />
            </button>
          </section>

          {/* QUICK PASTE PANEL */}
          <section className="panel quick-import-panel">
            <div className="quick-import-heading">
              <div className="quick-icon">
                <Icon name="upload" size={17} />
              </div>
              <div>
                <div className="eyebrow panel-eyebrow">QUICK PULSE CHECK</div>
                <h2>Paste new reviews?</h2>
              </div>
            </div>
            <p>Paste customer feedback to immediately extract sentiment and themes.</p>
            <textarea
              aria-label="Paste reviews for quick analysis"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="Paste recent reviews here…"
              rows={3}
            />
            <button
              className="button button-primary button-full"
              onClick={analyzePasteAction}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <span className="ai-spinner" /> Analyzing with AI...
                </>
              ) : (
                <>
                  <Icon name="spark" size={15} /> Analyze reviews
                </>
              )}
            </button>
            <button className="demo-link" onClick={resetDemoData}>
              <Icon name="refresh" size={13} /> Restore 48 demo reviews
            </button>
          </section>
        </aside>
      </section>
        </>
      )}
    </>
  );

  // ----------------------------------------------------
  // SCREEN 2: REVIEWS INBOX
  // ----------------------------------------------------
  const renderReviews = () => (
    <>
      <section className="page-heading">
        <div>
          <h1>
            Review inbox<span className="heading-period">.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" onClick={() => setShowAddReviewModal(true)}>
            <Icon name="plus" size={15} /> Add review
          </button>
          <button className="button button-outline" onClick={handleExportCsv} title="Export to CSV">
            <Icon name="download" size={15} /> Export CSV
          </button>
          <button className="button button-primary" onClick={() => changeView('import')}>
            <Icon name="upload" size={15} /> Import reviews
          </button>
        </div>
      </section>

      {/* INBOX SUMMARY BAR */}
      <section className="inbox-summary panel">
        <div>
          <span className="inbox-kicker">TOTAL INBOX</span>
          <strong>
            {reviews.length} <small>reviews</small>
          </strong>
        </div>
        <div className="inbox-divider" />
        <div>
          <span className="inbox-kicker">NEEDS REPLY</span>
          <strong>
            {pendingCount} <small>awaiting response</small>
          </strong>
        </div>
        <div className="inbox-divider" />
        <div>
          <span className="inbox-kicker">AVERAGE RATING</span>
          <strong className="inbox-rating">
            {avgRating.toFixed(1)} <span>★</span>
          </strong>
        </div>
        <button className="button button-soft button-small" onClick={() => changeView('insights')}>
          Explore insights <Icon name="arrow" size={14} />
        </button>
      </section>

      {/* FULL INBOX PANEL */}
      <section className="panel full-inbox-panel">
        <div className="inbox-toolbar">
          <div className="filter-tabs">
            {['All reviews', 'Needs reply', 'Positive', 'Neutral', 'Negative'].map((filter) => (
              <button
                key={filter}
                className={`filter-tab ${reviewFilter === filter ? 'active' : ''}`}
                onClick={() => setReviewFilter(filter)}
              >
                {filter}
                {filter === 'Needs reply' && <span className="tab-count">{pendingCount}</span>}
              </button>
            ))}
          </div>
          <span className="result-count">
            Showing {filteredReviews.length} of {reviews.length}
          </span>
        </div>

        {/* THEME TAG FILTER ROW */}
        <div className="tag-filter-row">
          <span className="tag-filter-label">Filter by Theme:</span>
          <button
            className={`tag-filter-chip ${selectedThemeFilter === null ? 'active' : ''}`}
            onClick={() => setSelectedThemeFilter(null)}
          >
            All Themes
          </button>
          {themeRules.map((rule) => {
            const count = analyzedReviews.filter((r) =>
              r.themes.some((t) => t.toLowerCase() === rule.name.toLowerCase())
            ).length;
            if (count === 0) return null;
            return (
              <button
                key={rule.name}
                className={`tag-filter-chip ${selectedThemeFilter === rule.name ? 'active' : ''}`}
                onClick={() =>
                  setSelectedThemeFilter(selectedThemeFilter === rule.name ? null : rule.name)
                }
              >
                {rule.icon} {rule.name} ({count})
              </button>
            );
          })}
        </div>

        {filteredReviews.length ? (
          filteredReviews.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              onReply={beginReply}
              onStatus={updateStatus}
              onDelete={deleteReview}
            />
          ))
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="reviews" size={22} />
            </span>
            <h3>No reviews matching your filter</h3>
            <p>Try resetting the theme and status filters, or paste new customer comments.</p>
            <button
              className="button button-primary button-small"
              onClick={() => {
                setReviewFilter('All reviews');
                setSelectedThemeFilter(null);
                setSearch('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      <div className="local-note">
        <span className="note-dot" /> AI-powered review intelligence · Real-time local state ·{' '}
        <button onClick={resetDemoData}>Reset to demo data</button>
      </div>
    </>
  );

  // ----------------------------------------------------
  // SCREEN 3: BUSINESS INSIGHTS
  // ----------------------------------------------------
  const renderInsights = () => (
    <>
      <section className="page-heading">
        <div>
          <h1>
            Business insights<span className="heading-period">.</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" onClick={handleCopyActionPlan}>
            <Icon name="copy" size={15} /> Copy Action Plan
          </button>
          <button className="button button-primary" onClick={() => changeView('reviews')}>
            Review Inbox <Icon name="arrow" size={14} />
          </button>
        </div>
      </section>

      {/* BIGGEST OPPORTUNITY HERO */}
      <section className="insight-hero panel">
        <div className="insight-hero-copy">
          <h2>{waitingTheme ? insightTitle(waitingTheme.name) : 'Smooth out the evening rush'}</h2>
          <p>
            {waitingTheme
              ? `Most waiting-time complaints occur between 7–9 PM. Suggested action: Review kitchen capacity and front-of-house table prep during this period.`
              : 'Import more reviews to detect peak-hour operational bottlenecks.'}
          </p>
          <div className="insight-meta">
            <span>
              <Icon name="reviews" size={14} /> {waitingTheme?.count ?? 13} mentions (
              {waitingTheme?.share ?? 28}% of reviews)
            </span>
            <span>
              <Icon name="trend" size={14} /> Recurring issue
            </span>
          </div>
        </div>
        <div className="insight-orbit">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <span className="orbit-center">{waitingTheme?.icon ?? '⏱'}</span>
          <span className="orbit-dot dot-a" />
          <span className="orbit-dot dot-b" />
        </div>
      </section>

      {/* STRUCTURED ACTIONABLE CARDS */}
      <div className="insights-section-title">
        <div>
          <div className="eyebrow">ACTIONABLE RECOMMENDATIONS</div>
          <h2>Prioritized Operational Actions</h2>
        </div>
        <span className="insight-date">
          <Icon name="calendar" size={14} /> Last 30 days
        </span>
      </div>

      <section className="insight-card-grid">
        {businessInsights.map((insight, idx) => (
          <article className="insight-card panel" key={insight.id}>
            <div className="insight-card-top">
              <span className={`theme-icon theme-${idx % 4}`}>{insight.icon}</span>
              <span
                className={`insight-direction ${
                  insight.priority === 'HIGH IMPACT' ? 'issue' : 'strength'
                }`}
              >
                {insight.priority}
              </span>
            </div>
            <h3>{insight.title}</h3>
            <p className="insight-observation">{insight.problemContext}</p>
            <div className="insight-rule" />
            <span className="suggested-label">Suggested Business Action</span>
            <p className="insight-recommendation">{insight.suggestedAction}</p>
            {(() => {
              const isAdded = actionChecklist.some((item) => item.id === insight.id);
              return (
                <button
                  className={`button button-small ${isAdded ? 'button-added' : 'button-outline'}`}
                  onClick={() => toggleActionItem(insight)}
                  title={isAdded ? 'Click to undo / remove from checklist' : 'Add to action list'}
                >
                  {isAdded ? (
                    <>
                      <Icon name="check" size={13} /> Added ✓
                    </>
                  ) : (
                    <>
                      Add to action list <Icon name="plus" size={13} />
                    </>
                  )}
                </button>
              );
            })()}
          </article>
        ))}
      </section>

      {/* ACTION CHECKLIST SECTION */}
      <section className="panel action-checklist-panel">
        <div className="checklist-heading">
          <div>
            <div className="eyebrow panel-eyebrow">TEAM EXECUTION PLAN</div>
            <h2>Operational Action Checklist</h2>
            <p className="panel-description">
              Select key recommendations above to build your team's weekly task plan. Check off items as they are implemented or download as CSV.
            </p>
          </div>
          <div className="checklist-actions">
            {actionChecklist.length > 0 && (
              <>
                <button
                  className="button button-primary button-small"
                  onClick={downloadChecklistCsv}
                  title="Export checklist to CSV spreadsheet"
                >
                  <Icon name="download" size={14} /> Download CSV
                </button>
                <button
                  className="button button-quiet button-small"
                  onClick={clearChecklist}
                  title="Clear all checklist items"
                >
                  <Icon name="trash" size={13} /> Clear
                </button>
              </>
            )}
          </div>
        </div>

        {actionChecklist.length === 0 ? (
          <div className="checklist-empty">
            <span className="checklist-empty-icon">📋</span>
            <strong>Your action checklist is empty</strong>
            <p>
              Click <strong>"Add to action list +"</strong> on any recommendation card above to add tasks to your weekly team plan.
            </p>
          </div>
        ) : (
          <div className="checklist-items-list">
            <div className="checklist-progress-bar">
              <div className="checklist-progress-meta">
                <span>
                  {actionChecklist.filter((i) => i.completed).length} of {actionChecklist.length} actions completed
                </span>
                <span>
                  {Math.round((actionChecklist.filter((i) => i.completed).length / actionChecklist.length) * 100)}%
                </span>
              </div>
              <div className="quota-bar">
                <span
                  style={{
                    width: `${(actionChecklist.filter((i) => i.completed).length / actionChecklist.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="checklist-grid">
              {actionChecklist.map((item) => (
                <div className={`checklist-card ${item.completed ? 'completed' : ''}`} key={item.id}>
                  <label className="checklist-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completed)}
                      onChange={() => toggleChecklistItem(item.id)}
                    />
                  </label>
                  <div className="checklist-card-content">
                    <div className="checklist-card-top">
                      <span className="checklist-priority-badge">{item.priority}</span>
                      <strong className={`checklist-item-title ${item.completed ? 'done' : ''}`}>
                        {item.title}
                      </strong>
                    </div>
                    <p className="checklist-action-text">{item.suggestedAction}</p>
                    <small className="checklist-context-text">Issue context: {item.problemContext}</small>
                  </div>
                  <button
                    className="icon-button checklist-remove-btn"
                    title="Remove from checklist"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* WHAT CUSTOMERS LOVE SECTION */}
      <section className="panel strengths-panel">
        <div className="strengths-heading">
          <div>
            <div className="eyebrow panel-eyebrow">WHAT CUSTOMERS LOVE</div>
            <h2>Promote your strongest advantages</h2>
            <p className="panel-description">
              These are the differentiators that keep guests returning. Highlight them in marketing.
            </p>
          </div>
          <span className="strengths-icon">
            <Icon name="smile" size={19} />
          </span>
        </div>
        <div className="strength-chip-row">
          {themes
            .filter((t) => t.direction === 'strength')
            .slice(0, 4)
            .map((theme) => (
              <div
                className="strength-chip"
                key={theme.name}
                onClick={() => {
                  setSelectedThemeFilter(theme.name);
                  changeView('reviews');
                }}
                style={{ cursor: 'pointer' }}
                title="View reviews praising this"
              >
                <span>{theme.icon}</span>
                <div>
                  <strong>{theme.name}</strong>
                  <small>
                    {theme.count} mentions · {theme.share}% praise
                  </small>
                </div>
                <span className="strength-arrow">
                  <Icon name="trend" size={15} />
                </span>
              </div>
            ))}
        </div>
      </section>

      <p className="demo-disclaimer">
        <Icon name="shield" size={14} /> EchoDesk AI automatically extracts themes and maps them to concrete
        operational changes.
      </p>
    </>
  );

  // ----------------------------------------------------
  // SCREEN 4: IMPORT & ANALYZE
  // ----------------------------------------------------
  const renderImport = () => (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">REVIEW IMPORT & AI EXTRACTION</div>
          <h1>
            Import customer reviews<span className="heading-period">.</span>
          </h1>
          <p className="welcome-subtitle">
            Paste reviews in any unstructured format. Gemma & Gemini AI extract sentiment, ratings, and recurring themes.
          </p>
        </div>
        <span className="secure-chip">
          <Icon name="lock" size={13} /> Private & Client-Encrypted
        </span>
      </section>

      <section className="import-layout">
        <div className="import-main panel">
          <div className="import-step-line">
            <span className="step active">
              <i>1</i> Paste Reviews
            </span>
            <span />
            <span className="step">
              <i>2</i> AI Extraction
            </span>
            <span />
            <span className="step">
              <i>3</i> Decision Actions
            </span>
          </div>

          <div className="link-extract-panel">
            <div className="link-extract-header">
              <span className="link-extract-badge">RECOMMENDED</span>
              <div>
                <strong>Import directly from Google Maps with SerpAPI</strong>
                <div><small>Paste any Google Maps link, place URL, or business name to extract live customer reviews & star ratings.</small></div>
              </div>
            </div>
            <div className="link-input-row">
              <input
                type="text"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="Paste Google Maps URL or business name (e.g. Benne Cyberhub)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExtractFromUrl();
                }}
              />
              <button
                className="button button-primary"
                onClick={() => handleExtractFromUrl()}
                disabled={isExtractingUrl}
              >
                {isExtractingUrl ? (
                  <>
                    <span className="ai-spinner" /> Extracting...
                  </>
                ) : (
                  <>
                    <Icon name="download" size={15} /> Fetch Reviews
                  </>
                )}
              </button>
            </div>
            <div className="link-suggestion-row">
              <span>Quick try:</span>
              <button
                type="button"
                className="link-chip"
                onClick={() => {
                  setPlatformUrl('https://www.google.com/maps/place/Benne+-+Heritage+Bangalore+Dosa+-+Cyberhub/@28.495163,77.0872266,17.3z/data=!4m6!3m5!1s0x390d199e61884157:0x4091207b0e80c2cc!8m2!3d28.4960896!4d77.0889002!16s%2Fg%2F11zxk881xc');
                  handleExtractFromUrl('https://www.google.com/maps/place/Benne+-+Heritage+Bangalore+Dosa+-+Cyberhub/@28.495163,77.0872266,17.3z/data=!4m6!3m5!1s0x390d199e61884157:0x4091207b0e80c2cc!8m2!3d28.4960896!4d77.0889002!16s%2Fg%2F11zxk881xc');
                }}
              >
                Benne Dosa Cyberhub
              </button>
              <button
                type="button"
                className="link-chip"
                onClick={() => {
                  setPlatformUrl('Blue Tokai Coffee Gurgaon');
                  handleExtractFromUrl('Blue Tokai Coffee Gurgaon');
                }}
              >
                Blue Tokai Gurgaon
              </button>
            </div>
            <div className="tier-limit-note">
              <span>
                ⚡ <strong>Free Tier Limit:</strong> Extracts up to 15–20 live reviews from Google Maps link.
              </span>
              <button type="button" onClick={() => changeView('plans')}>
                Want more reviews? View Plans (Demo) →
              </button>
            </div>
          </div>

          <div className="import-file-divider" style={{ margin: '18px 0 22px' }}>
            <span>OR PASTE REVIEWS MANUALLY (FREE UP TO 50)</span>
          </div>

          <div className="import-title-row">
            <div>
              <h2>Paste customer reviews (up to 50 free)</h2>
              <p>Paste customer feedback or drop in a Google Maps link. Gemma & Gemini AI extract sentiment and themes.</p>
            </div>
            <span className="optional-label">FREE TIER: 50 MAX</span>
          </div>

          {hasReachedAuditLimit && (
            <div className="audit-locked-alert">
              <div className="audit-locked-info">
                <span className="audit-locked-badge">
                  <Icon name="lock" size={13} /> AUDIT LIMIT REACHED (50/50)
                </span>
                <p>
                  You have already analyzed 50 reviews in this audit. You cannot enter another batch into this audit. To start a fresh audit, click <strong>Analyze Another Business</strong> or upgrade.
                </p>
              </div>
              <div className="audit-locked-actions">
                <button className="button button-outline button-small" onClick={clearDatabase}>
                  <Icon name="refresh" size={13} /> Analyze Another Business
                </button>
                <button className="button button-primary button-small" onClick={() => changeView('plans')}>
                  View Plans
                </button>
              </div>
            </div>
          )}

          <textarea
            className="large-review-input"
            value={hasReachedAuditLimit ? '' : paste}
            onChange={(e) => {
              if (hasReachedAuditLimit) {
                setLimitModal({
                  type: 'audit_locked',
                  enteredCount: 0,
                  existingCount: reviews.length,
                  availableRemaining: 0,
                });
                return;
              }
              setPaste(e.target.value);
            }}
            disabled={hasReachedAuditLimit}
            placeholder={
              hasReachedAuditLimit
                ? 'Free tier audit limit reached (50/50 reviews analyzed). You cannot enter another batch of reviews to this audit. Click "Analyze Another Business" above to start fresh, or upgrade.'
                : `★★★★★ Amazing food and super friendly staff!\n\n★★★ The wait was too long around 8pm, but the manager handled it well.\n\n★★★★ Two dishes were unavailable tonight.\n\n(Tip: You can also paste a Google Maps link directly here!)`
            }
            rows={7}
          />

          <div className="input-footer">
            <span>Separate reviews with a blank line, or paste a Google Maps link.</span>
            <span>
              {countReviewBlocks(paste)} / {MAX_PASTE_REVIEWS} free reviews detected
            </span>
          </div>

          <div className="import-controls">
            <button
              className="button button-primary"
              onClick={analyzePasteAction}
              disabled={isAnalyzing || hasReachedAuditLimit}
            >
              {isAnalyzing ? (
                <>
                  <span className="ai-spinner" /> Analyzing with AI...
                </>
              ) : hasReachedAuditLimit ? (
                <>
                  <Icon name="lock" size={15} /> 50/50 Limit Reached
                </>
              ) : (
                <>
                  <Icon name="spark" size={15} /> Analyze Reviews <Icon name="arrow" size={14} />
                </>
              )}
            </button>
            <span className="import-or">or</span>
            <button className="button button-quiet" onClick={resetDemoData}>
              <Icon name="coffee" size={15} /> Try 48 demo reviews
            </button>
          </div>

          <div className="tier-limit-note">
            <span>
              ⚡ <strong>Free Tier Limit:</strong> Pasting reviews is free up to 50 reviews per batch. For unlimited bulk uploads, explore our plans.
            </span>
            <button type="button" onClick={() => changeView('plans')}>
              View Plans (Demo) →
            </button>
          </div>

          <div className="import-file-divider">
            <span>HAVE AN EXPORT?</span>
          </div>

          <label className="csv-upload">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                void importCsvFile(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
            <span className="csv-icon">
              <Icon name="file" size={19} />
            </span>
            <span className="csv-copy">
              <strong>Upload a CSV file</strong>
              <small>Exported from Google, Trustpilot, Zomato, or your POS system</small>
            </span>
            <Icon name="upload" size={16} />
          </label>
        </div>

        <aside className="import-aside">
          <section className="panel import-how-panel">
            <span className="how-icon">
              <Icon name="spark" size={18} />
            </span>
            <div className="eyebrow panel-eyebrow">HOW ECODESK WORKS</div>
            <h3>From reviews to business decisions.</h3>
            <div className="how-step">
              <span>01</span>
              <div>
                <strong>Understand</strong>
                <p>Calculates rating, sentiment, and clusters feedback into recurring themes.</p>
              </div>
            </div>
            <div className="how-step">
              <span>02</span>
              <div>
                <strong>Respond</strong>
                <p>AI crafts empathetic, tone-accurate responses ready to copy & post.</p>
              </div>
            </div>
            <div className="how-step">
              <span>03</span>
              <div>
                <strong>Improve</strong>
                <p>Translates recurring complaints into concrete operational fixes.</p>
              </div>
            </div>
          </section>

          <button className="panel demo-review-card" onClick={resetDemoData}>
            <span className="demo-card-icon">
              <Icon name="coffee" size={16} />
            </span>
            <span>
              <strong>Take {businessProfile.name} for a spin</strong>
              <small>Explore 48 benchmark reviews and recurring themes</small>
            </span>
            <Icon name="arrow" size={15} />
          </button>
        </aside>
      </section>
    </>
  );

  // ----------------------------------------------------
  // SCREEN 5: PLANS & BILLING
  // ----------------------------------------------------
  const renderPlans = () => (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">SIMPLE PLANS FOR GROWING BUSINESSES</div>
          <h1>
            Turn reviews into revenue<span className="heading-period">.</span>
          </h1>
          <p className="welcome-subtitle">
            Predictable pricing that scales with your locations and review volume.
          </p>
        </div>
        <span className="billing-toggle">
          Monthly <span>●</span> Annual <small>Save 2 months</small>
        </span>
      </section>

      <div className="demo-submission-banner">
        <span className="demo-submission-pill">READ-ONLY DEMO</span>
        <p>
          <strong>This is a demo submission for Hacktoberfest 2026.</strong> EchoDesk plans and billing features are presented for read-only preview and architectural evaluation. No payments are charged and all AI intelligence tools are fully functional for testing.
        </p>
      </div>

      <section className="pricing-grid">
        {/* FREE */}
        <article className="pricing-card panel">
          <span className="plan-kicker">GET STARTED</span>
          <h2>Free</h2>
          <p className="plan-description">Test review intelligence for a single storefront.</p>
          <div className="price-line">
            <strong>₹0</strong>
            <span>/ month</span>
          </div>
          <button
            className="button button-outline button-full"
            disabled
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
          >
            Demo Active · Read Only
          </button>
          <div className="plan-divider" />
          <ul>
            <li>
              <Icon name="check" size={15} /> 20 reviews / month
            </li>
            <li>
              <Icon name="check" size={15} /> Basic review sentiment analysis
            </li>
            <li>
              <Icon name="check" size={15} /> 5 AI reply suggestions
            </li>
            <li className="plan-muted">
              <Icon name="close" size={15} /> Actionable business insights
            </li>
          </ul>
        </article>

        {/* STARTER */}
        <article className="pricing-card panel featured-plan">
          <span className="plan-popular">RECOMMENDED</span>
          <span className="plan-kicker">FOR BUSY OWNERS</span>
          <h2>Starter</h2>
          <p className="plan-description">Full review intelligence and unlimited replies.</p>
          <div className="price-line">
            <strong>₹299</strong>
            <span>/ month</span>
          </div>
          <button
            className="button button-primary button-full"
            disabled
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
          >
            Read Only · Hacktoberfest 2026 Demo
          </button>
          <div className="plan-divider" />
          <ul>
            <li>
              <Icon name="check" size={15} /> 500 reviews / month
            </li>
            <li>
              <Icon name="check" size={15} /> Unlimited AI replies (3 brand tones)
            </li>
            <li>
              <Icon name="check" size={15} /> Actionable business insights & actions
            </li>
            <li>
              <Icon name="check" size={15} /> Full review history & exports
            </li>
          </ul>
        </article>

        {/* PRO */}
        <article className="pricing-card panel">
          <span className="plan-kicker">MULTI-LOCATION</span>
          <h2>Pro</h2>
          <p className="plan-description">For thriving brands with multiple locations and teams.</p>
          <div className="price-line">
            <strong>₹799</strong>
            <span>/ month</span>
          </div>
          <button
            className="button button-dark button-full"
            disabled
            style={{ opacity: 0.65, cursor: 'not-allowed' }}
          >
            Read Only · Hacktoberfest 2026 Demo
          </button>
          <div className="plan-divider" />
          <ul>
            <li>
              <Icon name="check" size={15} /> Unlimited reviews
            </li>
            <li>
              <Icon name="check" size={15} /> Advanced operational root-cause analysis
            </li>
            <li>
              <Icon name="check" size={15} /> Multiple locations & branches
            </li>
            <li>
              <Icon name="check" size={15} /> AI custom brand voice memory & exports
            </li>
          </ul>
        </article>
      </section>

      <section className="plan-footnote panel">
        <span className="plan-footnote-icon">
          <Icon name="shield" size={19} />
        </span>
        <div>
          <strong>Transparent & risk-free.</strong>
          <p>Plans can be upgraded or paused at any time. No hidden setup fees.</p>
        </div>
        <button className="text-link" onClick={() => changeView('dashboard')}>
          Back to your dashboard <Icon name="arrow" size={14} />
        </button>
      </section>
    </>
  );

  const pageTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    reviews: 'Review inbox',
    insights: 'Business insights',
    import: 'Import & analyze',
    plans: 'Plans & billing',
  };

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <button
          className="brand-lockup"
          onClick={() => changeView('dashboard')}
          aria-label="EchoDesk home"
        >
          <BrandMark />
          <span>
            <strong>EchoDesk</strong>
            <small>ONLINE REVIEW INTELLIGENCE</small>
          </span>
        </button>

        {hasSelectedBusiness && (
          <button
            className="business-switcher"
            onClick={() => openOnboarding(1)}
            aria-label="Edit business profile"
          >
            <span className="business-avatar">
              <Icon name="coffee" size={16} />
            </span>
            <span className="business-switcher-copy">
              <strong>{businessProfile.name}</strong>
              <small>
                {businessProfile.category} · {businessProfile.location}
              </small>
            </span>
            <Icon name="chevron" size={14} />
          </button>
        )}

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'selected' : ''}`}
              onClick={() => changeView(item.id)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.badge && <b className="nav-badge">{pendingCount}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="sidebar-label">ACCOUNT</div>
        <button
          className={`nav-item ${view === 'plans' ? 'selected' : ''}`}
          onClick={() => changeView('plans')}
        >
          <Icon name="credit" size={17} />
          <span>Plans & billing</span>
          <span className="starter-chip">Starter</span>
        </button>

        <div className="sidebar-bottom">
          <div className="quota-card">
            <div className="quota-heading">
              <span>MONTHLY REVIEW QUOTA</span>
              <Icon name="arrow" size={12} />
            </div>
            <div className="quota-value">
              <strong>{quotaUsed}</strong>
              <span>/ 500</span>
            </div>
            <div className="quota-bar">
              <span style={{ width: `${Math.min(100, quotaUsed / 5)}%` }} />
            </div>
            <div className="quota-caption">{quotaRemaining} reviews remaining this month</div>
          </div>

          <button className="help-link" onClick={() => openOnboarding(0)}>
            ? <span>Onboarding guide</span>
            <span className="version-label">v1.2.0</span>
          </button>

          <button
            className="profile-row"
            onClick={() => openOnboarding(1)}
            title="Edit business profile"
          >
            <span className="profile-avatar">E</span>
            <span>
              <strong>EchoDesk User</strong>
              <small>
                {hasSelectedBusiness
                  ? businessProfile.name
                  : 'Online Review Tool'}
              </small>
            </span>
            <Icon name="settings" size={16} />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}

      {/* MAIN VIEWPORT */}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Icon name="menu" />
          </button>

          <div className="breadcrumbs">
            <span>
              {hasSelectedBusiness
                ? businessProfile.name
                : 'EchoDesk'}
            </span>
            <Icon name="chevron" size={13} />
            <strong>{pageTitles[view]}</strong>
          </div>

          <div className="topbar-tools">
            <label className="search-box">
              <Icon name="search" size={16} />
              <input
                ref={searchInputRef}
                aria-label="Search reviews"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) setView('reviews');
                }}
                placeholder="Search reviews, customer names, or themes…"
              />
              <kbd>⌘ K</kbd>
            </label>

            <button className="period-button" onClick={() => setToast('Showing last 30 days of customer reviews.')}>
              <Icon name="calendar" size={14} /> Last 30 days <Icon name="chevron" size={13} />
            </button>

            <button
              className="icon-button topbar-bell"
              aria-label="Notifications"
              onClick={() => {
                setReviewFilter('Needs reply');
                changeView('reviews');
              }}
              title={`${pendingCount} reviews need reply`}
            >
              <Icon name="bell" size={17} />
              {pendingCount > 0 && <span />}
            </button>

            <button
              className="topbar-avatar"
              aria-label="EchoDesk User"
              onClick={() => openOnboarding(1)}
            >
              E
            </button>
          </div>
        </header>

        <div className="page-wrap" key={view}>
          {view === 'dashboard'
            ? renderDashboard()
            : view === 'reviews'
            ? renderReviews()
            : view === 'insights'
            ? renderInsights()
            : view === 'import'
            ? renderImport()
            : renderPlans()}

          <footer className="page-footer">
            <span>
              EchoDesk <span className="footer-dot">·</span> Turn customer reviews into replies and business decisions
            </span>
            <span>
              <i /> Powered by Gemma & Gemini AI
            </span>
          </footer>
        </div>
      </main>

      {/* SCREEN 4: REPLY ASSISTANT MODAL */}
      {replyReview && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setReplyReview(null);
          }}
        >
          <section
            className="reply-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reply-title"
          >
            <div className="modal-top">
              <div>
                <span className="eyebrow">A REPLY THAT SOUNDS LIKE YOU</span>
                <h2 id="reply-title">Reply assistant</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close reply assistant"
                onClick={() => setReplyReview(null)}
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="modal-review">
              <div className="modal-review-meta">
                <strong>{replyReview.customer}</strong>
                <span>·</span>
                <span>{replyReview.date}</span>
                <Rating value={replyReview.rating} />
              </div>
              <p>"{replyReview.text}"</p>
              <div className="review-tags">
                {replyReview.themes.map((theme) => (
                  <span key={theme} className="theme-tag">
                    {theme}
                  </span>
                ))}
                <SentimentTag sentiment={replyReview.sentiment} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <label className="tone-label" htmlFor="reply-tone" style={{ margin: 0 }}>
                Choose tone (3 MVP settings)
              </label>
              <button
                className="ai-regenerate-btn"
                onClick={() => void regenerateReply(replyTone)}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? (
                  <>
                    <span className="ai-spinner" /> Regenerating...
                  </>
                ) : (
                  <>
                    <Icon name="spark" size={13} /> Regenerate with AI
                  </>
                )}
              </button>
            </div>

            <div className="tone-options" id="reply-tone">
              {(
                [
                  'Warm & professional',
                  'Short & friendly',
                  'Apologetic & service-focused',
                ] as const
              ).map((tone) => (
                <button
                  key={tone}
                  className={`tone-option ${replyTone === tone ? 'active' : ''}`}
                  onClick={() => void regenerateReply(tone)}
                >
                  {tone}
                </button>
              ))}
            </div>

            <label className="reply-editor-label" htmlFor="reply-text">
              YOUR REPLY <span>Editable before sending</span>
            </label>
            <textarea
              id="reply-text"
              className="reply-editor"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
            />

            <p className="demo-note-small">
              <Icon name="shield" size={13} /> AI draft tailored to {businessProfile.name}'s brand voice. Review and customize anytime.
            </p>

            <div className="modal-actions">
              <button className="button button-outline" onClick={() => void copyReplyText()}>
                <Icon name="copy" size={15} /> Copy reply
              </button>
              <button className="button button-quiet" onClick={() => saveReplyStatus('draft')}>
                Save draft
              </button>
              <button className="button button-primary" onClick={() => saveReplyStatus('ready')}>
                Mark ready <Icon name="arrow" size={14} />
              </button>
              <button className="button button-soft" onClick={() => saveReplyStatus('posted')}>
                Mark posted
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ADD SINGLE REVIEW MODAL */}
      {showAddReviewModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAddReviewModal(false);
          }}
        >
          <section className="reply-modal" style={{ maxWidth: '440px' }} role="dialog">
            <div className="modal-top">
              <div>
                <span className="eyebrow">NEW CUSTOMER FEEDBACK</span>
                <h2>Add Single Review</h2>
              </div>
              <button className="icon-button" onClick={() => setShowAddReviewModal(false)}>
                <Icon name="close" />
              </button>
            </div>

            <div className="profile-form" style={{ marginTop: '10px' }}>
              <div className="profile-form-row">
                <label>
                  Customer Name
                  <input
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    placeholder="e.g. Maya S."
                  />
                </label>
                <label>
                  Rating
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(Number(e.target.value))}
                  >
                    <option value={5}>★★★★★ (5 Stars)</option>
                    <option value={4}>★★★★☆ (4 Stars)</option>
                    <option value={3}>★★★☆☆ (3 Stars)</option>
                    <option value={2}>★★☆☆☆ (2 Stars)</option>
                    <option value={1}>★☆☆☆☆ (1 Star)</option>
                  </select>
                </label>
              </div>

              <label>
                Review Text
                <textarea
                  rows={4}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Paste or type customer comments here…"
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                className="button button-quiet"
                onClick={() => setShowAddReviewModal(false)}
              >
                Cancel
              </button>
              <button className="button button-primary" onClick={handleAddSingleReview}>
                Add to inbox <Icon name="arrow" size={14} />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ONBOARDING MODAL */}
      {showOnboarding && (
        <OnboardingModal
          step={onboardingStep}
          profile={businessProfile}
          onProfileChange={updateBusinessProfile}
          onProfileBatchUpdate={setBusinessProfile}
          onStepChange={setOnboardingStep}
          onClose={() => setShowOnboarding(false)}
          onStartPaste={() => {
            setShowOnboarding(false);
            setPaste(starterPaste);
            changeView('import');
          }}
          onUploadCsv={(file) => {
            setShowOnboarding(false);
            void importCsvFile(file);
          }}
          onTryDemo={() => {
            setShowOnboarding(false);
            resetDemoData();
          }}
        />
      )}

      {/* REVIEW LIMIT MODAL */}
      {limitModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLimitModal(null);
          }}
        >
          <section className="reply-modal limit-modal" role="dialog" aria-labelledby="limit-modal-title">
            <div className="limit-modal-top">
              <span className="limit-alert-icon">⚠️</span>
              <div className="limit-modal-titles">
                <span className="limit-modal-badge">
                  {limitModal.type === 'audit_locked' ? 'AUDIT LOCKED' : 'FREE TIER LIMIT'}
                </span>
                <h2 id="limit-modal-title">
                  {limitModal.type === 'more_than_50'
                    ? 'Maximum 50 Reviews Allowed'
                    : limitModal.type === 'audit_locked'
                    ? 'Audit Limit Reached (50/50 Reviews)'
                    : 'Audit Capacity Exceeded'}
                </h2>
              </div>
              <button className="icon-button" onClick={() => setLimitModal(null)} aria-label="Close dialog">
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="limit-modal-body">
              {limitModal.type === 'more_than_50' && (
                <p>
                  You entered <strong>{limitModal.enteredCount} reviews</strong>. On the Free Tier, <strong>not more than 50 reviews are allowed at a time</strong>.
                  <br /><br />
                  Please reduce your reviews to 50 or fewer, or upgrade to a Pro plan for unlimited bulk analysis.
                </p>
              )}
              {limitModal.type === 'capacity_exceeded' && (
                <p>
                  You already have <strong>{limitModal.existingCount} reviews</strong> in this audit. Adding <strong>{limitModal.enteredCount} reviews</strong> would exceed the 50 review audit limit.
                  <br /><br />
                  On the Free Tier, an audit cannot exceed 50 reviews total. You can edit your reviews, or start a fresh audit for another business.
                </p>
              )}
              {limitModal.type === 'audit_locked' && (
                <p>
                  You have already analyzed <strong>{limitModal.existingCount} reviews</strong> in this business audit. On the Free Tier, each audit is capped at 50 reviews.
                  <br /><br />
                  You cannot enter another batch of reviews into this audit. To start a fresh audit for another business, click <strong>Analyze Another Business</strong> below, or upgrade for unlimited bulk reviews.
                </p>
              )}
            </div>

            <div className="limit-modal-actions">
              <button className="button button-quiet button-small" onClick={() => setLimitModal(null)}>
                {limitModal.type === 'audit_locked' ? 'Close' : 'Edit my reviews'}
              </button>
              {(limitModal.existingCount > 0 || limitModal.type === 'audit_locked') && (
                <button
                  className="button button-outline button-small"
                  onClick={() => {
                    clearDatabase();
                    setLimitModal(null);
                  }}
                >
                  <Icon name="refresh" size={14} /> Analyze Another Business
                </button>
              )}
              <button
                className="button button-primary button-small"
                onClick={() => {
                  setLimitModal(null);
                  changeView('plans');
                }}
              >
                View Plans (Unlimited)
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={15} />
          </span>
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
