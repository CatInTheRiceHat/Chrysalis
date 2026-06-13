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
    public_signal: item.public_signal,
    source_safety_status: item.source_safety_status,
    public_signal_effect: item.public_signal_effect,
    public_signal_reason: item.public_signal_reason,
  };
}

/**
 * Combine real (labeled) videos with the built-in synthetic cards.
 * Metamorphosis keeps its synthetic pause cards primary and only appends a few
 * strictly-gated real videos; the other modes prefer real videos when present.
 */
function mergeForMode(mode, real, synthetic) {
  if (mode === 'metamorphosis') return real.length ? [...real.slice(0, 2), ...synthetic] : synthetic;
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

    async function loadFeed() {
      try {
        const response = await fetch(`${API_URL}/api/feed/${mode}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        let real = (data.items ?? []).map(apiItemToCard);
        if (!real.length && mode === 'metamorphosis') {
          const fallback = await fetch(`${API_URL}/api/feed/flutter-feed?k=2`);
          if (fallback.ok) {
            const fallbackData = await fallback.json();
            real = (fallbackData.items ?? []).map(apiItemToCard);
          }
        }

        if (cancelled) return;
        setFeed({ mode, cards: mergeForMode(mode, real, synthetic) });
      } catch {
        if (!cancelled) setFeed({ mode, cards: synthetic });
      }
    }

    loadFeed();

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
      <div className={`reels-controls${onboarded ? '' : ' reels-controls--simple'}`}>
        <Link to="/" className="reel-back" aria-label="Back to Chrysalis home">
          <ArrowLeft size={17} aria-hidden="true" />
          Home
        </Link>

        {onboarded ? (
          <ModeTabs modes={MODES} activeMode={mode} onChange={setMode} />
        ) : (
          <span className="reels-controls__spacer" aria-hidden="true" />
        )}

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
