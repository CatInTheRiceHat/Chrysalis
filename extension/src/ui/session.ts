import { request } from '../shared/client';
import { CHANNEL } from '../shared/protocol';
import { STORAGE_KEY } from '../shared/storage';
import { snapshot } from '../shared/validation';
import { sessionDisplay, type StorageSnapshot } from '../shared/types';
import { clockText, durationText, breakCountdown, INTENTIONS, targetFromMinutes, validatePlan, type SessionCommand } from '../session/model';

import { mountReflection } from './reflection';
import { checkpointMarkup, breakMarkup, mountChoices } from './choices';

export function mountSession(root: HTMLElement) {
  // Static, locally bundled markup. User text is assigned via value/textContent only.
  root.innerHTML = `
    <div class="session-heading"><h2 tabindex="-1">Your session</h2><span id="session-phase" role="status">Loading…</span></div>
    <div id="session-live" hidden>
      <p id="session-intention" tabindex="-1"></p><p class="elapsed"><span id="elapsed">0:00</span> <small>foreground YouTube time</small></p>
      <p id="session-target" class="note"></p><p id="recovery" class="notice" hidden></p>
      ${checkpointMarkup}<p id="checkpoint-quiet" class="note" hidden>Time target reached. No additional time was chosen. Your timer continues.</p>
      <p id="break-copy" class="notice" hidden></p>
      <div class="session-actions">
        <button data-action="pause">Pause session</button><button data-action="resume">Resume session</button>
        <button data-action="end-break">End break</button>
        <button data-action="finish">Finish session</button><button id="edit-plan">Edit intention / target</button>
      </div>
      <p class="note action-help">Pause stops session timing. Finish saves this session. Neither controls video playback.</p>
      ${breakMarkup}
    </div>
    <div id="session-summary" hidden><h3 tabindex="-1">Session finished</h3><p id="summary-intention"></p><dl id="summary-values"></dl>
      <p class="note">A record of your choices, without a score. Saved locally with your latest 100 sessions.</p><p id="finished-reflection"></p><section id="session-reflection" aria-label="Optional reflection"></section><button data-action="reset">Done</button></div>
    <form id="session-plan" hidden>
      <label for="intention">What brings you to YouTube?</label>
      <select id="intention"><option>Studying</option><option>Watching a specific video</option><option selected>Entertainment</option><option>Exploring</option><option value="custom">My own intention</option></select>
      <div id="custom-intention-field" hidden><label for="custom-intention">Your intention (up to 80 characters)</label><input id="custom-intention" type="text" maxlength="80" autocomplete="off"></div>
      <label for="time-target">Time target (optional)</label><select id="time-target"><option value="none">No time target</option><option value="5">5 minutes</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="custom">Custom duration</option><option value="current" hidden>Keep current target</option></select>
      <div id="custom-duration-field" hidden><label for="custom-minutes">Minutes (1–1440)</label><input id="custom-minutes" type="number" min="1" max="1440" step="1" value="20"></div>
      <p class="note">You can change your plan anytime. A new target offers a new checkpoint.</p>
      <button id="submit-plan" class="primary" type="submit">Start session</button><button id="cancel-edit" type="button" hidden>Cancel edit</button>
    </form>
    <p id="session-error" role="status" class="notice" hidden></p><button id="session-retry" hidden>Refresh session</button>
    <details class="timer-contract"><summary>What does the timer measure?</summary><p>Foreground YouTube time: browsing and playback on the active YouTube tab in the focused Chrome window. Excludes pauses, breaks and time away. This is not exact watch time, attention or productivity.</p></details>
  `;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const form = el<HTMLFormElement>('session-plan');
  let current: StorageSnapshot | null = null;
  let busy = false;
  let editing = false;
  let draftBase: { revision: number; id: string | null } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  let planInitialized = false;
  let editTarget: number | null = null;
  let openEditor = location.hash === '#edit';
  // Read recovery must not erase an invalid plan or an unconfirmed command.
  const errors: Partial<Record<'read' | 'action', string>> = {};
  let actionNeedsRefresh = false;
  function renderError() {
    const message = errors.action ?? errors.read;
    if (el('session-error').textContent !== (message ?? '')) el('session-error').textContent = message ?? '';
    el('session-error').hidden = !message;
    el('session-retry').hidden = !errors.read && !(errors.action && actionNeedsRefresh);
  }
  function showError(message: string, needsRefresh = false) { errors.action = message; actionNeedsRefresh = needsRefresh; renderError(); }
  function clearActionError() { delete errors.action; actionNeedsRefresh = false; renderError(); }
  const reflectionEditor = mountReflection(el('session-reflection'), state => { render(state); if (el('session-reflection').hidden) root.querySelector<HTMLElement>('[data-action="reset"]')?.focus(); });
  const choices = mountChoices(root, cmd => command(cmd, null), showError);
  function formVisibility() {
    el('custom-intention-field').hidden = el<HTMLSelectElement>('intention').value !== 'custom';
    el('custom-duration-field').hidden = el<HTMLSelectElement>('time-target').value !== 'custom';
  }
  const targetText = (ms: number | null) => ms === null ? 'No time target' : durationText(ms);
  function render(state: StorageSnapshot) {
    if (current && state.sequence < current.sequence) return;
    const previousPhase = current?.currentSession.phase;
    const dataReset = current && state.currentSession.phase === 'idle' && state.sessionRevision !== current.sessionRevision && state.revision !== current.revision;
    current = state;
    const s = state.currentSession;
    reflectionEditor.render(state);
    if (s.phase !== 'finished') reflectionEditor.close();
    if (dataReset || (previousPhase !== s.phase && ['idle','finished'].includes(s.phase))) {
      planInitialized = false; editing = false; draftBase = null; editTarget = null;
      el<HTMLSelectElement>('time-target').querySelector<HTMLOptionElement>('[value="current"]')!.hidden = true;
      el<HTMLSelectElement>('intention').value = 'Entertainment';
      el<HTMLInputElement>('custom-intention').value = '';
      el<HTMLInputElement>('custom-minutes').value = '20';
    }
    if (!planInitialized && !editing) {
      const value = state.settings.defaultTargetMs === null ? 'none' : String(state.settings.defaultTargetMs / 60000);
      el<HTMLSelectElement>('time-target').value = ['none','5','15','30','60'].includes(value) ? value : 'custom';
      if (value !== 'none') el<HTMLInputElement>('custom-minutes').value = value;
      planInitialized = true; formVisibility();
    }

    const hasSession = s.phase !== 'idle' && s.phase !== 'finished';
    const phaseText = s.phase === 'checkpoint' ? 'Checkpoint' : s.phase.charAt(0).toUpperCase() + s.phase.slice(1);
    if (el('session-phase').textContent !== phaseText) el('session-phase').textContent = phaseText;
    el('session-live').hidden = !hasSession || editing;
    el('session-summary').hidden = s.phase !== 'finished';
    form.hidden = hasSession && !editing;
    el('cancel-edit').hidden = !editing;
    el('submit-plan').textContent = editing ? 'Save plan' : s.phase === 'finished' ? 'Start another session' : 'Start session';
    if (s.phase !== 'idle') {
      el('session-intention').textContent = s.intention ?? 'No intention set';
      el('elapsed').textContent = clockText(s.elapsedMs);
      el('session-target').textContent = (s.targetMs === null ? '' : `${clockText(Math.ceil(Math.max(0, s.targetMs - s.elapsedMs) / 1000) * 1000)} remaining · `) + targetText(s.targetMs) + (s.targetMs === s.originalTargetMs ? '' : ` · Originally: ${targetText(s.originalTargetMs)}`);
      el('checkpoint-quiet').hidden = !(s.phase === 'active' && s.goalAcknowledged && s.targetMs !== null && s.elapsedMs >= s.targetMs);
      el('recovery').hidden = !s.recoveryReason;
      el('recovery').textContent = s.recoveryReason === 'browser-restart'
        ? 'Your session was restored paused. Time while Chrome was closed has not been counted. Resume when you are ready.'
        : 'Timing signals were interrupted. The uncertain gap was not counted. Your session is paused; resume when you are ready.';
      el('break-copy').hidden = s.phase !== 'break';
      el('break-copy').textContent = `On a break · ${breakCountdown(s.breakUntil ?? Date.now())} remaining. Wall-clock countdown. YouTube stays available. Your session stays paused when the break ends.`;
      if (s.phase === 'finished') {
        el('summary-intention').textContent = s.intention ?? 'No intention set';
        const summary = state.completedSessions.find(item => item.id === s.id);
        el('finished-reflection').textContent = summary?.reflection?.answer ? `Reflection: ${summary.reflection.answer === 'yes' ? 'Yes' : summary.reflection.answer === 'partly' ? 'Partly' : 'No'}` : 'Reflection: not answered';
        void reflectionEditor.offer(state);
        const values = el('summary-values'); values.replaceChildren();
        const targets = s.targetMs === s.originalTargetMs ? [['Time target', targetText(s.originalTargetMs)]] : [['Original target', targetText(s.originalTargetMs)], ['Final target', targetText(s.targetMs)]];
        for (const [name, value] of [...targets, ['Foreground YouTube time', clockText(s.elapsedMs)], ['Break time (wall-clock)', !s.history.complete && !s.history.breakMs ? 'Not recorded in the earlier version' : clockText(s.history.breakMs)]]) {
          const dt = document.createElement('dt'); dt.textContent = name!;
          const dd = document.createElement('dd'); dd.textContent = value!; values.append(dt, dd);
        }
      }
    }
    const allowed: Record<string, string[]> = { pause: ['active', 'checkpoint'], resume: ['paused', 'break'],
      'end-break': ['break'], finish: ['active', 'paused', 'checkpoint', 'break'], break: ['active', 'paused', 'checkpoint'], reset: ['finished'] };
    root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => { button.hidden = !allowed[button.dataset.action!]?.includes(s.phase); });
    choices.render(sessionDisplay(state), state.settings, busy);
    const resume = root.querySelector<HTMLElement>('[data-action="resume"]')!;
    resume.textContent = s.phase === 'break' ? 'Resume session now' : 'Resume session';
    root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select').forEach(control => { control.disabled = busy; });
    if (state.settings.extensionPaused) {
      root.querySelectorAll<HTMLButtonElement>('[data-action="resume"], [data-choice="break"], [data-choice="extend"], [data-choice="continue-untimed"]').forEach(control => { control.disabled = true; });
      if (!editing) el<HTMLButtonElement>('submit-plan').disabled = true;
    }
    if (openEditor && hasSession && !root.closest('[hidden]')) { openEditor = false; queueMicrotask(() => el('edit-plan').click()); }
    const focused = document.activeElement;
    if (!busy && focused instanceof HTMLElement && root.contains(focused) && focused.closest('[hidden]')) (s.phase === 'finished' ? root.querySelector<HTMLElement>('#session-summary h3') : root.querySelector<HTMLElement>('h2'))?.focus();
  }
  async function refresh() {
    try {
      const reply = await request({ channel: CHANNEL, type: 'GET_SNAPSHOT' });
      if (!reply.ok) throw new Error(reply.error);
      if (reply.type === 'SNAPSHOT' && alive) { render(reply.snapshot); delete errors.read; renderError(); }
    } catch (error) { if (alive) { errors.read = error instanceof Error ? error.message : 'Session unavailable. Try again.'; renderError(); } }
  }
  async function command(command: SessionCommand, base = draftBase) {
    if (!current || busy) return;
    busy = true; render(current);
    const session = current.currentSession;
    try {
      const reply = await request({ channel: CHANNEL, type: 'SESSION', mutation: {
        requestId: crypto.randomUUID(), expectedRevision: base?.revision ?? current.sessionRevision,
        expectedSessionId: base ? base.id : session.phase === 'idle' ? null : session.id, command,
      } });
      if (!reply.ok) { await refresh(); throw new Error(reply.error); }
      editing = false; draftBase = null;
      delete errors.read; clearActionError();
      if (reply.type === 'SNAPSHOT') render(reply.snapshot);
    } catch (error) { showError(error instanceof Error ? error.message : 'Session change was not confirmed. Refresh before retrying.', true); }
    finally {
      busy = false; if (current) render(current);
      const targets: Record<string, string> = { start: '#session-intention', edit: '#edit-plan', pause: '[data-action="resume"]', resume: '[data-action="pause"]', continue: '[data-action="pause"]', 'dismiss-checkpoint': '[data-action="pause"]', extend: '[data-action="pause"]', 'continue-untimed': '[data-action="pause"]', finish: '#session-summary h3', break: '[data-action="end-break"]', 'end-break': '[data-action="resume"]', reset: '#intention' };
      const target = root.querySelector<HTMLElement>(targets[command.action] ?? 'h2');
      if (target && !target.closest('[hidden]')) target.focus();
    }
  }
  el('edit-plan').addEventListener('click', () => {
    if (!current || current.currentSession.phase === 'idle') return;
    const s = current.currentSession;
    clearActionError(); editing = true; draftBase = { revision: current.sessionRevision, id: s.id };
    const preset = INTENTIONS.some(value => value === s.intention);
    el<HTMLSelectElement>('intention').value = preset ? s.intention! : 'custom';
    el<HTMLInputElement>('custom-intention').value = preset ? '' : s.intention ?? '';
    editTarget = s.targetMs;
    const minutes = s.targetMs === null ? 'none' : String(s.targetMs / 60_000);
    el<HTMLSelectElement>('time-target').value = ['none', '5', '15', '30', '60'].includes(minutes) ? minutes : 'custom';
    if (minutes !== 'none') el<HTMLInputElement>('custom-minutes').value = String(Math.ceil(Number(minutes)));
    const precise = s.targetMs !== null && s.targetMs % 60000 !== 0;
    const keep = el<HTMLSelectElement>('time-target').querySelector<HTMLOptionElement>('[value="current"]')!;
    keep.hidden = !precise; keep.textContent = `Keep current target (${targetText(s.targetMs)})`;
    if (precise) el<HTMLSelectElement>('time-target').value = 'current';
    formVisibility(); render(current); el('intention').focus();
  });
  el('cancel-edit').addEventListener('click', () => { clearActionError(); editing = false; draftBase = null; if (current) render(current); el('edit-plan').focus(); });
  el('intention').addEventListener('change', formVisibility);
  el('time-target').addEventListener('change', formVisibility);
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const choice = el<HTMLSelectElement>('intention').value;
      const duration = el<HTMLSelectElement>('time-target').value;
      const plan = validatePlan({ intention: choice === 'custom' ? el<HTMLInputElement>('custom-intention').value : choice,
        targetMs: duration === 'none' || duration === 'current' ? null : targetFromMinutes(duration === 'custom' ? el<HTMLInputElement>('custom-minutes').value : duration) });
      if (duration === 'current' && editing) plan.targetMs = editTarget;
      void command({ action: editing ? 'edit' : 'start', plan });
    } catch (error) { showError(error instanceof Error ? error.message : 'Check your plan.'); }
  });
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
    try {
      const action = button.dataset.action as SessionCommand['action'];
      void command(action === 'break' ? { action, durationMs: targetFromMinutes(el<HTMLInputElement>('break-minutes').value) }
        : { action } as SessionCommand, null);
    } catch (error) { showError(error instanceof Error ? error.message : 'Check the break duration.'); }
  }));
  el('session-retry').addEventListener('click', async () => {
    await refresh();
    if (actionNeedsRefresh && !errors.read) {
      editing = false; draftBase = null; clearActionError();
      if (current) render(current);
      (el('edit-plan').closest('[hidden]') ? root.querySelector<HTMLElement>('h2') : el('edit-plan'))?.focus();
    }
  });
  const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    const state: unknown = changes[STORAGE_KEY]?.newValue;
    if (area === 'local' && snapshot(state)) render(state);
  };
  chrome.storage.onChanged.addListener(onStorage);
  async function tick() {
    if (!alive) return;
    if (!document.hidden) await refresh();
    if (alive) timer = setTimeout(tick, 1000); // Display/reconciliation only; never credits time.
  }
  window.addEventListener('pagehide', () => { alive = false; clearTimeout(timer); chrome.storage.onChanged.removeListener(onStorage); }, { once: true });
  formVisibility(); void tick();
}
