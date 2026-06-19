import { BRAND } from '../../brand.js';
import { Home, Film, Users, Bookmark, UserCircle, SlidersHorizontal, Trophy, Search, Inbox } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

/**
 * Desktop-only left navigation rail, in the spirit of a social-app home screen.
 *
 * Collapses to an icon-only rail on narrower desktops and expands with labels on
 * wide screens (driven entirely by CSS via the --app-sidebar-w token). On mobile
 * it is hidden — the top bar + bottom tab bar take over there.
 *
 * Primary nav (Home / Reflect / Saved / Profile) mirrors the bottom nav; the
 * secondary group exposes Feed details and Challenges. Nothing here leaks raw
 * algorithm internals.
 */
const PRIMARY = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'feed', label: 'Feed', Icon: Film },
  { key: 'community', label: 'Community', Icon: Users },
  { key: 'saved', label: 'Saved', Icon: Bookmark },
  { key: 'profile', label: 'Profile', Icon: UserCircle },
];

export function AppSidebar({
  active = 'home',
  intentionLabel,
  intentionLogo,
  onHome,
  onFeed,
  onCommunity,
  onSaved,
  onProfile,
  onOpenDetails,
  detailsOpen,
  onOpenChallenges,
  challengesOpen,
  onSearch,
  onInbox,
  streak = 0,
  theme,
  onToggleTheme,
  showBreakDemo = false,
  onTriggerBreak,
}) {
  const handlers = {
    home: onHome, feed: onFeed, community: onCommunity, saved: onSaved, profile: onProfile,
  };

  return (
    <>
    <aside className="app-sidebar" aria-label={`${BRAND} navigation`}>
      <div className="app-sidebar__brand">
        <span className="app-sidebar__logo" aria-hidden="true">☀️</span>
        <span className="app-sidebar__wordmark">{BRAND}</span>
      </div>

      <button
        type="button"
        className="app-sidebar__intention"
        onClick={onOpenDetails}
        aria-label={`Your intention: ${intentionLabel}. Open feed details.`}
        aria-haspopup="dialog"
        aria-expanded={detailsOpen}
        title="Your intention — open feed details"
      >
        <span className="app-sidebar__intention-logo" aria-hidden="true">
          {intentionLogo || '🌊'}
        </span>
        <span className="app-sidebar__intention-text">
          <span className="app-sidebar__intention-eyebrow">Your intention</span>
          <span className="app-sidebar__intention-label">{intentionLabel}</span>
        </span>
      </button>

      <nav className="app-sidebar__nav">
        {PRIMARY.map((item) => {
          const isActive = item.key === active;
          const ItemIcon = item.Icon;
          return (
            <button
              key={item.key}
              type="button"
              className={`app-sidebar__item${isActive ? ' is-active' : ''}`}
              onClick={() => handlers[item.key]?.()}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
            >
              <ItemIcon size={22} aria-hidden="true" />
              <span className="app-sidebar__label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="app-sidebar__spacer" aria-hidden="true" />

      <nav className="app-sidebar__nav app-sidebar__nav--secondary">
        {onSearch && (
          <button
            type="button"
            className={`app-sidebar__item${active === 'search' ? ' is-active' : ''}`}
            onClick={onSearch}
            aria-current={active === 'search' ? 'page' : undefined}
            title="Search"
          >
            <Search size={22} aria-hidden="true" />
            <span className="app-sidebar__label">Search</span>
          </button>
        )}
        {onInbox && (
          <button
            type="button"
            className={`app-sidebar__item${active === 'inbox' ? ' is-active' : ''}`}
            onClick={onInbox}
            aria-current={active === 'inbox' ? 'page' : undefined}
            title="Inbox"
          >
            <Inbox size={22} aria-hidden="true" />
            <span className="app-sidebar__label">Inbox</span>
          </button>
        )}
        <button
          type="button"
          className="app-sidebar__item"
          onClick={onOpenDetails}
          aria-haspopup="dialog"
          aria-expanded={detailsOpen}
          title="Feed details"
        >
          <SlidersHorizontal size={22} aria-hidden="true" />
          <span className="app-sidebar__label">Feed details</span>
        </button>
        <button
          type="button"
          className="app-sidebar__item"
          onClick={onOpenChallenges}
          aria-haspopup="dialog"
          aria-expanded={challengesOpen}
          title="IRL Challenges"
        >
          <span className="app-sidebar__item-icon">
            <Trophy size={22} aria-hidden="true" />
            {streak > 0 && (
              <span className="app-sidebar__badge" aria-label={`${streak} day streak`}>
                {streak}
              </span>
            )}
          </span>
          <span className="app-sidebar__label">Challenges</span>
        </button>
      </nav>

      {showBreakDemo && (
        <div className="app-sidebar__footer">
          <button
            type="button"
            className="app-sidebar__demo"
            onClick={onTriggerBreak}
            title="Demo: trigger a screen-time break now"
          >
            Trigger break
          </button>
        </div>
      )}
    </aside>

    {/* Theme toggle floats at the screen's bottom-right. Rendered as a sibling
        of the rail (not inside it) so `position: fixed` resolves to the viewport
        rather than the sidebar's backdrop-filter context. Hidden on mobile via
        CSS, where the top bar carries the theme toggle instead. */}
    <div className="app-sidebar__theme-dock">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
    </>
  );
}
