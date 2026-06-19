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
