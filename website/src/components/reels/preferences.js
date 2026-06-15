// Lightweight content-preference helpers for the Chrysalis algorithm feed.
//
// Anonymous visitors are identified by a frontend-generated session_id (a UUID
// persisted in localStorage). Preferences (preferred language + approximate
// region) are saved to the backend and used to target YouTube searches. We
// never store or send exact GPS coordinates — only a coarse region/language.

const API_URL = import.meta.env.VITE_API_URL ?? '';
const SESSION_ID_KEY = 'chrysalis-session-id';

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_REGION = 'US';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'zh-Hans', label: 'Chinese (Simplified)' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
];

export const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'IN', label: 'India' },
  { code: 'CN', label: 'China' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
];

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));
const REGION_CODES = new Set(REGIONS.map((r) => r.code));

function generateId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Stable per-browser session id used to scope anonymous preferences. */
export function getSessionId() {
  if (typeof window === 'undefined') return null;
  let id = window.localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/**
 * Best-effort guess of the user's language + region from the browser locale.
 * Only used to pre-fill the manual picker for confirmation — never authoritative
 * and never derived from GPS.
 */
export function guessLocalePreferences() {
  const result = { preferred_language: DEFAULT_LANGUAGE, region_code: DEFAULT_REGION };
  if (typeof navigator === 'undefined') return result;

  const locale = navigator.language || (navigator.languages && navigator.languages[0]) || '';
  if (!locale) return result;

  try {
    const parsed = new Intl.Locale(locale);
    const lang = (parsed.language || '').toLowerCase();
    if (lang === 'zh') {
      result.preferred_language = parsed.script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
    } else if (LANGUAGE_CODES.has(lang)) {
      result.preferred_language = lang;
    }

    const region = (parsed.region || '').toUpperCase();
    if (REGION_CODES.has(region)) result.region_code = region;
    return result;
  } catch {
    // Fall through to a tiny parser for unusual browser locale strings.
  }

  const parts = locale.split('-').filter(Boolean);
  const lang = (parts[0] || '').toLowerCase();
  if (lang === 'zh') {
    result.preferred_language = parts.some((part) => part.toLowerCase() === 'hant')
      ? 'zh-Hant'
      : 'zh-Hans';
  } else if (LANGUAGE_CODES.has(lang)) {
    result.preferred_language = lang;
  }

  const region = (parts.find((part) => /^[a-z]{2}$/i.test(part)) || '').toUpperCase();
  if (REGION_CODES.has(region)) result.region_code = region;

  return result;
}

function defaults() {
  return {
    preferred_language: DEFAULT_LANGUAGE,
    region_code: DEFAULT_REGION,
    use_approx_location: false,
    location_city: null,
    location_country: null,
    has_completed_language_setup: false,
  };
}

/** Fetch saved preferences for the current session. Falls back to defaults. */
export async function fetchPreferences() {
  const sessionId = getSessionId();
  if (!sessionId) return defaults();
  try {
    const params = new URLSearchParams({ session_id: sessionId });
    const response = await fetch(`${API_URL}/api/preferences?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Chrysalis preferences] fetch failed, using defaults:', error);
    }
    return defaults();
  }
}

/** Save preferences for the current session. Returns the persisted record. */
export async function savePreferences(payload) {
  const sessionId = getSessionId();
  try {
    const response = await fetch(`${API_URL}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, ...payload }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Chrysalis preferences] save failed:', error);
    }
    // Return an optimistic record so the UI can proceed even if the backend
    // is unavailable; the notice still won't reappear this session.
    return { ...defaults(), ...payload, session_id: sessionId };
  }
}

/**
 * Request browser geolocation purely as a consent gesture. We do NOT read or
 * store the coordinates — granting permission only flips use_approx_location on
 * and lets us pre-fill the region from the locale for the user to confirm.
 * Resolves with { granted } regardless of outcome so the flow never blocks.
 */
export function requestApproxLocationConsent() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ granted: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve({ granted: true }),
      () => resolve({ granted: false }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });
}
