import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion as MOTION } from 'motion/react';
import { ArrowLeft, ChevronDown, Compass, RotateCcw } from 'lucide-react';
import { ReelCard } from './ReelCard';
import { FeedCompassPanel } from './FeedCompassPanel';
import { ThemeToggle } from './ThemeToggle';
import { OnboardingStartScreen } from './OnboardingStartScreen';
import { MODES, reelsByMode, DEFAULT_MODE, LEGACY_INTENTION_MODES } from './reelsData';
import '../../reels.css';

const THEME_KEY = 'chrysalis-algorithm-theme';
const ONBOARDED_KEY = 'chrysalis-algorithm-onboarded';
const MODE_KEY = 'chrysalis-algorithm-mode';
const INTENTION_KEY = 'chrysalis-algorithm-intention';
const LEGACY_THEME_KEY = 'chrysalis-reels-theme';
const LEGACY_ONBOARDED_KEY = 'chrysalis-reels-onboarded';
const LEGACY_MODE_KEY = 'chrysalis-reels-mode';
const LEGACY_INTENTION_KEY = 'chrysalis-reels-intention';

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
    chrysalis_scores: item.chrysalis_scores,
    mode_fit: item.mode_fit,
  };
}

function mergeMetamorphosis(real, synthetic) {
  if (!real.length) return synthetic;

  const strictReal = real.slice(0, 2);
  const merged = [];
  synthetic.forEach((card, index) => {
    merged.push(card);
    if (strictReal[index]) merged.push(strictReal[index]);
  });
  return [...merged, ...strictReal.slice(synthetic.length)];
}

/**
 * Combine real (labeled) videos with the built-in synthetic cards.
 * Metamorphosis stays pause-card-first and only interleaves videos that passed
 * the backend's strict Metamorphosis gate. It never borrows Flutter Feed items.
 */
function mergeForMode(mode, real, synthetic) {
  if (mode === 'metamorphosis') return mergeMetamorphosis(real, synthetic);
  return real.length ? real : synthetic;
}

function storedValue(key, legacyKey) {
  if (typeof window === 'undefined') return null;
  const current = window.localStorage.getItem(key);
  return current ?? window.localStorage.getItem(legacyKey);
}

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = storedValue(THEME_KEY, LEGACY_THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  const saved = storedValue(MODE_KEY, LEGACY_MODE_KEY);
  if (saved && reelsByMode[saved]) return saved;
  const legacyIntention = storedValue(INTENTION_KEY, LEGACY_INTENTION_KEY);
  const migratedMode = LEGACY_INTENTION_MODES[legacyIntention];
  return migratedMode && reelsByMode[migratedMode] ? migratedMode : DEFAULT_MODE;
}

function initialOnboarded() {
  if (typeof window === 'undefined') return false;
  return storedValue(ONBOARDED_KEY, LEGACY_ONBOARDED_KEY) === '1';
}

function cardSessionKey(mode, index, reel) {
  return `${mode}:${reel.id ?? reel.youtube_id ?? index}`;
}

function isBreakReminder(mode, reel) {
  if (reel.youtube_id) return false;
  return mode === 'metamorphosis' || ['Rest', 'Awareness', 'Pause'].includes(reel.label);
}

function feedStatus(cards) {
  const liveCount = cards.filter((card) => card.youtube_id).length;
  if (!liveCount) return 'fallback';
  return liveCount === cards.length ? 'live' : 'mixed';
}

function scoreValue(card, key) {
  const value = Number(card.chrysalis_scores?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function sourceKey(card) {
  return (card.source || card.channel_title || card.channel || 'unknown').toLowerCase();
}

function sessionTuneScore(card, selectedTunes) {
  let score = 0;
  if (selectedTunes.includes('calm')) score += scoreValue(card, 'calm') * 3;
  if (selectedTunes.includes('comparison')) score += (1 - scoreValue(card, 'comparison_risk')) * 3;
  if (selectedTunes.includes('uplifting')) {
    score += (scoreValue(card, 'prosocial') + scoreValue(card, 'self_love')) * 1.5;
  }
  return score;
}

function diversifyBySource(items) {
  const remaining = [...items];
  const output = [];
  let previousSource = null;

  while (remaining.length) {
    const nextIndex = remaining.findIndex((item) => sourceKey(item.card) !== previousSource);
    const [next] = remaining.splice(nextIndex === -1 ? 0 : nextIndex, 1);
    output.push(next);
    previousSource = sourceKey(next.card);
  }

  return output;
}

function applySessionTuning(cards, mode, selectedTunes) {
  const tunesThatReorder = selectedTunes.filter((key) => key !== 'shorter');
  if (!tunesThatReorder.length || mode === 'metamorphosis') return cards;

  let tuned = cards
    .map((card, index) => ({
      card,
      index,
      score: sessionTuneScore(card, selectedTunes),
    }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index));

  if (selectedTunes.includes('variety')) {
    tuned = diversifyBySource(tuned);
  }

  return tuned.map((item) => item.card);
}

export function ReelsPage() {
  const scrollRef = useRef(null);
  const [theme, setTheme] = useState(initialTheme);
  const [onboarded, setOnboarded] = useState(initialOnboarded);
  const [mode, setMode] = useState(initialMode);
  const [modeSelectionInitial, setModeSelectionInitial] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewedCards, setViewedCards] = useState(() => new Set());
  const [breakReminderCards, setBreakReminderCards] = useState(() => new Set());
  const [selectedTunes, setSelectedTunes] = useState([]);
  const [compassOpen, setCompassOpen] = useState(false);
  const [toast, setToast] = useState(null);
  // Feed for the active mode, tagged with the mode it belongs to so a stale
  // response never renders under the wrong guided mode.
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

        const real = (data.items ?? []).map(apiItemToCard);

        if (cancelled) return;
        setFeed({ mode, cards: mergeForMode(mode, real, synthetic) });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Chrysalis algorithm] Falling back to sample cards:', error);
        }
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

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!compassOpen) return undefined;
    const closeAfterNativePress = () => {
      window.setTimeout(() => setCompassOpen(false), 0);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setCompassOpen(false);
    };
    const onOutsidePress = (event) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest('.feed-compass-sheet')) return;
      if (event.target.closest('.feed-compass-sheet__panel')) return;
      closeAfterNativePress();
    };
    const onScrimPress = () => closeAfterNativePress();
    const scrim = document.querySelector('.feed-compass-sheet__scrim');
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onOutsidePress, true);
    document.addEventListener('mousedown', onOutsidePress, true);
    document.addEventListener('touchstart', onOutsidePress, true);
    document.addEventListener('click', onOutsidePress, true);
    scrim?.addEventListener('pointerdown', onScrimPress);
    scrim?.addEventListener('mousedown', onScrimPress);
    scrim?.addEventListener('touchstart', onScrimPress);
    scrim?.addEventListener('click', onScrimPress);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onOutsidePress, true);
      document.removeEventListener('mousedown', onOutsidePress, true);
      document.removeEventListener('touchstart', onOutsidePress, true);
      document.removeEventListener('click', onOutsidePress, true);
      scrim?.removeEventListener('pointerdown', onScrimPress);
      scrim?.removeEventListener('mousedown', onScrimPress);
      scrim?.removeEventListener('touchstart', onScrimPress);
      scrim?.removeEventListener('click', onScrimPress);
    };
  }, [compassOpen]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const startFeed = (chosenMode) => {
    const nextMode = reelsByMode[chosenMode] ? chosenMode : DEFAULT_MODE;
    setMode(nextMode);
    setModeSelectionInitial(nextMode);
    setActiveIndex(0);
    setCompassOpen(false);
    setOnboarded(true);
  };

  const cards = (feed.mode === mode && feed.cards)
    ? feed.cards
    : (reelsByMode[mode] ?? reelsByMode[DEFAULT_MODE]);
  const tunedCards = useMemo(
    () => applySessionTuning(cards, mode, selectedTunes),
    [cards, mode, selectedTunes],
  );
  const activeCard = tunedCards[Math.min(activeIndex, Math.max(tunedCards.length - 1, 0))]
    ?? tunedCards[0];
  const currentMode = MODES.find((item) => item.key === mode)
    || MODES.find((item) => item.key === DEFAULT_MODE);
  const currentFeedStatus = feedStatus(tunedCards);

  const resetIntro = () => {
    setCompassOpen(false);
    setModeSelectionInitial(mode);
    setOnboarded(false);
  };

  const markCardVisible = (index, reel) => {
    setActiveIndex(index);
    const key = cardSessionKey(mode, index, reel);
    setViewedCards((previous) => {
      if (previous.has(key)) return previous;
      const next = new Set(previous);
      next.add(key);
      return next;
    });
    if (isBreakReminder(mode, reel)) {
      setBreakReminderCards((previous) => {
        if (previous.has(key)) return previous;
        const next = new Set(previous);
        next.add(key);
        return next;
      });
    }
  };

  const toggleTune = (tuneKey) => {
    setSelectedTunes((previous) => (
      previous.includes(tuneKey)
        ? previous.filter((key) => key !== tuneKey)
        : [...previous, tuneKey]
    ));
  };

  const announceStatus = (message) => {
    setToast({ id: `${Date.now()}-${message}`, message });
  };

  const showNextCard = (index) => {
    if (tunedCards.length < 2) {
      announceStatus('Regenerating this session view.');
      return;
    }

    const nextIndex = (index + 1) % tunedCards.length;
    const scroller = scrollRef.current;
    setActiveIndex(nextIndex);
    scroller?.scrollTo({ top: nextIndex * scroller.clientHeight, behavior: 'smooth' });
    announceStatus('Showing a different card from this mode.');
  };

  const compassPanel = (
    <FeedCompassPanel
      activeMode={mode}
      activeCard={activeCard}
      feedStatus={currentFeedStatus}
      viewedCount={viewedCards.size}
      breakReminderCount={breakReminderCards.size}
      selectedTunes={selectedTunes}
      onResetIntro={resetIntro}
      onTuneChange={toggleTune}
    />
  );

  return (
    <main className="reels-shell" data-algorithm data-theme={theme}>
      <div className={`reels-controls${onboarded ? '' : ' reels-controls--simple'}`}>
        <Link to="/" className="reel-back" aria-label="Back to Chrysalis home">
          <ArrowLeft size={17} aria-hidden="true" />
          Home
        </Link>

        {onboarded ? (
          <div className="algorithm-mode-pill">
            <span className="algorithm-mode-pill__prefix">Current algorithm mode:</span>
            <span className="algorithm-mode-pill__logo" aria-hidden="true">
              <img src={currentMode?.logo ?? '/images/flutter-feed.png'} alt="" />
            </span>
            <span>{currentMode?.label ?? 'Flutter Feed'}</span>
          </div>
        ) : (
          <span className="reels-controls__spacer" aria-hidden="true" />
        )}

        <div className="reels-topbar">
          {onboarded && (
            <button
              type="button"
              className="reels-fab reels-fab--wide"
              onClick={resetIntro}
              aria-label="Change mode and return to mode selection"
              title="Change mode"
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span className="reels-fab__text">Change mode</span>
            </button>
          )}
          {onboarded && (
            <button
              type="button"
              className="reels-fab reels-compass-trigger"
              onClick={() => setCompassOpen(true)}
              aria-label="Open Algorithm Compass"
              aria-haspopup="dialog"
              aria-expanded={compassOpen}
              title="Algorithm Compass"
            >
              <Compass size={18} aria-hidden="true" />
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!onboarded ? (
          <OnboardingStartScreen
            key="onboard"
            initialMode={modeSelectionInitial}
            onStart={startFeed}
          />
        ) : (
          <MOTION.div
            key="feed"
            className="reels-feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="reels-stage">
              <aside className="feed-compass-desktop">
                {compassPanel}
              </aside>

              <div className="reels-feed-column">
                <div className="reels-scroll" data-lenis-prevent key={mode} ref={scrollRef}>
                  {tunedCards.map((reel, index) => (
                    <ReelCard
                      key={reel.id}
                      reel={reel}
                      onVisible={() => markCardVisible(index, reel)}
                      onStatus={announceStatus}
                      onRegenerate={() => showNextCard(index)}
                    />
                  ))}
                </div>

                <div className="reels-hint" aria-hidden="true">
                  <span>Scroll</span>
                  <ChevronDown className="reels-bob" size={16} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {compassOpen && (
                <MOTION.div
                  className="feed-compass-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Algorithm Compass"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="feed-compass-sheet__scrim" aria-hidden="true" />
                  <MOTION.div
                    className="feed-compass-sheet__panel"
                    initial={{ y: 28, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 28, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <FeedCompassPanel
                      activeMode={mode}
                      activeCard={activeCard}
                      feedStatus={currentFeedStatus}
                      viewedCount={viewedCards.size}
                      breakReminderCount={breakReminderCards.size}
                      selectedTunes={selectedTunes}
                      onResetIntro={resetIntro}
                      onTuneChange={toggleTune}
                      onClose={() => setCompassOpen(false)}
                    />
                  </MOTION.div>
                </MOTION.div>
              )}
            </AnimatePresence>
          </MOTION.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <MOTION.div
            key={toast.id}
            className="reels-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {toast.message}
          </MOTION.div>
        )}
      </AnimatePresence>
    </main>
  );
}
