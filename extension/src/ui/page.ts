import { request } from '../shared/client';
import { CHANNEL } from '../shared/protocol';
import { STORAGE_KEY } from '../shared/storage';
import { snapshot } from '../shared/validation';
import { viewingDefaults, type Settings, type StorageSnapshot } from '../shared/types';
import { targetFromMinutes } from '../session/model';
import { mountHistoryStorage } from './history-storage';
import { mountHistory } from './history';
import { mountSession } from './session';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
// An action popup has no tab. Its initial viewport participates in Chrome's
// auto-sizing: a 100vw maximum can trap it at the initial tiny viewport width.
// Ordinary extension tabs/windows keep the responsive maximum for narrow/zoom use.
if (document.body.classList.contains('popup')) {
  void chrome.tabs.getCurrent().then(tab => { if (!tab) document.documentElement.classList.add('action-popup'); });
}
const sessionRoot = $('session-root');
if (sessionRoot) mountSession(sessionRoot);
const history = $('history') ? mountHistory($('history')!, renderSnapshot) : null;
const intro = $('introduction')!;
intro.innerHTML = `<p class="eyebrow">Welcome to Chrysalis</p><h1>Your time, your choice.</h1>
<p class="intro">Make desktop YouTube fit what you came for. Entertainment and exploring count, too.</p>
<ul class="welcome-points"><li>Plan if it helps. Time targets are optional, and plans can change.</li><li>Choose which Home, related-video and Shorts entry points to hide. Everything starts visible.</li><li>Notice foreground YouTube time, then continue, pause or finish on your terms.</li></ul>
<p class="note">For <strong>www.youtube.com in desktop Chrome</strong>. Plans, reflections and settings stay local. No account or analytics. Your intention is visible on YouTube; avoid private details. You can hide the indicator. Page structure is accessed for controls; video browsing history is not stored.</p>
<button id="intro-start" class="primary">Get started</button><button id="intro-skip" class="text-button full-width">Skip introduction</button><p id="intro-status" class="status" role="status"></p><button id="intro-retry" class="text-button" hidden>Try again</button>`;
const checks = [
  ['showIndicator', 'show-indicator'], ['hideHomeRecommendations', 'hide-home'],
  ['hideWatchRecommendations', 'hide-related'], ['hideShortsEntries', 'hide-shorts'],
  ['autoSessionIntro', 'auto-session-intro'], ['indicatorCollapsed', 'indicator-collapsed'], ['checkpointsEnabled', 'checkpoints-enabled'],
] as const;
let revision = -1, busy = false;
let latest: Settings | null = null;
let lastSnapshot: StorageSnapshot | null = null;
let confirming: { scope: 'history' | 'all'; revision: number; sessionRevision: number; historyRevision: number; trigger: HTMLElement } | null = null;
function status(message: string, error = false) {
  for (const id of ['save-status', 'viewing-save-status', 'intro-status']) { const el = $(id); if (el) el.textContent = message; }
  for (const id of ['retry', 'viewing-retry', 'intro-retry']) { const el = $(id); if (el) el.hidden = !error; }
}
function enabled(value: boolean) {
  for (const [ , id] of checks) { const input = $<HTMLInputElement>(id); if (input) input.disabled = !value; }
  for (const id of ['extension-pause', 'theme', 'default-target', 'break-preference', 'save-break-preference', 'restore-layout', 'intro-start', 'intro-skip', 'save-default-target']) {
    const input = $<HTMLButtonElement>(id); if (input) input.disabled = !value;
  }
}
function render(settings: Settings, nextRevision: number) {
  if (nextRevision < revision) return;
  const previous = latest;
  latest = settings; revision = nextRevision;
  for (const [key, id] of checks) { const input = $<HTMLInputElement>(id); if (input) input.checked = settings[key]; }
  $<HTMLSelectElement>('theme')!.value = settings.theme;
  document.documentElement.dataset.theme = settings.theme;
  if ($('extension-pause')) $('extension-pause')!.textContent = settings.extensionPaused ? 'Enable Chrysalis' : 'Pause Chrysalis';
  if ($('extension-pause-description')) $('extension-pause-description')!.textContent = settings.extensionPaused
    ? 'Chrysalis is paused. YouTube has its ordinary layout and session time is stopped. Enable Chrysalis, then resume your session when ready.'
    : 'Pause timing and restore YouTube’s ordinary layout. A running break ends; your choices stay saved.';
  const sessionStarted = lastSnapshot && lastSnapshot.currentSession.phase !== 'idle';
  intro.hidden = settings.introSeen || Boolean(sessionStarted);
  $('experience')!.hidden = !intro.hidden;
  const target = $<HTMLSelectElement>('default-target');
  if (target && (!previous || previous.defaultTargetMs !== settings.defaultTargetMs)) {
    const value = settings.defaultTargetMs === null ? 'none' : String(settings.defaultTargetMs / 60000);
    target.value = ['none','5','15','30','60'].includes(value) ? value : 'custom';
    $('default-custom-field')!.hidden = target.value !== 'custom';
    $<HTMLInputElement>('default-custom')!.value = value === 'none' ? '20' : value;
  }
  const duration = $<HTMLInputElement>('break-preference');
  if (duration && (!previous || previous.breakMinutes !== settings.breakMinutes)) duration.value = String(settings.breakMinutes);
}
function renderSnapshot(state: StorageSnapshot) {
  if (lastSnapshot && state.sequence < lastSnapshot.sequence) return;
  lastSnapshot = state; render(state.settings, state.revision); history?.render(state);
  const count = $('history-count');
  if (count) count.textContent = state.completedSessions.length ? `${state.completedSessions.length} completed ${state.completedSessions.length === 1 ? 'session is' : 'sessions are'} available in this browser session.` : 'No completed sessions saved yet.';
}
async function load() {
  enabled(false);
  try {
    const reply = await request({ channel: CHANNEL, type: 'GET_SNAPSHOT' });
    if (!reply.ok) throw new Error(reply.error);
    if (reply.type !== 'SNAPSHOT') throw new Error('Settings unavailable. Try again.');
    renderSnapshot(reply.snapshot); status('Saved on this device.'); enabled(true);
    if (location.hash === '#viewing' && !document.querySelector(':focus')) {
      $('viewing-heading')?.setAttribute('tabindex', '-1'); $('viewing-heading')?.focus();
    }
  } catch (e) { status(e instanceof Error ? e.message : 'Unable to load settings.', true); intro.hidden = false; }
}
async function save(patch: Partial<Settings>): Promise<boolean> {
  if (busy || !latest) return false;
  busy = true; enabled(false); status('Saving…');
  try {
    const reply = await request({ channel: CHANNEL, type: 'UPDATE_SETTINGS', patch, expectedRevision: revision });
    if (!reply.ok) { if (reply.code === 'CONFLICT') await load(); throw new Error(reply.error); }
    if (reply.type !== 'SETTINGS') throw new Error('Change not confirmed. Try again.');
    render(reply.settings, reply.revision); status('Saved on this device.'); return true;
  } catch (e) { if (latest) render(latest, revision); status(e instanceof Error ? e.message : 'Could not save.', true); return false; }
  finally { busy = false; enabled(latest !== null); }
}
for (const [key, id] of checks) $<HTMLInputElement>(id)?.addEventListener('change', event => void save({ [key]: (event.target as HTMLInputElement).checked }));
$<HTMLSelectElement>('theme')?.addEventListener('change', e => void save({ theme: (e.target as HTMLSelectElement).value as Settings['theme'] }));
$('extension-pause')?.addEventListener('click', async () => { if (latest && await save({ extensionPaused: !latest.extensionPaused })) $('extension-pause')?.focus(); });
$('restore-layout')?.addEventListener('click', () => void save(viewingDefaults));
for (const id of ['retry', 'viewing-retry', 'intro-retry']) $(id)?.addEventListener('click', () => void load());
for (const id of ['intro-start', 'intro-skip']) $(id)?.addEventListener('click', async () => {
  if (await save({ introSeen: true })) {
    const intention = $('intention');
    (intention && !intention.closest('[hidden]') ? intention : $('session-intention') ?? document.querySelector<HTMLElement>('main h1'))?.focus();
  }
});
$('show-introduction')?.addEventListener('click', async () => { if (await save({ introSeen: false })) $('intro-start')?.focus(); });
async function open(page: 'settings' | 'viewing' | 'session' | 'history') {
  try { const reply = await request({ channel: CHANNEL, type: 'OPEN_PAGE', page }); if (!reply.ok) throw new Error(reply.error); }
  catch { status('Could not open Chrysalis. Try again.', true); }
}
$('open-settings')?.addEventListener('click', () => void open('settings'));
$('viewing-preferences')?.addEventListener('click', () => void open('viewing'));
$('open-history')?.addEventListener('click', () => void open('history'));
$('open-session')?.addEventListener('click', () => void open('session'));
$<HTMLSelectElement>('default-target')?.addEventListener('change', e => {
  const value = (e.target as HTMLSelectElement).value;
  $('default-custom-field')!.hidden = value !== 'custom';
  if (value === 'custom') $('default-custom')!.focus();
  else void save({ defaultTargetMs: value === 'none' ? null : targetFromMinutes(value) });
});
function durationPreference(id: string, key: 'defaultTargetMs' | 'breakMinutes') {
  try { const value = targetFromMinutes($<HTMLInputElement>(id)!.value); void save({ [key]: key === 'breakMinutes' ? value / 60000 : value }); }
  catch (e) { status(e instanceof Error ? e.message : 'Check the duration.', true); $(id)?.focus(); }
}
$('save-default-target')?.addEventListener('click', () => durationPreference('default-custom', 'defaultTargetMs'));
$('save-break-preference')?.addEventListener('click', () => durationPreference('break-preference', 'breakMinutes'));
const dialog = document.createElement('dialog'); dialog.setAttribute('aria-labelledby', 'delete-title'); dialog.setAttribute('aria-describedby', 'delete-description');
dialog.innerHTML = `<h2 id="delete-title"></h2><p id="delete-description"></p><p id="delete-error" role="status"></p><div class="session-actions"><button id="cancel-delete" class="secondary">Keep my data</button><button id="confirm-delete" class="primary">Delete</button></div>`;
document.body.append(dialog);
function cancelDelete() { dialog.close(); const trigger = confirming?.trigger; confirming = null; trigger?.focus(); }
$('cancel-delete')!.addEventListener('click', cancelDelete);
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
dialog.addEventListener('close', () => { if (confirming) { const trigger = confirming.trigger; confirming = null; trigger.focus(); } });
async function confirmData(scope: 'history' | 'all', trigger: HTMLElement) {
  await load(); if (!lastSnapshot) return;
  confirming = { scope, revision, sessionRevision: lastSnapshot.sessionRevision, historyRevision: lastSnapshot.historyRevision, trigger };
  $('delete-title')!.textContent = scope === 'all' ? 'Delete all Chrysalis data?' : 'Clear session history?';
  $('delete-description')!.textContent = scope === 'all' ? 'This deletes encrypted and temporary history, ends the current session and restores default settings. If earlier-version data is pending, resolve its separate choice first. YouTube data is unaffected. This cannot be undone.' : 'This deletes all encrypted and temporary completed history, the earlier unfinished-plan archive and recent command records. Saved history will be disabled. If earlier-version data is pending, resolve its separate choice first. An unfinished session and your preferences stay. This cannot be undone.';
  $('delete-error')!.textContent = ''; $('confirm-delete')!.textContent = scope === 'all' ? 'Delete all data' : 'Clear history';
  dialog.showModal(); $('cancel-delete')!.focus();
}
$('clear-history')?.addEventListener('click', e => void confirmData('history', e.currentTarget as HTMLElement));
$('delete-all')?.addEventListener('click', e => void confirmData('all', e.currentTarget as HTMLElement));
$('confirm-delete')!.addEventListener('click', async () => {
  if (!confirming || busy) return;
  const choice = confirming; busy = true;
  $<HTMLButtonElement>('confirm-delete')!.disabled = true; $<HTMLButtonElement>('cancel-delete')!.disabled = true;
  try {
    const reply = await request({ channel: CHANNEL, type: 'DELETE_DATA', scope: choice.scope, expectedRevision: choice.revision, expectedSessionRevision: choice.sessionRevision, expectedHistoryRevision: choice.historyRevision });
    if (!reply.ok) throw new Error(reply.error);
    if (reply.type === 'SNAPSHOT') renderSnapshot(reply.snapshot);
    confirming = null; dialog.close(); status(choice.scope === 'all' ? 'Chrysalis data deleted.' : 'Session history cleared.');
    (choice.scope === 'all' ? $('intro-start') : choice.trigger)?.focus();
  } catch (e) { $('delete-error')!.textContent = e instanceof Error ? e.message : 'Nothing was deleted. Try again.'; }
  finally { busy = false; $<HTMLButtonElement>('confirm-delete')!.disabled = false; $<HTMLButtonElement>('cancel-delete')!.disabled = false; }
});
chrome.storage.onChanged.addListener((changes, area) => { const value: unknown = changes[STORAGE_KEY]?.newValue; if (area === 'session' && snapshot(value)) renderSnapshot(value); });
void request({ channel: CHANNEL, type: 'PING' }).then(reply => { $('connection')!.textContent = reply.ok && reply.type === 'PONG' ? 'Extension connected' : 'Connection unavailable'; }).catch(() => { $('connection')!.textContent = 'Connection unavailable'; });
void load();

if ($('history-storage')) mountHistoryStorage($('history-storage')!, renderSnapshot);

if ($('history-storage-summary')) {
  let alive = true;
  let timer: ReturnType<typeof setTimeout>;
  const pollHistory = async () => {
    if (!alive) return;
    if (!document.hidden) try {
      const result = await request({ channel: CHANNEL, type: 'HISTORY_VAULT', action: 'status' });
      if (result.ok && result.type === 'VAULT') {
        const s = result.status;
        $('history-storage-summary')!.textContent = s.legacyPending ? 'Earlier unencrypted data needs your choice. Open Session history to encrypt or delete it. New activity stays in memory.' : s.saveError ? 'History changes have not been saved to disk. Keep Chrome open and retry in Session history.' : s.unlocked ? 'Completed history saves encrypted while unlocked. The current timer is temporary.' : s.enabled ? 'Saved history is locked. New activity is temporary until you unlock history.' : 'Session activity stays in browser memory by default; restarting Chrome clears it.';
      }
    } catch { /* Session controls report their own errors. */ }
    if (alive) timer = setTimeout(pollHistory, 1500);
  };
  window.addEventListener('pagehide', () => { alive = false; clearTimeout(timer); }, { once: true });
  void pollHistory();
}
