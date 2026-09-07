import { viewingDefaults, type Settings, type Theme, type ViewingControls } from '../shared/types';
import { affectsControls, controlStatus, controlStyles, detectPage, PAGE_ATTRIBUTE, STATUS_ID, STYLE_ID } from './youtube-adapter';

export function createViewingControls(doc: Document, win: Window) {
  let settings: ViewingControls = { ...viewingDefaults };
  let signature = '';
  let theme: Theme = 'system';
  let style: HTMLStyleElement | null = null;
  let host: HTMLElement | null = null;
  let report: HTMLElement | null = null;
  let observer: MutationObserver | null = null;
  let pending: ReturnType<typeof setTimeout> | undefined;
  let enabled = false;
  let navigating = false;
  function updateStatus() {
    clearTimeout(pending);
    pending = undefined;
    if (!enabled || navigating) return;
    const page = detectPage(win.location.href);
    doc.documentElement.setAttribute(PAGE_ATTRIBUTE, page);
    const text = controlStatus(doc, page, settings).join('\n\n');
    if (report && report.textContent !== text) report.textContent = text;
  }
  function schedule() {
    if (enabled && !pending) pending = setTimeout(updateStatus, 500);
  }
  function startNavigation() {
    navigating = true;
    doc.documentElement.removeAttribute(PAGE_ATTRIBUTE);
    if (report) report.textContent = 'Page changing. Checking supported surfaces…';
  }
  function navigate() { navigating = false; updateStatus(); }
  function mount() {
    style = doc.createElement('style'); style.id = STYLE_ID;
    style.setAttribute('data-chrysalis-owned', '');
    doc.documentElement.append(style);
    host = doc.createElement('aside'); host.id = STATUS_ID;
    host.setAttribute('data-chrysalis-owned', '');
    host.dataset.theme = theme;
    host.setAttribute('aria-label', 'Chrysalis viewing controls status');
    const shadow = host.attachShadow({ mode: 'open' });
    const sheet = doc.createElement('style');
    sheet.textContent = `:host { all: initial; position: fixed; bottom: 72px; left: 18px; z-index: 2147483645;
      font: 12px/1.5 system-ui, sans-serif; --bg: #faf9f6; --ink: #2b2631; --line: #c9c2cf;
      color: var(--ink); color-scheme: light; }
      :host([data-theme="dark"]) { --bg: #221c30; --ink: #efeaf3; --line: #685975; color-scheme: dark; }
      @media (prefers-color-scheme: dark) { :host([data-theme="system"]) { --bg: #221c30; --ink: #efeaf3; --line: #685975; color-scheme: dark; } }
      details { background: var(--bg); border: 1px solid var(--line); border-radius: 12px; max-width: min(310px, calc(100vw - 40px)); }
      summary { cursor: pointer; padding: 12px; } summary:focus-visible { outline: 2px solid currentColor; }
      p { padding: 0 12px 12px; margin: 0; white-space: pre-line; }`;
    const details = doc.createElement('details');
    const summary = doc.createElement('summary'); summary.textContent = 'Chrysalis · viewing controls';
    report = doc.createElement('p');
    const hint = doc.createElement('p'); hint.textContent = 'To restore the ordinary layout, open Chrysalis and choose Restore ordinary layout.';
    details.append(summary, report, hint); shadow.append(sheet, details); doc.documentElement.append(host);
    observer = new MutationObserver(records => { if (affectsControls(records)) schedule(); });
    observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'page-subtype', 'href', 'title', 'is-shorts'] });
    doc.addEventListener('yt-navigate-start', startNavigation);
    doc.addEventListener('yt-navigate-finish', navigate);
    win.addEventListener('popstate', navigate);
  }
  function cleanup() {
    enabled = false; navigating = false;
    observer?.disconnect(); observer = null;
    clearTimeout(pending); pending = undefined;
    style?.remove(); host?.remove(); style = null; host = null; report = null;
    doc.documentElement.removeAttribute(PAGE_ATTRIBUTE);
    doc.removeEventListener('yt-navigate-start', startNavigation);
    doc.removeEventListener('yt-navigate-finish', navigate);
    win.removeEventListener('popstate', navigate);
    signature = '';
  }
  function apply(next: Settings) {
    theme = next.theme;
    if (host) host.dataset.theme = theme;
    const key = JSON.stringify([next.hideHomeRecommendations, next.hideWatchRecommendations, next.hideShortsEntries]);
    if (signature === key) return;
    settings = { hideHomeRecommendations: next.hideHomeRecommendations, hideWatchRecommendations: next.hideWatchRecommendations, hideShortsEntries: next.hideShortsEntries };
    const css = controlStyles(settings);
    if (!css) { cleanup(); signature = key; return; }
    enabled = true;
    if (!style) mount();
    signature = key;
    if (style) style.textContent = css;
    navigate();
  }
  return { apply, dispose: cleanup };
}
