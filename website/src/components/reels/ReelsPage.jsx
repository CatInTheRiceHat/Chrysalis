import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion as MOTION } from 'motion/react';
import { ArrowLeft, ChevronDown, Compass, RotateCcw } from 'lucide-react';
import { ReelCard } from './ReelCard';
import { FeedCompassPanel } from './FeedCompassPanel';
import { ThemeToggle } from './ThemeToggle';
import { OnboardingStartScreen } from './OnboardingStartScreen';
import { LanguageSetupNotice } from './LanguageSetupNotice';
import { getSessionId, fetchPreferences, savePreferences } from './preferences';
import { MODES, reelsByMode, DEFAULT_MODE, LEGACY_INTENTION_MODES } from './reelsData';
import { getFeedDebugSnapshot } from './feedTaxonomy';
import { BreakScreen } from './BreakScreen';
import { useSessionTimer } from './useSessionTimer';
import { DEFAULT_TIME_SCALE_MS, DEMO_TIME_SCALE_MS } from './sessionBreaks';
import '../../reels.css';

const THEME_KEY = 'chrysalis-algorithm-theme';
const ONBOARDED_KEY = 'chrysalis-algorithm-onboarded';
const MODE_KEY = 'chrysalis-algorithm-mode';
const INTENTION_KEY = 'chrysalis-algorithm-intention';
const LANGUAGE_SETUP_KEY = 'chrysalis-algorithm-language-setup';
const LEGACY_THEME_KEY = 'chrysalis-reels-theme';
const LEGACY_ONBOARDED_KEY = 'chrysalis-reels-onboarded';
const LEGACY_MODE_KEY = 'chrysalis-reels-mode';
const LEGACY_INTENTION_KEY = 'chrysalis-reels-intention';

const API_URL = import.meta.env.VITE_API_URL ?? '';
const TARGET_CARD_COUNT = 12;

/**
 * Demo/test mode for screen-time breaks. Enabled in dev, or via `?breaks=demo`
 * (compresses one session minute into one real second, so a break arrives in ~60s
 * and a dev "Trigger break" control appears). Never on in a normal prod session.
 */
function detectBreakDemo() {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('breaks');
    if (param === 'demo') return true;
    if (param === 'off') return false;
  }
  return Boolean(import.meta.env.DEV);
}
const BREAK_DEMO = detectBreakDemo();
const HASHTAG_RE = /#[\w-]+/g;
const TRAILING_TITLE_SEPARATOR_RE = new RegExp(String.raw`[\s|/\\_:;,.=-]+$`);

function truncateAtWord(text, maxChars) {
  if (text.length <= maxChars) return text;
  const limit = Math.max(0, maxChars - 3);
  let shortened = text.slice(0, limit).trim();
  if (shortened.includes(' ')) shortened = shortened.replace(/\s+\S*$/, '').trim();
  return `${shortened.replace(/[.,;:|-]+$/, '').trim()}...`;
}

function compactText(value, maxChars) {
  const text = String(value || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateAtWord(text, maxChars);
}

function compactTitle(value) {
  const text = String(value || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(TRAILING_TITLE_SEPARATOR_RE, '')
    .trim();
  return compactText(text || value, 82);
}

function compactCaption(value) {
  const text = String(value || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(/\b(subscribe|follow for more|follow me|links? below|link in bio|like and comment)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateAtWord(text, 140);
}

function displayHashtags(item, rawTitle, rawDescription) {
  const raw = item.display_hashtags || item.displayHashtags;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean).slice(0, 3);

  const seen = new Set();
  const tags = [];
  for (const match of `${rawTitle || ''} ${rawDescription || ''}`.matchAll(HASHTAG_RE)) {
    const tag = match[0];
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 3) break;
  }
  return tags;
}

function isDemoPlaceholderVideoId(value) {
  return /^csl-/i.test(String(value || '').trim());
}

function isPlayableApiVideo(item, youtubeId) {
  const embedUrl = item.embed_url || item.embedUrl;
  return Boolean((youtubeId || embedUrl) && !isDemoPlaceholderVideoId(youtubeId));
}

/** Map a backend /api/feed item into the card shape ReelCard expects. */
function apiItemToCard(item) {
  const youtubeId = item.youtube_id || item.youtubeId;
  const playableVideo = isPlayableApiVideo(item, youtubeId);
  const rawTitle = item.title || '';
  const rawDescription = item.description || '';
  const rawSource = item.channel_title || item.channelTitle || item.raw_source || item.source || '';
  const displayDescription = item.display_description
    || item.displayDescription
    || item.short_description
    || item.shortDescription
    || compactCaption(rawDescription);
  const displayTitle = item.display_title || item.displayTitle || compactTitle(rawTitle);
  const displaySource = item.display_channel || item.displayChannel || compactText(rawSource, 30);

  return {
    id: youtubeId || item.embed_url || item.embedUrl,
    youtube_id: playableVideo ? youtubeId : null,
    raw_youtube_id: youtubeId,
    title: displayTitle,
    raw_title: rawTitle,
    source: displaySource,
    raw_source: rawSource,
    description: displayDescription,
    raw_description: rawDescription,
    short_description: item.short_description || item.shortDescription || displayDescription,
    display_description: item.display_description || item.displayDescription || displayDescription,
    display_hashtags: displayHashtags(item, rawTitle, rawDescription),
    thumbnail: item.thumbnail,
    embed_url: playableVideo ? item.embed_url || item.embedUrl : null,
    watch_url: playableVideo ? item.watch_url : null,
    is_playable_video: playableVideo,
    ranking_reason: item.ranking_reason || item.rankingReason,
    safety_reason: item.safety_reason || item.safetyReason,
    concern_reason: item.concern_reason || item.concernReason,
    public_signal: item.public_signal,
    source_safety_status: item.source_safety_status,
    public_signal_effect: item.public_signal_effect,
    public_signal_reason: item.public_signal_reason,
    chrysalis_scores: item.chrysalis_scores,
    mode_fit: item.mode_fit,
    source_type: item.source_type || item.sourceType || 'search',
    is_popular: Boolean(item.is_popular ?? item.isPopular),
    popularity_badge: item.popularity_badge || item.popularityBadge || null,
    content_category: item.content_category || item.contentCategory || null,
    wellness_score: item.wellness_score ?? item.wellnessScore ?? null,
    positivity_score: item.positivity_score ?? item.positivityScore ?? null,
    conflict_score: item.conflict_score ?? item.conflictScore ?? null,
    safety_risk: item.safety_risk ?? item.safetyRisk ?? null,
    perspective_topic: item.perspective_topic || item.perspectiveTopic || null,
    recommendation_lane: item.recommendation_lane || item.recommendationLane || null,
  };
}

function createFeedSeed() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mergeRealFirst(real, synthetic) {
  if (!real.length) return synthetic;
  const realIds = new Set(real.map((card) => card.id));
  const filler = synthetic.filter((card) => !realIds.has(card.id));
  return [...real, ...filler].slice(0, Math.max(real.length, Math.min(TARGET_CARD_COUNT, real.length + filler.length)));
}

/**
 * Combine real (labeled) videos with the built-in synthetic cards.
 * Every mode uses the same real video pool first; templates only fill when the
 * backend returns fewer than the target count.
 */
function mergeForMode(real, synthetic) {
  return mergeRealFirst(real, synthetic);
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

function isLiveVideoCard(card) {
  if (typeof card.is_playable_video === 'boolean') return card.is_playable_video;
  return Boolean(card.youtube_id || card.embed_url || card.embedUrl);
}

function isBreakReminder(mode, reel) {
  if (isLiveVideoCard(reel)) return false;
  return mode === 'metamorphosis' || ['Rest', 'Awareness', 'Pause'].includes(reel.label);
}

function feedStatus(cards) {
  const liveCount = cards.filter(isLiveVideoCard).length;
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
  if (!tunesThatReorder.length) return cards;

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
  const [contentPrefs, setContentPrefs] = useState(null);
  const [languageNoticeOpen, setLanguageNoticeOpen] = useState(false);
  // Feed for the active mode, tagged with the mode it belongs to so a stale
  // response never renders under the wrong guided mode.
  const [feed, setFeed] = useState({ mode: null, cards: null, debug: null });

  // Progressive screen-time breaks. The timer only accrues while the feed is open
  // and no break is showing; when a break is due the feed pauses behind the overlay.
  const breakScaleMs = BREAK_DEMO ? DEMO_TIME_SCALE_MS : DEFAULT_TIME_SCALE_MS;
  const {
    elapsedMin,
    dueTier,
    completeBreak,
    triggerBreakNow,
    reset: resetSessionTimer,
  } = useSessionTimer({ active: onboarded, scaleMs: breakScaleMs });
  const breakActive = onboarded && Boolean(dueTier);

  // Load saved language/region preferences once. Show the setup notice only
  // when setup is not yet complete (backend flag + local mirror to avoid flash).
  useEffect(() => {
    let cancelled = false;
    const locallyDone = typeof window !== 'undefined'
      && window.localStorage.getItem(LANGUAGE_SETUP_KEY) === '1';
    (async () => {
      const prefs = await fetchPreferences();
      if (cancelled) return;
      setContentPrefs(prefs);
      if (prefs.has_completed_language_setup) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LANGUAGE_SETUP_KEY, '1');
        }
      } else if (!locallyDone) {
        setLanguageNoticeOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch the labeled/ranked feed for the active mode; fall back to synthetic
  // cards on error or when the backend has no scored videos yet.
  useEffect(() => {
    if (!onboarded) return undefined;
    let cancelled = false;
    const synthetic = reelsByMode[mode] ?? reelsByMode[DEFAULT_MODE];

    async function loadFeed() {
      try {
        const seed = createFeedSeed();
        const params = new URLSearchParams({
          k: String(TARGET_CARD_COUNT),
          seed,
        });
        const sessionId = getSessionId();
        if (sessionId) params.set('session_id', sessionId);
        const response = await fetch(`${API_URL}/api/feed/${mode}?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;

        const real = (data.items ?? []).map(apiItemToCard);

        if (cancelled) return;
        setFeed({
          mode,
          cards: mergeForMode(real, synthetic),
          debug: getFeedDebugSnapshot(data),
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Chrysalis algorithm] Falling back to sample cards:', error);
        }
        if (!cancelled) setFeed({ mode, cards: synthetic, debug: null });
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

  const handleLanguageSetupSave = async (payload) => {
    const saved = await savePreferences(payload);
    setContentPrefs(saved);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_SETUP_KEY, '1');
    }
    setLanguageNoticeOpen(false);
  };

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
  const currentFeedDebug = feed.mode === mode ? feed.debug : null;

  const resetIntro = () => {
    setCompassOpen(false);
    setModeSelectionInitial(mode);
    setOnboarded(false);
    resetSessionTimer();
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

  const handleBreakComplete = (entry) => {
    completeBreak(entry);
    announceStatus('Welcome back — enjoy your refreshed feed.');
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
      feedDebug={currentFeedDebug}
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
          {onboarded && BREAK_DEMO && (
            <button
              type="button"
              className="reels-fab reels-fab--demo"
              onClick={triggerBreakNow}
              title="Demo: trigger a screen-time break now"
            >
              Trigger break
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
                      isActive={index === activeIndex && !breakActive}
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
                      feedDebug={currentFeedDebug}
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
        {breakActive && (
          <BreakScreen
            key="break"
            tier={dueTier}
            elapsedMin={elapsedMin}
            onComplete={handleBreakComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {languageNoticeOpen && (
          <LanguageSetupNotice
            key="language-setup"
            prefs={contentPrefs}
            onSave={handleLanguageSetupSave}
          />
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
