import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion as MOTION } from 'motion/react';
import { ArrowLeft, ChevronDown, RotateCcw } from 'lucide-react';
import { ReelCard } from './ReelCard';
import { ThemeToggle } from './ThemeToggle';
import { ModeTabs } from './ModeTabs';
import { OnboardingStartScreen } from './OnboardingStartScreen';
import { MODES, reelsByMode, DEFAULT_MODE } from './reelsData';
import '../../reels.css';

const THEME_KEY = 'chrysalis-reels-theme';
const ONBOARDED_KEY = 'chrysalis-reels-onboarded';
const MODE_KEY = 'chrysalis-reels-mode';

const API_URL = import.meta.env.VITE_API_URL ?? '';

/** Map a backend /api/feed item into the card shape ReelCard expects. */
function apiItemToCard(item) {
  return {
    id: item.youtube_id,
    youtube_id: item.youtube_id,
    title: item.title,
    source: item.source,
    description: item.description,
    thumbnail: item.thumbnail,
    ranking_reason: item.ranking_reason,
    safety_reason: item.safety_reason,
    concern_reason: item.concern_reason,
  };
}

/**
 * Combine real (labeled) videos with the built-in synthetic cards.
 * Metamorphosis keeps its synthetic pause cards primary and only appends a few
 * strictly-gated real videos; the other modes prefer real videos when present.
 */
function mergeForMode(mode, real, synthetic) {
  if (mode === 'metamorphosis') return [...synthetic, ...real.slice(0, 2)];
  return real.length ? real : synthetic;
}

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const saved = window.localStorage.getItem(MODE_KEY);
  return saved && reelsByMode[saved] ? saved : DEFAULT_MODE;
}

function initialOnboarded() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ONBOARDED_KEY) === '1';
}

export function ReelsPage() {
  const [theme, setTheme] = useState(initialTheme);
  const [onboarded, setOnboarded] = useState(initialOnboarded);
  const [mode, setMode] = useState(initialMode);
  // Feed for the active mode, tagged with the mode it belongs to so a stale
  // response never renders under the wrong tab.
  const [feed, setFeed] = useState({ mode: null, cards: null });

  // Fetch the labeled/ranked feed for the active mode; fall back to synthetic
  // cards on error or when the backend has no scored videos yet.
  useEffect(() => {
    if (!onboarded) return undefined;
    let cancelled = false;
    const synthetic = reelsByMode[mode] ?? reelsByMode[DEFAULT_MODE];

    fetch(`${API_URL}/api/feed/${mode}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        const real = (data.items ?? []).map(apiItemToCard);
        setFeed({ mode, cards: mergeForMode(mode, real, synthetic) });
      })
      .catch(() => {
        if (!cancelled) setFeed({ mode, cards: synthetic });
      });

    return () => { cancelled = true; };
  }, [mode, onboarded]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(ONBOARDED_KEY, onboarded ? '1' : '0');
  }, [onboarded]);

  useEffect(() => {
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const startFeed = (chosenMode) => {
    setMode(reelsByMode[chosenMode] ? chosenMode : DEFAULT_MODE);
    setOnboarded(true);
  };

  const cards = (feed.mode === mode && feed.cards)
    ? feed.cards
    : (reelsByMode[mode] ?? reelsByMode[DEFAULT_MODE]);

  return (
    <main className="reels-shell" data-reels data-theme={theme}>
      <Link to="/" className="reel-back" aria-label="Back to Chrysalis home">
        <ArrowLeft size={17} aria-hidden="true" />
        Home
      </Link>

      <div className="reels-topbar">
        {onboarded && (
          <button
            type="button"
            className="reels-fab reels-fab--wide"
            onClick={() => setOnboarded(false)}
            aria-label="Change your intention and retake onboarding"
            title="Change intention"
          >
            <RotateCcw size={16} aria-hidden="true" />
            <span className="reels-fab__text">Change intention</span>
          </button>
        )}
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <AnimatePresence mode="wait">
        {!onboarded ? (
          <OnboardingStartScreen key="onboard" onStart={startFeed} />
        ) : (
          <MOTION.div
            key="feed"
            className="reels-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <ModeTabs modes={MODES} activeMode={mode} onChange={setMode} />

            <div className="reels-scroll" data-lenis-prevent key={mode}>
              {cards.map((reel) => (
                <ReelCard key={reel.id} reel={reel} />
              ))}
            </div>

            <div className="reels-hint" aria-hidden="true">
              <span>Scroll</span>
              <ChevronDown className="reels-bob" size={16} />
            </div>
          </MOTION.div>
        )}
      </AnimatePresence>
    </main>
  );
}
