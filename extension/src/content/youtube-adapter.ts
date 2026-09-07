import type { ViewingControls } from '../shared/types';

// This is the only module that knows YouTube's routes and DOM structure.
// Evidence and deliberately unsupported layouts: ../../VIEWING_CONTROLS.md.
export type YouTubePage = 'home' | 'watch' | 'other';
export const PAGE_ATTRIBUTE = 'data-chrysalis-view-page';
export const STYLE_ID = 'chrysalis-viewing-style';
export const STATUS_ID = 'chrysalis-viewing-status';
export function detectPage(url: string): YouTubePage {
  try {
    const u = new URL(url);
    if (u.origin !== 'https://www.youtube.com') return 'other';
    if (u.pathname === '/') return 'home';
    if (u.pathname === '/watch' && u.searchParams.get('v')) return 'watch';
  } catch { /* Unsupported URL: no recommendation rules. */ }
  return 'other';
}
const home = 'ytd-browse[page-subtype="home"]:not([hidden]) ytd-rich-grid-renderer > #contents';
const related = 'ytd-watch-flexy:not([hidden]) #related > ytd-watch-next-secondary-results-renderer > #items';
const watchContents = [related, `${related} > ytd-item-section-renderer > #contents`];
// Do not hide a card/shelf that also contains known protected content. Never hide
// the whole grid, sidebar, #secondary, #related, or arbitrary link ancestors.
const protectedContent = 'video, iframe, ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer, ytd-action-companion-ad-renderer, yt-ad-view-model, ytd-player, ytd-playlist-panel-renderer, a[href*="list="]';
const safe = `:not(:has(${protectedContent}))`;
const videoCard = `:is(ytd-compact-video-renderer, yt-lockup-view-model):has(a[href^="/watch?"])${safe}`;
const homeShelf = `${home} > ytd-rich-section-renderer:has(> #content > ytd-rich-shelf-renderer[is-shorts]):has(a[href^="/shorts/"])${safe}`;
const watchShelves = watchContents.map(root => `${root} > ytd-reel-shelf-renderer:has(a[href^="/shorts/"])${safe}`);
const nav = [
  'ytd-guide-renderer ytd-guide-entry-renderer',
  'ytd-mini-guide-renderer ytd-mini-guide-entry-renderer',
].map(root => `${root}:has(> a:is([href="/shorts"], [href^="/shorts/"], [id="endpoint"][title="Shorts"]:not([href])))${safe}`);
export const selectors = {
  homeRoot: home,
  watchRoot: related,
  homeCards: [`${home} > ytd-rich-item-renderer:has(> #content > :is(ytd-rich-grid-media, yt-lockup-view-model)):has(a[href^="/watch?"])${safe}`, homeShelf],
  watchCards: [...watchContents.map(root => `${root} > ${videoCard}`), ...watchShelves],
  homeShelves: [homeShelf],
  watchShelves,
  nav,
};
const rule = (page: YouTubePage | null, targets: string[]) => targets.map(target =>
  `html${page ? `[${PAGE_ATTRIBUTE}="${page}"]` : ''} ${target}`).join(',\n') + '\n{ display: none !important; }';
export function controlStyles(settings: ViewingControls): string {
  return [
    settings.hideHomeRecommendations ? rule('home', selectors.homeCards) : '',
    settings.hideWatchRecommendations ? rule('watch', selectors.watchCards) : '',
    settings.hideShortsEntries ? [rule(null, nav), rule('home', [homeShelf]), rule('watch', watchShelves)].join('\n') : '',
  ].filter(Boolean).join('\n');
}
export function controlStatus(doc: Document, page: YouTubePage, settings: ViewingControls): string[] {
  const found = (targets: string[]) => targets.some(selector => doc.querySelector(selector));
  const lines: string[] = [];
  const result = (targets: string[]) => found(targets)
    ? 'Recognized items hidden; other content may remain.'
    : 'No supported items found. Empty or unfamiliar layouts stay visible.';
  if (settings.hideHomeRecommendations) lines.push(`Home: ${page === 'home' ? result(selectors.homeCards) : 'Applies on the homepage only.'}`);
  if (settings.hideWatchRecommendations) lines.push(`Related videos: ${page === 'watch' ? result(selectors.watchCards) : 'Applies on watch pages only.'}`);
  if (settings.hideShortsEntries) lines.push(`Shorts entry points: ${result([...nav, ...(page === 'home' ? [homeShelf] : page === 'watch' ? watchShelves : [])])} Direct Shorts URLs still work.`);
  return lines;
}
// CSS handles insertion and attribute changes immediately. The observer only
// refreshes diagnostics/navigation: ignore player progress, comments and text.
const relevant = 'ytd-page-manager, ytd-browse, ytd-watch-flexy, ytd-rich-grid-renderer, ytd-rich-item-renderer, ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-item-section-renderer, ytd-reel-shelf-renderer, yt-lockup-view-model, ytd-compact-video-renderer, ytd-guide-renderer, ytd-mini-guide-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer';
export function affectsControls(records: MutationRecord[]): boolean {
  // Large batches get one scheduled probe; never walk inserted subtrees.
  let budget = 80;
  for (const record of records) {
    if (--budget < 0) return true;
    if (record.target instanceof Element && (record.target.matches(relevant) ||
        record.target.matches('html, body, ytd-app, #content') ||
        record.target.closest('ytd-rich-grid-renderer, ytd-watch-next-secondary-results-renderer, ytd-guide-renderer, ytd-mini-guide-renderer'))) return true;
    if (record.addedNodes.length + record.removedNodes.length > budget) return true;
    for (const nodes of [record.addedNodes, record.removedNodes]) for (const node of nodes) {
      budget--;
      if (node instanceof Element && (node.matches(relevant) || node.matches('ytd-app, #content, #contents, #items, #related'))) return true;
    }
  }
  return false;
}

// In-flow placement only: no viewport overlay, search/guide/player ancestor or
// player-sized spacer. Unknown real YouTube layouts fall back to the popup.
export function indicatorAnchor(doc: Document): Element | null {
  const page = detectPage(doc.location.href);
  if (page === 'watch') {
    const below = doc.querySelector('ytd-watch-flexy:not([hidden]) #below');
    if (below || doc.querySelector('ytd-app')) return below;
  }
  const root = page === 'home'
    ? doc.querySelector('ytd-browse[page-subtype="home"]:not([hidden]) ytd-rich-grid-renderer > #contents')
    : doc.querySelector('ytd-browse:not([hidden]), ytd-search:not([hidden])');
  if (root) return root;
  // Ordinary documents (including controlled fixtures) can safely reserve flow
  // space. Real YouTube's unrecognized app layouts remain untouched.
  return doc.querySelector('ytd-app') ? null : doc.body;
}

export function affectsPlacement(records: MutationRecord[]): boolean {
  let budget = 80;
  for (const record of records) {
    if (--budget < 0) return true;
    if (record.target instanceof Element && record.target.matches('body, ytd-app, ytd-page-manager, ytd-browse, ytd-watch-flexy, #below')) return true;
    if (record.addedNodes.length > budget) return true;
    for (const node of record.addedNodes) {
      budget--;
      if (node instanceof Element && (/^(YTD-|YT-)/.test(node.tagName) || node.matches('#below, #contents'))) return true;
    }
  }
  return false;
}
