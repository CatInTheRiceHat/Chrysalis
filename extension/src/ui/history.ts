import { clockText, durationText } from '../session/model';
import type { CompletedSessionSummary, StorageSnapshot } from '../shared/types';
import { request } from '../shared/client';
import { CHANNEL } from '../shared/protocol';
import { mountReflection } from './reflection';

const target = (ms: number | null) => ms === null ? 'No time target' : durationText(ms);
export function summaryRows(s: CompletedSessionSummary): [string, string][] {
  return [['Date', new Date(s.startedAt).toLocaleString()], ['Intention', s.intention ?? 'No intention recorded'],
    ['Original time target', target(s.originalTargetMs)], ['Final time target', target(s.targetMs)],
    ['Foreground YouTube time', clockText(s.elapsedMs)],
    [s.history.complete ? 'Break time (wall-clock)' : 'Recorded break time since update', !s.history.complete && !s.history.breakMs ? 'Not recorded in the earlier version' : clockText(s.history.breakMs)]];
}
export function mountHistory(root: HTMLElement, update: (state: StorageSnapshot) => void) {
  root.innerHTML = `<h2 id="history-heading" tabindex="-1">Session history</h2><p class="note">Your latest 100 completed sessions, stored on this device. Older summaries are removed automatically. These records have no score.</p>
    <p id="history-empty">No completed sessions saved yet.</p><div id="history-list"></div><section id="history-reflection" aria-label="Optional reflection"></section><p id="history-status" role="status"></p>`;
  const list = root.querySelector<HTMLElement>('#history-list')!;
  const heading = root.querySelector<HTMLElement>('h2')!;
  const status = root.querySelector<HTMLElement>('#history-status')!;
  const editor = mountReflection(root.querySelector<HTMLElement>('#history-reflection')!, s => { update(s); heading.focus(); });
  let state: StorageSnapshot | null = null, lastRevision = -1, deleting: { id: string; revision: number } | null = null, busy = false;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Delete one session');
  dialog.innerHTML = `<h2>Delete this session?</h2><p>This removes its plan, reflection and note from this device. This cannot be undone.</p><div class="session-actions"><button data-cancel class="secondary">Keep session</button><button data-confirm class="primary">Delete session</button></div><p role="status"></p>`;
  root.append(dialog);
  dialog.querySelector('[data-cancel]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { deleting = null; heading.focus(); });
  dialog.querySelector('[data-confirm]')!.addEventListener('click', async () => {
    if (!deleting || busy) return;
    busy = true; dialog.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = true; });
    try {
      const result = await request({ channel: CHANNEL, type: 'HISTORY', sessionId: deleting.id, expectedRevision: deleting.revision, change: { action: 'delete' } });
      if (!result.ok) throw new Error(result.error);
      if (result.type === 'SNAPSHOT') update(result.snapshot);
      dialog.close(); status.textContent = 'Session deleted.';
    } catch (e) { dialog.querySelector('[role="status"]')!.textContent = e instanceof Error ? e.message : 'Deletion was not confirmed.'; }
    finally { busy = false; dialog.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = false; }); }
  });
  return { render(next: StorageSnapshot) {
    if (state && next.sequence < state.sequence) return;
    state = next; editor.render(next);
    if (deleting && !next.completedSessions.some(s => s.id === deleting!.id)) dialog.close();
    if (next.historyRevision === lastRevision) return;
    lastRevision = next.historyRevision;
    root.querySelector<HTMLElement>('#history-empty')!.hidden = next.completedSessions.length > 0;
    const focusedInList = list.contains(document.activeElement);
    list.replaceChildren();
    for (const s of next.completedSessions) {
      const article = document.createElement('article'); article.className = 'history-entry'; article.dataset.sessionId = s.id;
      const title = document.createElement('h3'); title.textContent = s.intention ?? 'Session'; article.append(title);
      const dl = document.createElement('dl');
      for (const [label, value] of summaryRows(s)) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; dl.append(dt, dd); }
      article.append(dl);
      const revisions = document.createElement('ul'); revisions.className = 'target-revisions';
      for (const r of s.history.targetRevisions) {
        const li = document.createElement('li'); li.textContent = `${new Date(r.at).toLocaleString()} · ${r.kind === 'extend' ? 'Added time' : r.kind === 'untimed' ? 'Chose no time target' : 'Edited target'}: ${target(r.fromMs)} → ${target(r.toMs)}`; revisions.append(li);
      }
      if (s.history.targetRevisions.length) article.append(revisions);
      if (!s.history.complete || s.history.omittedRevisions) { const p = document.createElement('p'); p.className = 'note'; p.textContent = [!s.history.complete ? 'Earlier target changes and break time were not recorded. Shown details begin with the update.' : '', s.history.omittedRevisions ? `${s.history.omittedRevisions} earlier target changes omitted; the latest 100 are retained.` : ''].filter(Boolean).join(' '); article.append(p); }
      const reflection = document.createElement('p'); reflection.className = 'saved-reflection';
      reflection.textContent = `Reflection: ${s.reflection?.answer === 'yes' ? 'Yes' : s.reflection?.answer === 'partly' ? 'Partly' : s.reflection?.answer === 'no' ? 'No' : 'Not answered'}`;
      article.append(reflection);
      if (s.reflection?.note) { const note = document.createElement('p'); note.className = 'reflection-note'; note.textContent = s.reflection.note; article.append(note); }
      const actions = document.createElement('div'); actions.className = 'session-actions';
      const reflect = document.createElement('button'); reflect.className = 'secondary'; reflect.textContent = s.reflection ? 'Edit reflection' : 'Add reflection';
      reflect.addEventListener('click', () => { if (state) editor.open(state, s.id); });
      const remove = document.createElement('button'); remove.className = 'secondary'; remove.textContent = 'Delete session';
      remove.addEventListener('click', () => { if (!state) return; deleting = { id: s.id, revision: state.historyRevision }; dialog.querySelector('[role="status"]')!.textContent = ''; dialog.showModal(); dialog.querySelector<HTMLButtonElement>('[data-cancel]')!.focus(); });
      actions.append(reflect, remove); article.append(actions); list.append(article);
    }
    if (focusedInList) heading.focus();
  } };
}
