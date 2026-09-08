import { clockText, durationText, breakCountdown, type SessionCommand } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';
import { checkpointMarkup, breakMarkup, mountChoices } from '../ui/choices';
import { dock } from './dock';

export const INDICATOR_ID = 'chrysalis-extension-indicator';
export type IndicatorAction = 'pause' | 'resume' | 'finish' | 'continue' | 'dismiss-checkpoint' | 'continue-untimed' | 'extend' | 'break' | 'end-break' | 'edit' | 'session';
export function createIndicator(doc: Document, act: (action: IndicatorAction, state: SessionDisplay, durationMs?: number) => Promise<void> = async () => {}) {
  let host: HTMLElement | null = null;
  let release: (() => void) | null = null;
  let dismissed = false, previousEnabled = false, collapsed = false, busy = false;
  let collapsePreference: boolean | undefined;
  let session: SessionDisplay | undefined;
  let shadow: ShadowRoot | null = null;
  let preferences: Settings | undefined;
  let choices: ReturnType<typeof mountChoices> | null = null;
  const el = (name: string) => shadow?.querySelector<HTMLElement>(`#${name}`);
  function remove() { release?.(); release = null; host?.remove(); host = null; shadow = null; choices = null; }
  function text(id: string, value: string) { const target = el(id); if (target && target.textContent !== value) target.textContent = value; }
  function update() {
    if (!session || !shadow) return;
    const s = session;
    const active = s.phase !== 'idle' && s.phase !== 'finished';
    text('intention', active ? s.intention ?? 'Your session' : s.phase === 'finished' ? 'Session finished' : 'Chrysalis is here');
    text('time', `${clockText(s.elapsedMs)} foreground YouTube time${s.targetMs === null ? '' : ` · ${durationText(s.targetMs)} target`}`);
    text('break-countdown', s.phase === 'break' ? `${breakCountdown(s.breakUntil ?? Date.now())} remaining · wall-clock break time. YouTube stays available. Ends paused.` : '');
    el('break-countdown')!.hidden = s.phase !== 'break';
    text('compact', s.phase === 'break' ? `Break · ${breakCountdown(s.breakUntil ?? Date.now())} remaining` : active ? `${clockText(s.elapsedMs)} foreground YouTube time` : 'Session controls');
    text('phase', s.phase === 'idle' ? 'Choose a session when you like.' : s.phase === 'checkpoint' ? 'Time target reached. Your next step is up to you.' : s.phase === 'active' ? (s.goalAcknowledged && s.targetMs !== null && s.elapsedMs >= s.targetMs ? 'Time target reached · timer continues. No additional time chosen.' : 'Session active') : s.phase === 'break' ? 'On a break' : s.phase === 'paused' ? 'Session paused' : 'Session finished');
    el('details')!.hidden = collapsed;
    el('compact')!.hidden = !collapsed;
    el('time')!.hidden = !active;
    const collapse = el('collapse')!;
    text('collapse', collapsed ? 'Expand' : 'Collapse'); collapse.setAttribute('aria-expanded', String(!collapsed));
    el('dismiss')!.setAttribute('aria-label', s.phase === 'checkpoint' ? 'Dismiss checkpoint and keep the timer' : 'Dismiss Chrysalis indicator until this page is reloaded');
    el('dismiss')!.toggleAttribute('disabled', busy); el('collapse')!.toggleAttribute('disabled', busy);
    const allowed: Record<IndicatorAction, boolean> = { pause: ['active','checkpoint'].includes(s.phase), resume: ['paused', 'break'].includes(s.phase), finish: active,
      continue: false, 'dismiss-checkpoint': false, 'continue-untimed': false, extend: false, break: false, 'end-break': s.phase === 'break', edit: active, session: !active };
    const resume = shadow.querySelector<HTMLElement>('[data-action="resume"]')!;
    const resumeText = s.phase === 'break' ? 'Resume session now' : 'Resume';
    if (resume.textContent !== resumeText) resume.textContent = resumeText;
    if (preferences) choices?.render(s, preferences, busy);
    shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => { button.hidden = !allowed[button.dataset.action as IndicatorAction]; button.disabled = busy; });
  }
  function render(settings: Settings, next?: SessionDisplay) {
    preferences = settings;
    if (next) session = next;
    if (collapsePreference !== settings.indicatorCollapsed) { collapsePreference = settings.indicatorCollapsed; collapsed = settings.indicatorCollapsed; }
    if (settings.showIndicator && !previousEnabled) dismissed = false;
    previousEnabled = settings.showIndicator;
    if (settings.extensionPaused || !settings.showIndicator || dismissed) { remove(); return; }
    if (!host) {
      host = doc.createElement('aside'); host.id = INDICATOR_ID; host.setAttribute('data-chrysalis-owned', '');
      host.setAttribute('aria-label', 'Chrysalis session'); shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>
        :host { all: initial; display: block; contain: content; box-sizing: border-box; width: 100%; flex: 0 0 100%; max-width: calc(100vw - 32px); margin: 12px 0;
          --bg: #faf9f6; --ink: #2b2631; --muted: #62596d; --line: #c9c2cf; --accent: #685975; color-scheme: light; font: 14px/1.5 system-ui,sans-serif; color: var(--ink); }
        :host([hidden]) { display: none !important; }
        :host([data-theme="dark"]) { --bg: #221c30; --ink: #efeaf3; --muted: #c6bdd1; --line: #685975; --accent: #d7c4e7; color-scheme: dark; }
        @media(prefers-color-scheme:dark) { :host([data-theme="system"]) { --bg: #221c30; --ink: #efeaf3; --muted: #c6bdd1; --line: #685975; --accent: #d7c4e7; color-scheme: dark; } }
        * { box-sizing: border-box; } [hidden] { display: none !important; }
        .panel { max-width: 760px; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; }
        .top, .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .top .brand { margin-right: auto; } .brand { color: var(--accent); font-weight: 650; }
        p { margin: 6px 0; } #intention { font-weight: 600; overflow-wrap: anywhere; }
        #time, #phase { color: var(--muted); font-size: 12px; } #compact { overflow-wrap: anywhere; }
        input, select { max-width: 100%; min-width: 0; font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--accent); border-radius: 6px; padding: 8px; }
        label { display: block; margin-top: 8px; } input { width: 110px; } .note { font-size: 12px; color: var(--muted); }
        #checkpoint-controls { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 6px; } #checkpoint-copy { font-weight: 600; }
        #break-controls { margin-top: 10px; } #break-controls button { margin-left: 8px; }
        input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        button { font: inherit; font-size: 12px; min-height: 40px; border: 1px solid var(--accent); border-radius: 7px; padding: 6px 10px; background: transparent; color: var(--ink); cursor: pointer; }
        button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } :disabled { opacity: .6; }
        #error { font-size: 12px; color: var(--ink); } .actions { margin-top: 10px; }
        @media(prefers-reduced-motion:reduce) { * { scroll-behavior: auto; } }
      </style><div class="panel"><div class="top"><span class="brand">Chrysalis</span><span id="compact" aria-live="off" hidden></span><button id="collapse" aria-controls="details" aria-expanded="true">Collapse</button><button id="dismiss" aria-label="Dismiss Chrysalis indicator until this page is reloaded">×</button></div>
      <div id="details"><p id="intention"></p><p id="time" aria-live="off"></p><p id="phase" role="status"></p><p id="break-countdown" aria-live="off" hidden></p>${checkpointMarkup}<div class="actions"><button data-action="pause">Pause</button><button data-action="resume">Resume</button><button data-action="end-break">End break</button><button data-action="edit">Edit plan</button><button data-action="finish">Finish</button><button data-action="session">Open session</button></div>${breakMarkup}</div><p id="error" role="status" hidden></p></div>`;
      choices = mountChoices(shadow, run, error, true);
      el('collapse')!.addEventListener('click', async event => {
        if (!event.isTrusted || busy) return;
        if (!collapsed && session?.phase === 'checkpoint') await run({ action: 'dismiss-checkpoint' });
        collapsed = !collapsed; update(); el('collapse')?.focus();
      });
      el('dismiss')!.addEventListener('click', async event => {
        if (!event.isTrusted || busy) return;
        if (session?.phase === 'checkpoint') { await run({ action: 'dismiss-checkpoint' }); el('collapse')?.focus(); }
        else { dismissed = true; remove(); }
      });
      shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', async event => {
        // No webpage bridge. Programmatic page clicks cannot invoke controls.
        if (!event.isTrusted || !session || busy) return;
        await run({ action: button.dataset.action } as SessionCommand | { action: 'edit' | 'session' });
      }));
      release = dock(doc, host);
    }
    host.dataset.theme = settings.theme; update();
  }
  async function run(command: SessionCommand | { action: 'edit' | 'session' }) {
    if (!session || busy) return;
    const button = shadow?.activeElement as HTMLElement | null;
    busy = true; update();
    try {
      await act(command.action as IndicatorAction, session, 'durationMs' in command ? command.durationMs : undefined);
      if (el('error')) el('error')!.hidden = true;
    } catch (e) { error(e instanceof Error ? e.message : 'Open the popup to retry.'); }
    finally {
      busy = false; update();
      if (button?.closest('[hidden]')) (shadow?.querySelector<HTMLButtonElement>('[data-action]:not([hidden])') ?? el('collapse'))?.focus();
    }
  }
  function error(message: string) { text('error', message); if (el('error')) el('error')!.hidden = false; }
  return { render, remove, error };
}
