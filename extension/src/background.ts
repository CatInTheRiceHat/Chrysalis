import { CHANNEL, type SettingsChanged } from './shared/protocol';
import { createHandler } from './shared/handler';
import { createStore, STORAGE_KEY } from './shared/storage';
import { snapshot } from './shared/validation';
import { sessionDisplay } from './shared/types';
import type { Boundary } from './session/model';

// Access restriction runs on every worker start, before any storage operation.
// Fail closed if Chrome cannot apply it; a later request can retry.
const trustedStorage = () => chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const store = createStore({
  async read() { await trustedStorage(); return (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]; },
  async write(value) { await trustedStorage(); await chrome.storage.local.set({ [STORAGE_KEY]: value }); },
}, {
  now: Date.now,
  async epoch() {
    // Cleared by Chrome on browser restart/extension reload, retained on worker suspension.
    // Called only inside the store queue, so first-use creation cannot race itself.
    const key = 'chrysalis.browser-epoch';
    const value = (await chrome.storage.session.get(key))[key];
    if (typeof value === 'string') return value;
    const epoch = crypto.randomUUID();
    await chrome.storage.session.set({ [key]: epoch });
    return epoch;
  },
});
const handle = createHandler(store, chrome.runtime.id, chrome.runtime.getManifest().version, async sender => {
  if (sender.tab?.id === undefined) return false;
  try {
    const tab = await chrome.tabs.get(sender.tab.id);
    const window = await chrome.windows.getLastFocused();
    return tab.windowId === window.id && tab.active && !tab.discarded &&
      tab.status !== 'loading' && window.focused && window.state !== 'minimized';
  } catch { return false; }
}, async page => {
  if (page === 'history') { await chrome.tabs.create({ url: chrome.runtime.getURL('options.html#history') }); return; }
  if (page === 'settings') { await chrome.runtime.openOptionsPage(); return; }
  await chrome.windows.create({ type: 'popup', url: chrome.runtime.getURL(page === 'edit' ? 'popup.html#edit' : 'popup.html'), width: 440, height: 700, focused: true });
});

function onBoundary(event: Boundary) {
  const at = Date.now();
  void store.boundary(event, at).catch(() => console.error('Chrysalis could not save a timing boundary.'));
}
chrome.tabs.onActivated.addListener(info => onBoundary({ type: 'activate', ...info }));
chrome.windows.onFocusChanged.addListener(windowId => onBoundary({ type: 'focus', windowId }));
chrome.tabs.onRemoved.addListener(tabId => onBoundary({ type: 'leave', tabId }));
chrome.tabs.onDetached.addListener(tabId => onBoundary({ type: 'leave', tabId }));
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.discarded) onBoundary({ type: 'leave', tabId });
});

// Listeners are registered synchronously, not behind initialization promises.
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handle(message, sender).then(sendResponse);
  return true;
});
chrome.runtime.onInstalled.addListener(() => {
  void store.initialize().catch(() => console.error('Chrysalis could not initialize local settings; existing data was preserved.'));
});
chrome.runtime.onStartup.addListener(() => {
  void store.initialize().catch(() => console.error('Chrysalis could not read local settings; existing data was preserved.'));
});

chrome.storage.onChanged.addListener((changes, area) => {
  const value: unknown = changes[STORAGE_KEY]?.newValue;
  if (area !== 'local' || !snapshot(value)) return;
  const event: SettingsChanged = {
    channel: CHANNEL, type: 'SETTINGS_CHANGED', settings: value.settings, revision: value.revision,
    session: sessionDisplay(value), sequence: value.sequence,
  };
  // Tab IDs only, no URLs/titles/history and no "tabs" permission. Only this
  // extension's existing content scripts receive messages; other tabs ignore them.
  void chrome.tabs.query({}).then(tabs => Promise.all(tabs.map(tab =>
    tab.id === undefined ? undefined : chrome.tabs.sendMessage(tab.id, event).catch(() => undefined),
  ))).catch(() => undefined);
});
