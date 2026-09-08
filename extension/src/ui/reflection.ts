import { request } from '../shared/client';
import { CHANNEL } from '../shared/protocol';
import type { Reflection, StorageSnapshot } from '../shared/types';

export function mountReflection(root: HTMLElement, update: (state: StorageSnapshot) => void) {
  root.hidden = true;
  root.innerHTML = `<form class="reflection-form"><fieldset><legend>Did this session match what you wanted?</legend>
    <div class="reflection-answers"><label><input type="radio" name="reflection-answer" value="yes" required> Yes</label><label><input type="radio" name="reflection-answer" value="partly"> Partly</label><label><input type="radio" name="reflection-answer" value="no"> No</label></div>
    <label class="field-label">Optional note (up to 500 characters)<textarea rows="3" maxlength="500" autocomplete="off"></textarea></label>
    <p class="note">For your own record. Skipping leaves the reflection unanswered and discards this draft note.</p>
    <div class="session-actions"><button type="submit" class="primary">Save reflection</button><button type="button" class="secondary" data-skip>Skip</button><button type="button" class="secondary" data-clear hidden>Clear reflection</button></div>
    </fieldset><p class="reflection-error" role="status"></p></form>`;
  const form = root.querySelector<HTMLFormElement>('form')!;
  const note = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const error = root.querySelector<HTMLElement>('.reflection-error')!;
  let state: StorageSnapshot | null = null, id: string | null = null, revision = 0, busy = false, automatic = false;
  const attempted = new Set<string>();
  function close() { root.hidden = true; id = null; form.reset(); note.value = ''; error.textContent = ''; }
  function open(next: StorageSnapshot, sessionId: string, focus = true, fromOffer = false) {
    const s = next.completedSessions.find(s => s.id === sessionId);
    if (!s) return;
    state = next; id = sessionId; revision = next.historyRevision; automatic = fromOffer; form.reset(); error.textContent = '';
    root.querySelector('[data-skip]')!.textContent = fromOffer ? 'Skip' : 'Cancel';
    root.querySelector('.note')!.textContent = fromOffer
      ? 'For your own record. Skipping leaves the reflection unanswered and discards this draft note.'
      : 'Your saved reflection changes only when you save or clear it. Cancel discards this draft.';
    root.querySelector<HTMLElement>('[data-clear]')!.hidden = fromOffer || s.reflection === null;
    const answer = root.querySelector<HTMLInputElement>(`input[value="${s.reflection?.answer ?? ''}"]`);
    if (answer) answer.checked = true;
    note.value = s.reflection?.note ?? ''; root.hidden = false;
    if (focus) root.querySelector<HTMLInputElement>('input')!.focus();
  }
  function render(next: StorageSnapshot) {
    if (state && next.sequence < state.sequence) return;
    state = next;
    if (id && !next.completedSessions.some(s => s.id === id)) close();
  }
  async function save(value: Reflection | null) {
    if (!id || busy) return;
    busy = true; root.querySelector<HTMLFieldSetElement>('fieldset')!.disabled = true;
    try {
      const result = await request({ channel: CHANNEL, type: 'HISTORY', sessionId: id, expectedRevision: revision, change: { action: 'reflect', reflection: value } });
      if (!result.ok) throw new Error(result.error);
      if (result.type === 'SNAPSHOT') { close(); update(result.snapshot); }
    } catch (e) { if (id) error.textContent = e instanceof Error ? e.message : 'Reflection was not saved.'; }
    finally { busy = false; root.querySelector<HTMLFieldSetElement>('fieldset')!.disabled = false; }
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const answer = root.querySelector<HTMLInputElement>('input:checked')?.value as Reflection['answer'];
    if (answer) void save({ answer, note: note.value.trim() || null });
  });
  root.querySelector('[data-skip]')!.addEventListener('click', () => {
    if (automatic) void save(null);
    else { close(); if (state) update(state); }
  });
  root.querySelector('[data-clear]')!.addEventListener('click', () => void save(null));
  return { render, open, close,
    async offer(next: StorageSnapshot) {
      render(next);
      const s = next.currentSession;
      if (s.phase !== 'finished' || attempted.has(s.id) || next.completedSessions.find(item => item.id === s.id)?.reflectionPrompted !== false) return;
      attempted.add(s.id);
      try {
        const result = await request({ channel: CHANNEL, type: 'OFFER_REFLECTION', sessionId: s.id });
        if (result.ok && result.type === 'REFLECTION_OFFER') {
          update(result.snapshot);
          if (result.offered && state?.currentSession.phase === 'finished' && state.currentSession.id === s.id) open(state, s.id, false, true);
        }
      } catch { /* Optional offer never blocks Finish. History remains available. */ }
    },
  };
}
