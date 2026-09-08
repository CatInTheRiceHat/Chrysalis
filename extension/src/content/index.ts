import { CHANNEL, isSettingsChanged, supportedUrl } from '../shared/protocol';
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
  let promptTimer: ReturnType<typeof setTimeout> | undefined;
  let promptPending = false;
  async function prompt() {
    clearTimeout(promptTimer);
    if (!supportsSessionUI() || disposed || pageSuspended || extensionPaused || promptPending || document.hidden || !document.hasFocus()) return;
    promptPending = true;
    try {
      const reply = await request({ channel: CHANNEL, type: 'PROMPT' });
      if (!disposed && !pageSuspended && reply.ok && reply.type === 'PROMPT') dialog.open(reply.prompt);
    } catch { /* Next foreground pulse retries without blocking YouTube. */ }
    finally { promptPending = false; if (!disposed && !pageSuspended && !extensionPaused && !document.hidden) promptTimer = setTimeout(() => void prompt(), 15000); }
  }
  let previousPhase: string | undefined;
  let breakTimer: ReturnType<typeof setTimeout> | undefined;
  function apply(settings: Settings, session: SessionDisplay, sequence: number) {
    if (disposed || pageSuspended || sequence < revision) return;
    revision = sequence;
    const wasRunning = running;
    extensionPaused = settings.extensionPaused;
    if (extensionPaused) {
      running = false; clearTimeout(sampleTimer); clearTimeout(breakTimer);
      indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined; controls.dispose(); return;
    }
    running = session.phase === 'active' || session.phase === 'checkpoint';
    if (supportsSessionUI()) { indicator.render(settings, session); dialog.render(settings, session); }
    else { indicator.remove(); dialog.remove(); }
    if (previousPhase !== session.phase || !promptTimer) { previousPhase = session.phase; void prompt(); }
    clearTimeout(breakTimer); breakTimer = undefined;
    if (session.phase === 'break' && !document.hidden) breakTimer = setTimeout(() => void refresh(), 1000); // Deadline display/reconciliation only.
    controls.apply(settings);
    if (!running) { clearTimeout(sampleTimer); sampleTimer = undefined; }
    if (running && !wasRunning) void sample();
  }
  async function sample(visible = !document.hidden) {
    if (disposed || extensionPaused || (pageSuspended && visible) || samplePending) return;
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
      else { indicator.remove(); dialog.remove(); controls.dispose(); }
    }
  }
  function onMessage(value: unknown, sender: chrome.runtime.MessageSender) {
    if (!disposed && sender.id === chrome.runtime.id && !sender.tab &&
        (!sender.url || sender.url === chrome.runtime.getURL('background.js')) &&
        isSettingsChanged(value)) {
      apply(value.settings, value.session, value.sequence);
    }
  }
  function onPageShow() { pageSuspended = false; checkContext(); void refresh(); void sample(); }
  function onVisibility(event: Event) {
    if (!event.isTrusted) return;
    checkContext();
    if (document.hidden) clearTimeout(breakTimer);
    void sample(!document.hidden);
    if (!document.hidden) { void refresh(); void prompt(); }
  }
  function onPageHide(event: PageTransitionEvent) {
    pageSuspended = true; clearTimeout(contextTimer);
    clearTimeout(sampleTimer); clearTimeout(breakTimer);
    void sample(false);
    indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined;
    controls.dispose();
    if (!event.persisted) dispose();
  }
  function dispose() {
    disposed = true; clearTimeout(contextTimer);
    clearTimeout(sampleTimer); clearTimeout(breakTimer);
    indicator.remove(); dialog.remove(); clearTimeout(promptTimer); promptTimer = undefined;
    controls.dispose();
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* Extension context was invalidated. */ }
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('yt-navigate-finish', refresh);
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
  void refresh();
  void sample();
}
