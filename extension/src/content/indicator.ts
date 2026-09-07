import { clockText } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';
import { dock } from './dock';

export const INDICATOR_ID = 'chrysalis-extension-indicator';
export type IndicatorAction = 'pause' | 'resume' | 'finish' | 'continue' | 'end-break' | 'edit' | 'session';
export function createIndicator(doc: Document, act: (action: IndicatorAction, state: SessionDisplay) => Promise<void> = async () => {}) {
  let host: HTMLElement | null = null;
  let release: (() => void) | null = null;
  let dismissed = false, previousEnabled = false, collapsed = false, busy = false;
  let collapsePreference: boolean | undefined;
  let session: SessionDisplay | undefined;
  let shadow: ShadowRoot | null = null;
  const el = (name: string) => shadow?.querySelector<HTMLElement>(`#${name}`);
  function remove() { release?.(); release = null; host?.remove(); host = null; shadow = null; }
  function text(id: string, value: string) { const target = el(id); if (target && target.textContent !== value) target.textContent = value; }
  function update() {
    if (!session || !shadow) return;
    const s = session;
    const active = s.phase !== 'idle' && s.phase !== 'finished';
    text('intention', active ? s.intention ?? 'Your session' : s.phase === 'finished' ? 'Session finished' : 'Chrysalis is here');
    text('time', `${clockText(s.elapsedMs)} foreground YouTube time${s.targetMs === null ? '' : ` · ${s.targetMs / 60000} min target`}`);
    text('compact', active ? `${clockText(s.elapsedMs)} foreground YouTube time` : 'Session controls');
    text('phase', s.phase === 'idle' ? 'Choose a session when you like.' : s.phase === 'checkpoint' ? 'Time target reached. Your next step is up to you.' : s.phase === 'active' ? 'Session active' : s.phase === 'break' ? 'On a break' : s.phase === 'paused' ? 'Session paused' : 'Session finished');
    el('details')!.hidden = collapsed;
    el('compact')!.hidden = !collapsed;
    el('time')!.hidden = !active;
    const collapse = el('collapse')!;
    text('collapse', collapsed ? 'Expand' : 'Collapse'); collapse.setAttribute('aria-expanded', String(!collapsed));
    const allowed: Record<IndicatorAction, boolean> = { pause: ['active','checkpoint'].includes(s.phase), resume: s.phase === 'paused', finish: active,
      continue: s.phase === 'checkpoint', 'end-break': s.phase === 'break', edit: active, session: !active };
    shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => { button.hidden = !allowed[button.dataset.action as IndicatorAction]; button.disabled = busy; });
  }
  function render(settings: Settings, next?: SessionDisplay) {
    if (next) session = next;
    if (collapsePreference !== settings.indicatorCollapsed) { collapsePreference = settings.indicatorCollapsed; collapsed = settings.indicatorCollapsed; }
    if (settings.showIndicator && !previousEnabled) dismissed = false;
    previousEnabled = settings.showIndicator;
    if (!settings.showIndicator || dismissed) { remove(); return; }
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
        button { font: inherit; font-size: 12px; min-height: 40px; border: 1px solid var(--accent); border-radius: 7px; padding: 6px 10px; background: transparent; color: var(--ink); cursor: pointer; }
        button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } :disabled { opacity: .6; }
        #error { font-size: 12px; color: var(--ink); } .actions { margin-top: 10px; }
        @media(prefers-reduced-motion:reduce) { * { scroll-behavior: auto; } }
      </style><div class="panel"><div class="top"><span class="brand">Chrysalis</span><span id="compact" aria-live="off" hidden></span><button id="collapse" aria-controls="details" aria-expanded="true">Collapse</button><button id="dismiss" aria-label="Dismiss Chrysalis indicator until this page is reloaded">×</button></div>
      <div id="details"><p id="intention"></p><p id="time" aria-live="off"></p><p id="phase" role="status"></p><div class="actions"><button data-action="pause">Pause</button><button data-action="resume">Resume</button><button data-action="continue">Continue viewing</button><button data-action="end-break">End break</button><button data-action="edit">Edit plan</button><button data-action="finish">Finish</button><button data-action="session">Open session</button></div></div><p id="error" role="status" hidden></p></div>`;
      el('collapse')!.addEventListener('click', event => { if (!event.isTrusted) return; collapsed = !collapsed; update(); el('collapse')?.focus(); });
      el('dismiss')!.addEventListener('click', event => { if (!event.isTrusted) return; dismissed = true; remove(); });
      shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', async event => {
        // No webpage bridge. Programmatic page clicks cannot invoke controls.
        if (!event.isTrusted || !session || busy) return;
        busy = true; update();
        try { await act(button.dataset.action as IndicatorAction, session); if (el('error')) el('error')!.hidden = true; }
        catch (e) { error(e instanceof Error ? e.message : 'Open the popup to retry.'); }
        finally {
          busy = false; update();
          if (button.hidden) (shadow?.querySelector<HTMLButtonElement>('[data-action]:not([hidden])') ?? el('collapse'))?.focus();
        }
      }));
      release = dock(doc, host);
    }
    host.dataset.theme = settings.theme; update();
  }
  function error(message: string) { text('error', message); if (el('error')) el('error')!.hidden = false; }
  return { render, remove, error };
}
