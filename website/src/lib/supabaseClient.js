import { createClient } from '@supabase/supabase-js';

/**
 * Single shared Supabase browser client for Chrysalis.
 *
 * Reads the public project URL + anon (publishable) key from Vite env. The anon
 * key is safe to ship to the browser — data is protected by Row Level Security,
 * not by hiding this key.
 *
 * If either value is missing we export `null` instead of throwing, so the app
 * keeps running without auth configured and the sign-in UI can show a calm
 * "being set up" state rather than a crash.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
