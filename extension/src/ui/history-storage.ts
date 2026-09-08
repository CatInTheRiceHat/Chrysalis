import { request } from '../shared/client';
import { CHANNEL } from '../shared/protocol';
import type { HistoryAction, HistoryStatus } from '../shared/persistence';
import type { StorageSnapshot } from '../shared/types';
import { summaryRows } from './history';

export function mountHistoryStorage(root: HTMLElement, update: (state: StorageSnapshot) => void) {
  root.innerHTML = `<p class="eyebrow">Keep only what helps</p><h2>History between visits</h2>
    <p>Your timer and viewing controls never need a password. By default, session activity and history stay in this browser’s memory and disappear when Chrome restarts or Chrysalis is reloaded or disabled.</p>
    <p id="vault-mode" role="status"></p>
    <div id="legacy-choice" class="storage-notice" hidden><h3>Choose what happens to your earlier data</h3><p>The old unencrypted record is still on this device. Encrypting keeps completed history and archives an unfinished plan without resuming it. It replaces the old plaintext record and discards technical timing and command records. Deleting permanently removes that earlier data. Your current browser session and preferences stay available.</p><p id="legacy-invalid" hidden>The earlier record could not be read safely. It has not been changed. Encryption is unavailable; delete only if you no longer need it.</p></div>
    <form id="vault-form"><label for="history-password">History password</label><input id="history-password" type="password" autocomplete="off" maxlength="128" aria-describedby="password-help"><label id="confirm-password-label" for="history-password-confirm">Confirm password</label><input id="history-password-confirm" type="password" autocomplete="off" maxlength="128"><p id="password-help" class="note">Use 12–128 characters. There is no password recovery. Only encrypted history needs unlocking; new activity remains temporary while it is locked.</p><button id="vault-submit" class="primary" type="submit">Enable encrypted history</button></form>
    <div class="session-actions"><button id="vault-lock" class="secondary" hidden>Lock saved history</button><button id="vault-retry" class="secondary" hidden>Retry saving history</button><button id="legacy-delete" class="secondary" hidden>Delete earlier data…</button></div>
    <p id="vault-error" role="alert"></p><section id="archived-plan" hidden><h3>Earlier unfinished plan</h3><p class="note">Archived during migration; it is not a running session. Clear session history below also deletes this archive.</p><dl></dl></section>`;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const form = el<HTMLFormElement>('vault-form'), password = el<HTMLInputElement>('history-password'), confirm = el<HTMLInputElement>('history-password-confirm');
  let current: HistoryStatus | null = null, busy = false, alive = true, timer: ReturnType<typeof setTimeout>;
  const dialog = document.createElement('dialog'); dialog.setAttribute('aria-labelledby', 'migration-title');
  dialog.innerHTML = `<h2 id="migration-title"></h2><p id="migration-description"></p><div class="session-actions"><button data-cancel class="secondary">Keep earlier data</button><button data-confirm class="primary">Confirm</button></div>`;
  root.append(dialog);
  let choice: 'migrate-encrypt' | 'migrate-delete' | null = null;
  dialog.querySelector('[data-cancel]')!.addEventListener('click', () => { password.value = ''; confirm.value = ''; dialog.close(); });
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); else { password.value = ''; confirm.value = ''; } });
  dialog.addEventListener('close', () => { if (!dialog.open && !busy) el('vault-submit').focus(); });
  function render(status: HistoryStatus) {
    current = status;
    el('legacy-choice').hidden = !status.legacyPending;
    el('legacy-invalid').hidden = status.legacyReadable || !status.legacyPending;
    el('legacy-delete').hidden = !status.legacyPending;
    form.hidden = status.unlocked || (status.legacyPending && !status.legacyReadable);
    const setup = !status.enabled;
    confirm.hidden = !setup; el('confirm-password-label').hidden = !setup;
    password.minLength = setup ? 12 : 1; password.required = true; confirm.required = setup;
    el('vault-submit').textContent = status.legacyPending ? 'Encrypt earlier data…' : status.enabled ? 'Unlock saved history' : 'Enable encrypted history';
    el('vault-lock').hidden = !status.unlocked;
    el('vault-retry').hidden = !status.saveError;
    el('vault-mode').textContent = status.saveError ? 'Saved history has unsaved changes. Keep Chrome open and retry saving. The timer still works.' : status.legacyPending ? 'Earlier plaintext data needs your choice. New activity uses session memory only.' : status.unlocked ? 'Encrypted history is unlocked. Completed sessions and reflection changes are saved automatically, up to 100 records. Locking hides saved records and removes the key from memory; the current timer keeps working.' : status.enabled ? 'Saved history is locked. New completed sessions stay in memory until you unlock; then they are merged into saved history. A browser restart discards unsaved activity.' : 'Browser memory only. No session history is being saved to disk.';
    const archive = status.archivedSession;
    el('archived-plan').hidden = archive.phase === 'idle';
    const dl = root.querySelector('#archived-plan dl')!; dl.replaceChildren();
    if (archive.phase !== 'idle') {
      for (const [label, value] of summaryRows(archive)) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; dl.append(dt, dd); }
      for (const revision of archive.history.targetRevisions) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = 'Earlier target change'; dd.textContent = `${new Date(revision.at).toLocaleString()} · ${revision.fromMs === null ? 'No target' : revision.fromMs / 60000 + ' minutes'} → ${revision.toMs === null ? 'No target' : revision.toMs / 60000 + ' minutes'}`; dl.append(dt, dd); }
    }
    const note = document.querySelector<HTMLElement>('#history .history-storage-note');
    if (note) note.textContent = status.unlocked ? (status.saveError ? 'These records are in memory; the latest encrypted save failed. Retry above before closing Chrome.' : 'Up to 100 completed sessions, saved encrypted on this device while history is unlocked.') : 'Up to 100 completed sessions from this browser session only. These disappear on browser restart, extension reload or disable. Locked saved records are not shown.';
  }
  async function call(action: HistoryAction) {
    if (busy) return;
    busy = true; root.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = true); el('vault-error').textContent = '';
    const secret = password.value; password.value = ''; confirm.value = '';
    try {
      const result = await request({ channel: CHANNEL, type: 'HISTORY_VAULT', action, ...(['enable','unlock','migrate-encrypt'].includes(action) ? { password: secret } : {}) });
      if (!result.ok) throw new Error(result.error);
      if (result.type === 'VAULT') { update(result.snapshot); render(result.status); }
      dialog.close(); el('vault-mode').setAttribute('tabindex', '-1'); el('vault-mode').focus();
    } catch (error) { el('vault-error').textContent = error instanceof Error ? error.message : 'History operation was not confirmed.'; dialog.close(); }
    finally { busy = false; root.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = false); }
  }
  function confirmChoice(action: 'migrate-encrypt' | 'migrate-delete') {
    choice = action;
    root.querySelector('#migration-title')!.textContent = action === 'migrate-encrypt' ? 'Encrypt and replace earlier plaintext data?' : 'Permanently delete earlier data?';
    root.querySelector('#migration-description')!.textContent = action === 'migrate-encrypt' ? 'The latest 100 combined completed records and the unfinished plan archive will be encrypted with this password. If the combined history exceeds 100, the oldest extras are removed. The original plaintext record will be replaced. Older technical records are discarded. Keep your password: we cannot recover it.' : 'This deletes the earlier version’s history, reflections, unfinished plan and technical records. It cannot be undone. New activity in this browser and your current preferences are kept.';
    dialog.showModal(); dialog.querySelector<HTMLButtonElement>('[data-cancel]')!.focus();
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); if (!current || busy) return;
    if (!current.enabled && password.value !== confirm.value) { el('vault-error').textContent = 'The passwords do not match.'; confirm.focus(); return; }
    if (current.legacyPending) confirmChoice('migrate-encrypt'); else void call(current.enabled ? 'unlock' : 'enable');
  });
  dialog.querySelector('[data-confirm]')!.addEventListener('click', () => { if (choice) void call(choice); });
  el('legacy-delete').addEventListener('click', () => confirmChoice('migrate-delete'));
  el('vault-lock').addEventListener('click', () => void call('lock'));
  el('vault-retry').addEventListener('click', () => void call('retry'));
  async function refresh() {
    if (!alive) return;
    if (!busy && !document.hidden) {
      try { const result = await request({ channel: CHANNEL, type: 'HISTORY_VAULT', action: 'status' }); if (result.ok && result.type === 'VAULT' && !busy) { update(result.snapshot); render(result.status); } }
      catch { el('vault-error').textContent = 'History status unavailable. Reopen this page to retry.'; }
    }
    if (alive) timer = setTimeout(refresh, 1500);
  }
  window.addEventListener('pagehide', () => { alive = false; clearTimeout(timer); password.value = ''; confirm.value = ''; }, { once: true });
  void refresh();
}
