import { useState } from 'react';
import { discoverBusinessInfo } from './ai';
import type { BusinessProfile } from './types';

export const defaultProfile: BusinessProfile = {
  name: 'My Business',
  category: 'Local Business',
  location: 'General',
  description: 'Committed to delivering high quality service and customer satisfaction.',
  tone: 'Warm & professional',
  website: '',
};

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <div
      className="brand-mark"
      style={{ width: `${size}px`, height: `${size}px`, flex: `0 0 ${size}px` }}
      aria-hidden="true"
    >
      <span className="brand-mark-core" />
      <span className="brand-mark-ring" />
    </div>
  );
}

interface OnboardingModalProps {
  step: number;
  profile: BusinessProfile;
  onProfileChange: (field: keyof BusinessProfile, value: string) => void;
  onProfileBatchUpdate: (updated: BusinessProfile) => void;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onStartPaste: () => void;
  onUploadCsv: (file: File) => void;
  onTryDemo: () => void;
}

const steps = ['Welcome', 'Your business', 'Your reviews', "You're done!"];

export function OnboardingModal({
  step,
  profile,
  onProfileChange,
  onProfileBatchUpdate,
  onStepChange,
  onClose,
  onStartPaste,
  onUploadCsv,
  onTryDemo,
}: OnboardingModalProps) {
  const activeStep = Math.max(0, Math.min(3, step));
  const [websiteQuery, setWebsiteQuery] = useState(profile.website || '');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredConfirmed, setDiscoveredConfirmed] = useState(false);

  const handleDiscover = async (queryToUse?: string) => {
    const q = (queryToUse || websiteQuery).trim();
    if (!q) return;
    setIsDiscovering(true);
    setDiscoveredConfirmed(false);
    try {
      const discovered = await discoverBusinessInfo(q);
      onProfileBatchUpdate(discovered);
      setDiscoveredConfirmed(true);
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <div
      className="modal-backdrop onboarding-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <BrandMark size={28} />
            <div className="onboarding-brand-text">
              <strong>EchoDesk</strong>
              <small>ONLINE REVIEW INTELLIGENCE</small>
            </div>
          </div>
          <button className="icon-button" aria-label="Close setup" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="onboarding-progress">
          {steps.map((label, index) => (
            <div className={`onboarding-progress-step ${index <= activeStep ? 'active' : ''}`} key={label}>
              <span>{index < activeStep ? '✓' : `0${index + 1}`}</span>
              {label}
            </div>
          ))}
        </div>

        {/* STEP 0: WELCOME */}
        {activeStep === 0 && (
          <div className="onboarding-content welcome-setup">
            <span className="onboarding-kicker">TURN CUSTOMER REVIEWS INTO REPLIES & DECISIONS</span>
            <h2 id="onboarding-title">
              Turn customer feedback
              <br />
              into your biggest advantage.
            </h2>
            <p>
              EchoDesk analyzes customer reviews, drafts authentic replies in your brand tone, and isolates repeated
              operational issues so you know exactly what to change.
            </p>

            <div className="onboarding-preview" onClick={() => onStepChange(1)} role="button" tabIndex={0}>
              <span className="step-num">01</span>
              <div>
                <strong>Understand</strong>
                <small>Sentiment breakdown & recurring themes (Waiting time, Staff, Cleanliness).</small>
              </div>
              <span className="preview-arrow">→</span>
            </div>

            <div className="onboarding-preview" onClick={() => onStepChange(1)} role="button" tabIndex={0}>
              <span className="step-num">02</span>
              <div>
                <strong>Respond</strong>
                <small>AI-drafted replies in your brand tone (Warm, Short, or Apologetic).</small>
              </div>
              <span className="preview-arrow">→</span>
            </div>

            <div className="onboarding-preview" onClick={() => onStepChange(1)} role="button" tabIndex={0}>
              <span className="step-num">03</span>
              <div>
                <strong>Improve</strong>
                <small>Concrete, prioritized operational fixes for peak-hours and weekend rushes.</small>
              </div>
              <span className="preview-arrow">→</span>
            </div>

            <div className="onboarding-actions">
              <button className="button button-primary" onClick={() => onStepChange(1)}>
                Start 2-minute setup <span aria-hidden="true">→</span>
              </button>
              <button className="onboarding-skip" onClick={onTryDemo}>
                Explore demo reviews first
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: YOUR BUSINESS (WITH AI WEBSITE DISCOVERY) */}
        {activeStep === 1 && (
          <div className="onboarding-content">
            <span className="onboarding-kicker">STEP 1 · YOUR BUSINESS PROFILE</span>
            <h2 id="onboarding-title">Let AI discover your business.</h2>
            <p>Enter your website or business name, and EchoDesk will automatically configure your profile.</p>

            <div className="ai-discovery-box">
              <label htmlFor="website-input" className="discovery-label">
                ✨ Website or business name
              </label>
              <div className="discovery-input-row">
                <input
                  id="website-input"
                  value={websiteQuery}
                  onChange={(e) => setWebsiteQuery(e.target.value)}
                  placeholder="e.g. oliveandbean.com or Blue Tokai"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleDiscover();
                  }}
                />
                <button
                  className="button button-primary button-small"
                  onClick={() => void handleDiscover()}
                  disabled={isDiscovering || !websiteQuery.trim()}
                >
                  {isDiscovering ? 'Analyzing...' : 'Discover with AI ✨'}
                </button>
              </div>

              <div className="discovery-suggestions">
                <span className="suggestion-label">Try example:</span>
                {['oliveandbean.com', 'bluetokai.com', 'thecornerbistro.com'].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      setWebsiteQuery(ex);
                      void handleDiscover(ex);
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {discoveredConfirmed && (
                <div className="discovery-success-badge">
                  <span>✓</span> AI discovered details for <strong>{profile.name}</strong>. Looks right ✓
                </div>
              )}
            </div>

            <div className="profile-form">
              <div className="profile-form-row">
                <label>
                  Business name
                  <input
                    value={profile.name}
                    onChange={(event) => onProfileChange('name', event.target.value)}
                    placeholder="e.g. Summit Bistro, Downtown Dental, etc."
                  />
                </label>
                <label>
                  Category
                  <input
                    value={profile.category}
                    onChange={(event) => onProfileChange('category', event.target.value)}
                    placeholder="e.g. Restaurant, Clinic, Retail"
                  />
                </label>
              </div>

              <div className="profile-form-row">
                <label>
                  Location
                  <input
                    value={profile.location}
                    onChange={(event) => onProfileChange('location', event.target.value)}
                    placeholder="e.g. Central District"
                  />
                </label>
                <label>
                  Brand tone
                  <select
                    value={profile.tone}
                    onChange={(event) => onProfileChange('tone', event.target.value)}
                  >
                    <option>Warm & premium</option>
                    <option>Warm & professional</option>
                    <option>Friendly & casual</option>
                  </select>
                </label>
              </div>

              <label>
                What makes your business special?
                <textarea
                  value={profile.description}
                  onChange={(event) => onProfileChange('description', event.target.value)}
                  placeholder="Specialty coffee and all-day brunch"
                  rows={2}
                />
              </label>
            </div>

            <div className="onboarding-actions between">
              <button className="button button-quiet" onClick={() => onStepChange(0)}>
                Back
              </button>
              <button className="button button-primary" onClick={() => onStepChange(2)}>
                Save & continue <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: YOUR REVIEWS */}
        {activeStep === 2 && (
          <div className="onboarding-content reviews-setup">
            <span className="onboarding-kicker">STEP 2 · ADD YOUR REVIEWS</span>
            <h2 id="onboarding-title">How do you want to add reviews?</h2>
            <p>EchoDesk automatically parses ratings, detects sentiment, and extracts themes.</p>

            <button className="onboarding-choice" onClick={onStartPaste}>
              <span className="choice-icon paste-icon">📋</span>
              <span>
                <strong>Paste reviews</strong>
                <small>Fastest option · Paste copied reviews from Google or any platform</small>
              </span>
              <span className="choice-arrow">→</span>
            </button>

            <label className="onboarding-choice csv-choice">
              <input
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUploadCsv(file);
                    onStepChange(3);
                  }
                }}
              />
              <span className="choice-icon csv-icon-setup">📄</span>
              <span>
                <strong>Upload CSV</strong>
                <small>If you already have exported reviews (.csv)</small>
              </span>
              <span className="choice-arrow">→</span>
            </label>

            <button className="onboarding-choice" onClick={onTryDemo}>
              <span className="choice-icon demo-icon">🧪</span>
              <span>
                <strong>Try demo reviews</strong>
                <small>Explore 48 realistic benchmark reviews</small>
              </span>
              <span className="choice-arrow">→</span>
            </button>

            <div className="onboarding-actions between">
              <button className="button button-quiet" onClick={() => onStepChange(1)}>
                Back
              </button>
              <button className="onboarding-skip" onClick={() => onStepChange(3)}>
                Next step
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: YOU'RE DONE! */}
        {activeStep === 3 && (
          <div className="onboarding-content done-setup">
            <span className="onboarding-kicker">ALL SET</span>
            <h2 id="onboarding-title">You're ready to roll! 🎉</h2>
            <p>
              Your workspace is configured for <strong>{profile.name}</strong> ({profile.category} in {profile.location}).
            </p>

            <div className="done-summary-card">
              <div className="done-item">
                <span className="done-check">✓</span>
                <div>
                  <strong>Reputation Index Active</strong>
                  <small>Continuously tracking sentiment balance and response queue</small>
                </div>
              </div>
              <div className="done-item">
                <span className="done-check">✓</span>
                <div>
                  <strong>AI Reply Assistant Configured</strong>
                  <small>Defaulting to {profile.tone} tone for customer responses</small>
                </div>
              </div>
              <div className="done-item">
                <span className="done-check">✓</span>
                <div>
                  <strong>Operational Insights Enabled</strong>
                  <small>Isolating peak-hour bottlenecks & customer favorite attributes</small>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button className="button button-primary button-full" onClick={onClose}>
                Open Dashboard & Review Inbox <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        <p className="onboarding-footnote">Private & secure · Works with Gemma & Gemini AI · Changes stay in this browser</p>
      </section>
    </div>
  );
}
