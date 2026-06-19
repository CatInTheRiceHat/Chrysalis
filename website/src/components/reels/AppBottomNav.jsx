import { BRAND } from '../../brand.js';
import { Home, Film, Users, Bookmark, UserCircle } from 'lucide-react';

/**
 * App-style bottom navigation for the Chrysalis feed.
 *
 * A calm floating pill: Home, Feed, Community, Saved, Profile. Home/Feed land on
 * the live feed; Profile routes to the real profile (or sign-in); Community and
 * Saved route to their pages. Every tab is a real destination — no dead links.
 *
 * Props:
 *   active — key of the current screen ("home")
 *   onHome, onFeed, onCommunity, onSaved, onProfile — tap handlers
 */
const ITEMS = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'feed', label: 'Feed', Icon: Film },
  { key: 'community', label: 'Community', Icon: Users },
  { key: 'saved', label: 'Saved', Icon: Bookmark },
  { key: 'profile', label: 'Profile', Icon: UserCircle },
];

export function AppBottomNav({ active = 'home', onHome, onFeed, onCommunity, onSaved, onProfile }) {
  const handlers = {
    home: onHome,
    feed: onFeed,
    community: onCommunity,
    saved: onSaved,
    profile: onProfile,
  };

  return (
    <nav className="app-bottomnav" aria-label={`${BRAND} navigation`}>
      <ul className="app-bottomnav__list">
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          const ItemIcon = item.Icon;
          return (
            <li key={item.key}>
              <button
                type="button"
                className={`app-bottomnav__item${isActive ? ' is-active' : ''}`}
                onClick={() => handlers[item.key]?.()}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <ItemIcon size={20} aria-hidden="true" />
                <span className="app-bottomnav__label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
