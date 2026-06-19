// ──────────────────────────────────────────────────────────────
// TEMPORARY brand-name toggle.
//
// Single source of truth for the app's DISPLAY name. Flip
// USE_SUNSOCIAL back to false to revert every wordmark, title,
// aria-label, system message, and @handle to "Chrysalis".
//
// Internal identifiers (localStorage keys, CSS class names,
// component names, the `chrysalis_scores` data field, and the
// project-history narrative pages) intentionally keep the
// Chrysalis name — they are not user-facing brand display.
// ──────────────────────────────────────────────────────────────
export const USE_SUNSOCIAL = true;

export const BRAND = USE_SUNSOCIAL ? 'SunSocial' : 'Chrysalis';

// Lowercase handle/slug form used in demo @mentions.
export const BRAND_HANDLE = USE_SUNSOCIAL ? 'sunsocial' : 'chrysalis';

// ──────────────────────────────────────────────────────────────
// TEMPORARY demo switches. Flip back to false to restore normal
// behavior (none of these persist anything, so reverting is clean).
// ──────────────────────────────────────────────────────────────

// Skip the "choose your algorithm" start screen and drop straight
// into the feed on the default mode (Cruisin' / flutter-feed).
export const SKIP_ALGORITHM_ONBOARDING = true;

// While in the algorithm feed, disable navigating back to the Home
// screen (the Home nav item shows a notice instead).
export const LOCK_HOME_FROM_ALGORITHM = false;

// Recolor the marketing/landing site from "Chrysalis purple" to the
// yellow/blue Sunshine palette (matches the feed/home). Applied via a
// data-sunshine attribute + CSS override block in index.css.
export const SUNSHINE_LANDING = true;
