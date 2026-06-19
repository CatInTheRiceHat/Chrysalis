import { BRAND } from '../../brand.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as MOTION } from 'motion/react';
import { Inbox, Search } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { AppSidebar } from '../reels/AppSidebar';
import { AppBottomNav } from '../reels/AppBottomNav';
import { ThemeToggle } from '../reels/ThemeToggle';
import { MODES, DEFAULT_MODE } from '../reels/reelsData';
import '../../reels.css';
import '../../home.css';

/**
 * Shared chrome for the social "app" pages (Home, Search, Inbox).
 *
 * Reuses the feed's design system: the `[data-algorithm]` token scope, the desktop
 * AppSidebar, and the mobile AppBottomNav — so Home feels like one app with the
 * feed, not a bolted-on page. Theme + intention are read from the same localStorage
 * keys the feed uses, keeping them in sync.
 *
 * Navigation is router-based here (the feed uses in-page scroll handlers instead).
 * Search + Inbox are exposed in the desktop sidebar's secondary group and in the
 * mobile top bar — never crowded into the 5-item bottom nav.
 */
const THEME_KEY = 'chrysalis-algorithm-theme';
const MODE_KEY = 'chrysalis-algorithm-mode';

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function currentIntention() {
  const mode = (typeof window !== 'undefined' && window.localStorage.getItem(MODE_KEY)) || DEFAULT_MODE;
  return MODES.find((item) => item.key === mode) || MODES.find((item) => item.key === DEFAULT_MODE);
}

export function HomeShell({ active = 'home', children }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [theme, setTheme] = useState(initialTheme);
  const [toast, setToast] = useState(null);
  const toastSeq = useRef(0);
  const intention = currentIntention();

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const announce = (message) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message });
  };
  const comingSoon = (message) => () => announce(message);

  const nav = {
    onHome: () => navigate('/home'),
    onFeed: () => navigate('/algorithm'),
    onCommunity: comingSoon('Community is coming soon ✨'),
    onSaved: comingSoon('Saved is coming soon — your kept moments will live here.'),
    onProfile: () => navigate(user ? '/profile' : '/login'),
    onSearch: () => navigate('/search'),
    onInbox: () => navigate('/inbox'),
    onOpenDetails: () => navigate('/algorithm'),
    onOpenChallenges: () => navigate('/algorithm'),
  };

  // TEMP — data-color-preview="yellow" applies the Sunshine default on Home to
  // match the feed; remove that attribute to revert Home to Chrysalis purple.
  return (
    <main className="reels-shell home-shell" data-algorithm data-theme={theme} data-color-preview="yellow" data-onboarded="true">
      <AppSidebar
        active={active}
        intentionLabel={intention?.label ?? 'Flutter Feed'}
        intentionLogo={intention?.logo}
        onHome={nav.onHome}
        onFeed={nav.onFeed}
        onCommunity={nav.onCommunity}
        onSaved={nav.onSaved}
        onProfile={nav.onProfile}
        onOpenDetails={nav.onOpenDetails}
        onOpenChallenges={nav.onOpenChallenges}
        onSearch={nav.onSearch}
        onInbox={nav.onInbox}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Mobile-only top bar: brand + Search + Inbox (kept out of the bottom nav). */}
      <header className="home-topbar">
        <Link to="/home" className="home-topbar__brand" aria-label={`${BRAND} home`}>
          <span className="home-topbar__brandmark" aria-hidden="true">☀️</span>
          <span>{BRAND}</span>
        </Link>
        <div className="home-topbar__actions">
          <button type="button" className="home-iconbtn" onClick={nav.onSearch} aria-label="Search">
            <Search size={20} aria-hidden="true" />
          </button>
          <button type="button" className="home-iconbtn" onClick={nav.onInbox} aria-label="Inbox">
            <Inbox size={20} aria-hidden="true" />
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="home-main">
        {children}
      </div>

      <AppBottomNav
        active={active}
        onHome={nav.onHome}
        onFeed={nav.onFeed}
        onCommunity={nav.onCommunity}
        onSaved={nav.onSaved}
        onProfile={nav.onProfile}
      />

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
