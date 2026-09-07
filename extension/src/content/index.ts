import { CHANNEL, isSettingsChanged, supportedUrl } from '../shared/protocol';
import { request } from '../shared/client';
import { createIndicator } from './indicator';
import { createViewingControls } from './viewing-controls';
import { OBSERVATION_MS } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';

declare global { interface Window { __chrysalisFoundation?: { dispose(): void } } }

if (window === window.top && supportedUrl(location.href)) {
  window.__chrysalisFoundation?.dispose();
  const indicator = createIndicator(document);
  const controls = createViewingControls(document, window);
  let disposed = false;
  let pageSuspended = false;
  let revision = -1;
  let running = false;
  let sampleTimer: ReturnType<typeof setTimeout> | undefined;
  let samplePending = false;
  function apply(settings: Settings, session: SessionDisplay, sequence: number) {
    if (disposed || pageSuspended || sequence < revision) return;
    revision = sequence;
    const wasRunning = running;
    running = session.phase === 'active' || session.phase === 'checkpoint';
    indicator.render(settings, session);
    controls.apply(settings);
    if (!running) { clearTimeout(sampleTimer); sampleTimer = undefined; }
    if (running && !wasRunning) void sample();
  }
  async function sample(visible = !document.hidden) {
    if (disposed || (pageSuspended && visible) || samplePending) return;
    clearTimeout(sampleTimer); sampleTimer = undefined;
    samplePending = true;
    try {
      const mono = performance.now();
      const result = await request({ channel: CHANNEL, type: 'OBSERVE', sample: {
        visible, mono, sentAt: Date.now(), seq: Math.floor(mono * 1000),
      } });
      if (result.ok && result.type === 'DISPLAY') apply(result.settings, result.session, result.sequence);
      else if (!result.ok) indicator.error('Chrysalis could not save time. Open the popup to retry.');
    } catch {
      if (!chrome.runtime.id) dispose();
      else indicator.error('Chrysalis is disconnected. Reload this page.');
    }
    finally {
      samplePending = false;
      if (!disposed && !pageSuspended && running && !document.hidden) sampleTimer = setTimeout(() => void sample(), OBSERVATION_MS);
    }
  }
  async function refresh() {
    try {
      const result = await request({ channel: CHANNEL, type: 'GET_DISPLAY' });
      if (result.ok && result.type === 'DISPLAY') apply(result.settings, result.session, result.sequence);
    } catch {
      // Invalidated contexts cannot recover. A transient messaging failure can
      // retry on the next existing lifecycle signal without leaving stale rules.
      if (!chrome.runtime.id) dispose();
      else { indicator.remove(); controls.dispose(); }
    }
  }
  function onMessage(value: unknown, sender: chrome.runtime.MessageSender) {
    if (!disposed && sender.id === chrome.runtime.id && !sender.tab &&
        (!sender.url || sender.url === chrome.runtime.getURL('background.js')) &&
        isSettingsChanged(value)) {
      apply(value.settings, value.session, value.sequence);
    }
  }
  function onPageShow() { pageSuspended = false; void refresh(); void sample(); }
  function onVisibility() {
    void sample(!document.hidden);
    if (!document.hidden) void refresh();
  }
  function onPageHide(event: PageTransitionEvent) {
    pageSuspended = true;
    clearTimeout(sampleTimer);
    void sample(false);
    indicator.remove();
    controls.dispose();
    if (!event.persisted) dispose();
  }
  function dispose() {
    disposed = true;
    clearTimeout(sampleTimer);
    indicator.remove();
    controls.dispose();
    chrome.runtime.onMessage.removeListener(onMessage);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('yt-navigate-finish', refresh);
  }
  window.__chrysalisFoundation = { dispose };
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  // This event can only refresh read-only display settings, never mutate state.
  document.addEventListener('yt-navigate-finish', refresh);
  void refresh();
  void sample();
}
