import { targetFromMinutes, type SessionCommand } from '../session/model';
import type { PromptKind } from '../session/prompts';
import type { SessionDisplay, Settings } from '../shared/types';
import { checkpointMarkup, breakMarkup, mountChoices } from '../ui/choices';
import { surfaceStyle, setSurfaceTheme } from './surface';

export function createSessionDialog(doc: Document, act: (command: SessionCommand, session: SessionDisplay) => Promise<void>) {
  let host: HTMLElement | null = null, dialog: HTMLDialogElement | null = null;
  let state: SessionDisplay | undefined, settings: Settings | undefined;
  let kind: PromptKind = null, busy = false;
  let previous: HTMLElement | null = null;
  let choices: ReturnType<typeof mountChoices> | undefined;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => host!.shadowRoot!.querySelector<T>(`#${id}`)!;
  function remove() {
    dialog?.close(); host?.remove(); host = null; dialog = null; kind = null; choices = undefined;
    if (doc.hasFocus() && previous?.isConnected) previous.focus({ preventScroll: true });
    previous = null;
  }
  function render(prefs: Settings, next: SessionDisplay) {
    settings = prefs; state = next;
    if (!host) return;
    if (prefs.extensionPaused || (kind === 'intro' && (!prefs.autoSessionIntro || !['idle', 'finished'].includes(next.phase))) ||
        (kind === 'checkpoint' && next.phase !== 'checkpoint')) { remove(); return; }
    setSurfaceTheme(host, prefs.theme, doc);
    choices?.render(next, prefs, busy);
  }
  async function run(command: SessionCommand) {
    if (busy || !state) return;
    busy = true;
    const root = host?.shadowRoot;
    root?.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = true; });
    try { await act(command, state); remove(); }
    catch (e) { if (host) { el('dialog-error').textContent = e instanceof Error ? e.message : 'Change not confirmed. Try again.'; el('dialog-error').hidden = false; } }
    finally {
      busy = false;
      root?.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = false; });
      if (settings && state) render(settings, state);
    }
  }
  function dismiss() { if (!busy) { if (kind === 'checkpoint') void run({ action: 'dismiss-checkpoint' }); else remove(); } }
  function open(prompt: PromptKind) {
    if (!prompt || host || !state || !settings || settings.extensionPaused || doc.hidden || !doc.hasFocus()) return;
    if (prompt === 'intro' && (!settings.autoSessionIntro || !['idle','finished'].includes(state.phase))) return;
    if (prompt === 'checkpoint' && state.phase !== 'checkpoint') return;
    kind = prompt; previous = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
    host = doc.createElement('div'); host.id = 'chrysalis-session-dialog'; host.setAttribute('data-chrysalis-owned', '');
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${surfaceStyle}
      dialog { font:16px/1.5 system-ui,sans-serif; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:20px; width:calc(100vw - 24px); max-width:480px; max-height:calc(100dvh - 24px); margin:auto; padding:24px; overflow:auto; overscroll-behavior:contain; box-shadow:0 24px 80px #0003; }
      dialog::backdrop { background:rgb(20 16 28 / .38); }
      .top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      h1 { font:400 32px/1.15 Georgia,serif; letter-spacing:-.03em; margin:22px 0 12px; }
      #dialog-description { color:var(--muted); margin-bottom:22px; }
      input { width:100%; font-size:16px; } select { width:100%; }
      .primary, #untimed { width:100%; margin-top:16px; } #untimed { margin-top:8px; border:0; text-decoration:underline; }
      .note { margin-top:14px; } #checkpoint-controls { border-top:1px solid var(--line); margin-top:20px; padding-top:12px; }
      #break-controls { border-top:1px solid var(--line); margin-top:20px; } #break-controls button { margin-top:12px; }
      @media(min-width:600px) { dialog { padding:32px; } h1 { font-size:36px; } }
    </style><dialog aria-labelledby="dialog-title" aria-describedby="dialog-description"><div class="top"><span class="brand">Chrysalis</span><button id="close" aria-label="Close session introduction">×</button></div>
    <h1 id="dialog-title">A little intention.<br>Your time, your choice.</h1><p id="dialog-description">Choose how you want to spend your time on YouTube.</p>
    <form id="start-form"><label for="duration">How much time would you like?</label><select id="duration"><option value="5">5 minutes</option><option value="15" selected>15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option><option value="custom">Custom duration</option></select>
    <div id="custom-field" hidden><label for="minutes">Minutes (1–1440)</label><input id="minutes" type="number" min="1" max="1440" step="1" value="20"></div>
    <label for="intention">What are you here to watch? <span class="note">Optional</span></label><input id="intention" type="text" maxlength="80" autocomplete="off" placeholder="A tutorial, a favorite creator, a little exploring…">
    <p class="note">Counts browsing and watching while YouTube is visible in the focused Chrome window. Time away is excluded. Your intention stays on this device.</p>
    <button class="primary" type="submit">Start session</button><button id="untimed" type="button">Continue without a timer</button></form>
    <div id="check-in" hidden>${checkpointMarkup}<button id="finish" class="primary">Finish session</button>${breakMarkup}</div>
    <p id="dialog-error" role="status" hidden></p></dialog>`;
    dialog = root.querySelector('dialog')!;
    el('start-form').hidden = prompt !== 'intro'; el('check-in').hidden = prompt !== 'checkpoint';
    if (prompt === 'checkpoint') {
      el('dialog-title').textContent = 'A moment to choose.';
      el('dialog-description').textContent = 'You’ve reached your chosen time. What feels right now?';
      el('close').setAttribute('aria-label', 'Dismiss check-in and keep timing');
    }
    const minutes = String((settings.defaultTargetMs ?? 900000) / 60000);
    el<HTMLSelectElement>('duration').value = ['5','15','30','60'].includes(minutes) ? minutes : 'custom';
    el<HTMLInputElement>('minutes').value = minutes;
    const custom = () => { el('custom-field').hidden = el<HTMLSelectElement>('duration').value !== 'custom'; };
    custom(); el('duration').addEventListener('change', custom);
    choices = mountChoices(root, run, message => { el('dialog-error').textContent = message; el('dialog-error').hidden = false; }, true);
    let startGesture = false;
    root.querySelector<HTMLButtonElement>('[type="submit"]')!.addEventListener('click', event => {
      startGesture = event.isTrusted;
      if (!event.isTrusted) event.preventDefault();
    });
    el('start-form').addEventListener('submit', event => {
      event.preventDefault();
      const trusted = startGesture; startGesture = false;
      if (!event.isTrusted || !trusted || busy) return;
      try {
        const value = el<HTMLSelectElement>('duration').value;
        void run({ action: 'start', plan: { intention: el<HTMLInputElement>('intention').value.trim() || 'Your session', targetMs: targetFromMinutes(value === 'custom' ? el<HTMLInputElement>('minutes').value : value) } });
      } catch (e) { el('dialog-error').textContent = String((e as Error).message); el('dialog-error').hidden = false; }
    });
    el('untimed').addEventListener('click', event => { if (event.isTrusted) dismiss(); });
    el('close').addEventListener('click', event => { if (event.isTrusted) dismiss(); });
    el('finish').addEventListener('click', event => { if (event.isTrusted) void run({ action: 'finish' }); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (event.isTrusted) dismiss(); });
    // Native modal supplies inertness and focus containment. Keep YouTube's
    // bubbling keyboard shortcuts from reacting to controls/typing in this UI.
    root.addEventListener('keydown', event => {
      event.stopPropagation();
      if (!(event instanceof KeyboardEvent) || event.key !== 'Tab') return;
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(e => e.getClientRects().length && !e.closest('[hidden]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && root.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    root.addEventListener('keyup', event => event.stopPropagation());
    doc.documentElement.append(host); // Native modal top layer also covers element fullscreen.
    render(settings, state); dialog?.showModal(); el(prompt === 'intro' ? 'duration' : 'finish').focus();
  }
  return { render, open, remove };
}
