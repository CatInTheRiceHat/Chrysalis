import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion as MOTION } from 'motion/react';
import { ArrowLeft, ChevronDown, Compass, RotateCcw } from 'lucide-react';
import { ReelCard } from './ReelCard';
import { FeedCompassPanel } from './FeedCompassPanel';
import { ThemeToggle } from './ThemeToggle';
import { ModeTabs } from './ModeTabs';
import { OnboardingStartScreen } from './OnboardingStartScreen';
import { MODES, reelsByMode, DEFAULT_MODE, INTENTIONS } from './reelsData';
import '../../reels.css';

const THEME_KEY = 'chrysalis-reels-theme';
const ONBOARDED_KEY = 'chrysalis-reels-onboarded';
const MODE_KEY = 'chrysalis-reels-mode';
const INTENTION_KEY = 'chrysalis-reels-intention';

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

function initialIntentionId(mode) {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(INTENTION_KEY);
    if (INTENTIONS.some((intention) => intention.id === saved)) return saved;
  }
  return INTENTIONS.find((intention) => intention.mode === mode)?.id ?? null;
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
  const [selectedIntentionId, setSelectedIntentionId] = useState(() => initialIntentionId(initialMode()));
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewedCards, setViewedCards] = useState(() => new Set());
  const [breakReminderCards, setBreakReminderCards] = useState(() => new Set());
  const [selectedTunes, setSelectedTunes] = useState([]);
  const [compassOpen, setCompassOpen] = useState(false);
  const [toast, setToast] = useState(null);
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

        const real = (data.items ?? []).map(apiItemToCard);

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

  useEffect(() => {
    if (selectedIntentionId) {
      window.localStorage.setItem(INTENTION_KEY, selectedIntentionId);
    } else {
      window.localStorage.removeItem(INTENTION_KEY);
    }
  }, [selectedIntentionId]);

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

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setActiveIndex(0);
    setCompassOpen(false);
  };

  const startFeed = (chosenMode, intentionId) => {
    setMode(reelsByMode[chosenMode] ? chosenMode : DEFAULT_MODE);
    setSelectedIntentionId(intentionId);
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
  const selectedIntention = INTENTIONS.find((intention) => intention.id === selectedIntentionId)
    || INTENTIONS.find((intention) => intention.mode === mode);
  const currentFeedStatus = feedStatus(tunedCards);

  const resetIntro = () => {
    setCompassOpen(false);
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
      selectedIntention={selectedIntention}
      feedStatus={currentFeedStatus}
      viewedCount={viewedCards.size}
      breakReminderCount={breakReminderCards.size}
      selectedTunes={selectedTunes}
      onResetIntro={resetIntro}
      onTuneChange={toggleTune}
    />
  );

  return (
    <main className="reels-shell" data-reels data-theme={theme}>
      <div className={`reels-controls${onboarded ? '' : ' reels-controls--simple'}`}>
        <Link to="/" className="reel-back" aria-label="Back to Chrysalis home">
          <ArrowLeft size={17} aria-hidden="true" />
          Home
        </Link>

        {onboarded ? (
          <ModeTabs modes={MODES} activeMode={mode} onChange={changeMode} />
        ) : (
          <span className="reels-controls__spacer" aria-hidden="true" />
        )}

        <div className="reels-topbar">
          {onboarded && (
            <button
              type="button"
              className="reels-fab reels-fab--wide"
              onClick={resetIntro}
              aria-label="Change your intention and retake onboarding"
              title="Change intention"
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span className="reels-fab__text">Change intention</span>
            </button>
          )}
          {onboarded && (
            <button
              type="button"
              className="reels-fab reels-compass-trigger"
              onClick={() => setCompassOpen(true)}
              aria-label="Open Feed Compass"
              aria-haspopup="dialog"
              aria-expanded={compassOpen}
              title="Feed Compass"
            >
              <Compass size={18} aria-hidden="true" />
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
                  aria-label="Feed Compass"
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
                      selectedIntention={selectedIntention}
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
