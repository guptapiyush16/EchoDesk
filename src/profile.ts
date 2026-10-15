import { defaultProfile } from './OnboardingModal';
import type { BusinessProfile } from './types';

const PROFILE_KEY = 'ecodesk.business-profile.v2';

export function loadBusinessProfile(): BusinessProfile {
  try {
    const reviewsSaved = localStorage.getItem('ecodesk.reviews.v2');
    if (!reviewsSaved || reviewsSaved === '[]') {
      return defaultProfile;
    }
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? { ...defaultProfile, ...(JSON.parse(saved) as Partial<BusinessProfile>) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveBusinessProfile(profile: BusinessProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* The app remains usable without storage. */
  }
}

export function clearBusinessProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* Ignore storage errors */
  }
}
