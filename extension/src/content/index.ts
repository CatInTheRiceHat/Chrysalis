import { CHANNEL, isSettingsChanged, isTabActivated, supportedUrl } from '../shared/protocol';
import { request } from '../shared/client';
import { createSessionDialog } from './session-dialog';
import type { SessionCommand } from '../session/model';
import { createIndicator } from './indicator';
import { createViewingControls } from './viewing-controls';
import { OBSERVATION_MS } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';

declare global { interface Window { __chrysalisFoundation?: { dispose(): void } } }

if (window === window.top && supportedUrl(location.href)) {
  window.__chrysalisFoundation?.dispose();
  const supportsSessionUI = () => !/^\/(?:embed|live_chat|live_chat_replay)(?:\/|$)/.test(location.pathname);
  const indicator = createIndicator(document, async (action, session, durationMs) => {
    if (action === 'edit' || action === 'session' || action === 'viewing') {
      const reply = await request({ channel: CHANNEL, type: 'OPEN_PAGE', page: action });
      if (!reply.ok) throw new Error(reply.error);
    } else {
      const reply = await request({ channel: CHANNEL, type: 'SESSION_CONTROL', mutation: {
        requestId: crypto.randomUUID(), expectedRevision: session.revision, expectedSessionId: session.id, command: action === 'extend' || action === 'break' ? { action, durationMs: durationMs! } : { action },
      } });
      if (!reply.ok) { void refresh(); throw new Error(reply.error); }
      if (reply.type === 'DISPLAY') apply(reply.settings, reply.session, reply.sequence);
    }
  });
  async function command(command: SessionCommand, session: SessionDisplay) {
    const reply = await request({ channel: CHANNEL, type: 'SESSION_CONTROL', mutation: {
      requestId: crypto.randomUUID(), expectedRevision: session.revision, expectedSessionId: session.id, command,
    } });
    if (!reply.ok) { await refresh(); throw new Error(reply.error); }
    if (reply.type === 'DISPLAY') apply(reply.settings, reply.session, reply.sequence);
  }
  const dialog = createSessionDialog(document, command);
  const controls = createViewingControls(document, window);
  let disposed = false;
  let pageSuspended = false;
  let revision = -1;
  let running = false;
  let extensionPaused = false;
  let contextTimer: ReturnType<typeof setTimeout> | undefined;
  let sampleTimer: ReturnType<typeof setTimeout> | undefined;
  let samplePending = false;
  let pendingVisibility: boolean | undefined;
  let promptTimer: ReturnType<typeof setTimeout> | undefined;
  let promptPending = false;
  let displayReady = false;
  let latest: { settings: Settings; session: SessionDisplay; sequence: number } | undefined;
  let refreshPending = false;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshAttempts = 0;
  let promptAttempts = 0;
  let offeredPrompt: 'intro' | 'checkpoint' | null = null;
  // Start the worker handshake immediately. Only DOM mounting waits for a body,
  // which may arrive well before DOMContentLoaded or YouTube's application shell.
  const mountObserver = new MutationObserver(mountWhenReady);
  function mountWhenReady() {
    if (!document.body || disposed || pageSuspended) return;
    mountObserver.disconnect();
    if (latest) apply(latest.settings, latest.session, latest.sequence);
  }
  async function prompt() {
    clearTimeout(promptTimer);
    // A focus event can arrive before the first display reply. Do not consume
    // the once-per-visit claim until the dialog has state with which to render it.
    if (!displayReady || !supportsSessionUI() || disposed || pageSuspended || extensionPaused || promptPending || document.hidden || !document.hasFocus()) return;
    promptPending = true;
    try {
      const reply = await request({ channel: CHANNEL, type: 'PROMPT' });
      if (!disposed && !pageSuspended && reply.ok && reply.type === 'PROMPT') {
        offeredPrompt = reply.prompt ?? offeredPrompt;
        // A focus change during the worker round trip must not lose the offer.
        // Keep it in this document until it can be displayed in the foreground.
        if (dialog.open(offeredPrompt)) offeredPrompt = null;
      }
    } catch { /* Next foreground pulse retries without blocking YouTube. */ }
    finally {
      promptPending = false;
      if (!disposed && !pageSuspended && !extensionPaused && !document.hidden) {
        const delay = [100, 250, 500, 1000][promptAttempts++] ?? 15000;
        promptTimer = setTimeout(() => void prompt(), delay);
      }
    }
  }
  let previousPhase: string | undefined;
  let breakTimer: ReturnType<typeof setTimeout> | undefined;
  function apply(settings: Settings, session: SessionDisplay, sequence: number) {
    if (disposed || pageSuspended || sequence < revision) return;
    revision = sequence;
    latest = { settings, session, sequence };
    if (offeredPrompt === 'intro' && (!settings.autoSessionIntro || !['idle', 'finished'].includes(session.phase))) offeredPrompt = null;
    if (offeredPrompt === 'checkpoint' && session.phase !== 'checkpoint') offeredPrompt = null;
    const wasRunning = running;
    extensionPaused = settings.extensionPaused;
    if (extensionPaused) {
      running = false; clearTimeout(sampleTimer); clearTimeout(breakTimer);
      displayReady = false; offeredPrompt = null;
      indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined; controls.dispose(); return;
    }
    if (!document.body) return;
    running = session.phase === 'active' || session.phase === 'checkpoint';
    if (supportsSessionUI()) { indicator.render(settings, session); dialog.render(settings, session); displayReady = true; }
    else { indicator.remove(); dialog.remove(); }
    if (previousPhase !== session.phase || !promptTimer) { previousPhase = session.phase; void prompt(); }
    clearTimeout(breakTimer); breakTimer = undefined;
    if (session.phase === 'break' && !document.hidden) breakTimer = setTimeout(() => void refresh(), 1000); // Deadline display/reconciliation only.
    controls.apply(settings);
    if (!running) { clearTimeout(sampleTimer); sampleTimer = undefined; }
    if (running && !wasRunning) void sample();
  }
  async function sample(visible = !document.hidden) {
    if (disposed || extensionPaused || (pageSuspended && visible)) return;
    // Visibility/focus can change while a worker reply is in flight. Retain the
    // newest signal and send it immediately afterward instead of dropping it and
    // waiting another observation interval when the user returns to this tab.
    if (samplePending) { pendingVisibility = visible; return; }
    clearTimeout(sampleTimer); sampleTimer = undefined;
    samplePending = true;
    try {
      const mono = performance.now();
      const result = await request({ channel: CHANNEL, type: 'OBSERVE', sample: {
        visible, mono, sentAt: Date.now(), seq: Math.floor(mono * 1000),
      } });
      if (result.ok && result.type === 'DISPLAY') apply(result.settings, result.session, result.sequence);
      else if (!result.ok) indicator.error('Chrysalis could not save time. Retrying automatically.');
    } catch {
      if (!chrome.runtime.id) dispose();
      else indicator.error('Chrysalis is disconnected. Reload this page.');
    }
    finally {
      samplePending = false;
      const queued = pendingVisibility; pendingVisibility = undefined;
      if (queued !== undefined && !disposed && !pageSuspended) void sample(queued);
      else if (!disposed && !pageSuspended && running && !document.hidden) sampleTimer = setTimeout(() => void sample(), OBSERVATION_MS);
    }
  }
  async function refresh() {
    if (disposed || pageSuspended || refreshPending) return;
    clearTimeout(refreshTimer); refreshTimer = undefined;
    refreshPending = true;
    try {
      const result = await request({ channel: CHANNEL, type: 'GET_DISPLAY' });
      if (!result.ok || result.type !== 'DISPLAY') throw new Error('Display unavailable');
      apply(result.settings, result.session, result.sequence);
      refreshAttempts = 0;
    } catch {
      // Invalidated contexts cannot recover. Transient startup/storage failures
      // retry automatically without requiring the popup or a page-load event.
      if (!chrome.runtime.id) dispose();
      else {
        displayReady = false;
        indicator.remove(); dialog.remove(); controls.dispose();
        if (!disposed && !pageSuspended) refreshTimer = setTimeout(() => void refresh(), [100, 250, 500, 1000, 2000][refreshAttempts++] ?? 5000);
      }
    }
    finally { refreshPending = false; }
  }
  function onMessage(value: unknown, sender: chrome.runtime.MessageSender) {
    if (!disposed && sender.id === chrome.runtime.id && !sender.tab &&
        (!sender.url || sender.url === chrome.runtime.getURL('background.js'))) {
      if (isSettingsChanged(value)) apply(value.settings, value.session, value.sequence);
      else if (isTabActivated(value) && !pageSuspended) { void refresh(); void sample(); void prompt(); }
    }
  }
  function onPageShow() { pageSuspended = false; mountWhenReady(); checkContext(); void refresh(); void sample(); }
  function onVisibility(event: Event) {
    if (!event.isTrusted) return;
    checkContext();
    if (document.hidden) { clearTimeout(breakTimer); clearTimeout(sampleTimer); }
    void sample(!document.hidden);
    if (!document.hidden) { void refresh(); void prompt(); }
  }
  function onPageHide(event: PageTransitionEvent) {
    pageSuspended = true; clearTimeout(contextTimer);
    clearTimeout(refreshTimer);
    clearTimeout(sampleTimer); clearTimeout(breakTimer);
    void sample(false);
    indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined;
    controls.dispose();
    if (!event.persisted) dispose();
  }
  function dispose() {
    disposed = true; clearTimeout(contextTimer);
    mountObserver.disconnect(); clearTimeout(refreshTimer);
    clearTimeout(sampleTimer); clearTimeout(breakTimer);
    indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined;
    controls.dispose();
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* Extension context was invalidated. */ }
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('yt-navigate-finish', refresh);
    window.removeEventListener('popstate', refresh);
  }
  // No worker messages or writes: invalidated old contexts remove their own UI
  // after reload/disable, including idle sessions with no observation pulses.
  function checkContext() {
    clearTimeout(contextTimer);
    if (disposed || pageSuspended) return;
    try { if (!chrome.runtime.id) { dispose(); return; } }
    catch { dispose(); return; }
    if (!document.hidden) contextTimer = setTimeout(checkContext, 5000);
  }
  function onFocus(event: FocusEvent) { if (!event.isTrusted) return; void refresh(); void sample(); void prompt(); }
  window.addEventListener('focus', onFocus);
  checkContext();
  window.__chrysalisFoundation = { dispose };
  chrome.runtime.onMessage.addListener(onMessage);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  // This event can only refresh read-only display settings, never mutate state.
  document.addEventListener('yt-navigate-finish', refresh);
  window.addEventListener('popstate', refresh);
  if (!document.body) mountObserver.observe(document, { childList: true, subtree: true });
  void refresh();
}
