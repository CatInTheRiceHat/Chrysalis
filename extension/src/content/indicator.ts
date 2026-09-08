import { clockText, durationText, breakCountdown, type SessionCommand } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';
import { checkpointMarkup, breakMarkup, mountChoices } from '../ui/choices';
import { surfaceStyle, setSurfaceTheme } from './surface';

export const INDICATOR_ID = 'chrysalis-extension-indicator';
export type IndicatorAction = 'pause' | 'resume' | 'finish' | 'continue' | 'dismiss-checkpoint' | 'continue-untimed' | 'extend' | 'break' | 'end-break' | 'edit' | 'session' | 'viewing';
export function createIndicator(doc: Document, act: (action: IndicatorAction, state: SessionDisplay, durationMs?: number) => Promise<void> = async () => {}) {
  let host: HTMLElement | null = null, shadow: ShadowRoot | null = null;
  let session: SessionDisplay | undefined, preferences: Settings | undefined;
  let collapsed = true, minimized = false, busy = false, smallExpanded = false;
  let collapsePreference: boolean | undefined, showPreference: boolean | undefined;
  let choices: ReturnType<typeof mountChoices> | null = null;
  const el = (name: string) => shadow?.querySelector<HTMLElement>(`#${name}`);
  const text = (id: string, value: string) => { const target = el(id); if (target && target.textContent !== value) target.textContent = value; };
  function remove() {
    doc.removeEventListener('fullscreenchange', relocate);
    doc.defaultView?.removeEventListener('resize', resize);
    doc.defaultView?.removeEventListener('focus', update);
    doc.defaultView?.removeEventListener('blur', update);
    host?.remove(); host = null; shadow = null; choices = null;
  }
  function resize() { smallExpanded = false; update(); }
  function relocate() {
    if (!host) return;
    (doc.fullscreenElement ?? doc.documentElement).append(host);
    smallExpanded = false; update();
  }
  function update() {
    if (!session || !shadow || !host || !preferences) return;
    const s = session, active = !['idle','finished'].includes(s.phase);
    const small = Boolean(doc.fullscreenElement) || Boolean(doc.querySelector('ytd-watch-flexy[theater]')) || (doc.defaultView?.innerWidth ?? 1000) < 700;
    const hidden = minimized || ((small || !active) && !smallExpanded);
    el('panel')!.hidden = hidden; el('restore')!.hidden = !hidden;
    host.toggleAttribute('data-small', small);
    const remaining = s.targetMs === null ? null : Math.max(0, s.targetMs - s.elapsedMs);
    const time = s.phase === 'break' ? `${breakCountdown(s.breakUntil ?? Date.now())} break` :
      !active ? 'Your session' : remaining === null ? `${clockText(s.elapsedMs)} elapsed` : `${clockText(Math.ceil(remaining / 1000) * 1000)} left`;
    text('compact', time);
    el('restore')!.setAttribute('aria-label', `Restore Chrysalis timer: ${time}${s.phase === 'paused' ? ', paused' : ''}`);
    const status = s.phase === 'active' ? (s.targetMs !== null && remaining === 0 ? 'Target reached · still running' : doc.hasFocus() && !doc.hidden ? 'Running' : 'Away · time excluded') :
      s.phase === 'checkpoint' ? 'Time target reached' : s.phase === 'paused' ? s.recoveryReason ? 'Paused · timing interrupted' : 'Paused by you' :
      s.phase === 'break' ? 'On a break' : s.phase === 'finished' ? 'Session finished' : 'Ready when you are';
    text('phase', status);
    text('intention', active ? s.intention ?? 'No intention set' : 'Choose a session when you like.');
    text('time', `${clockText(s.elapsedMs)} foreground YouTube time${s.targetMs === null ? ' · no target' : ` · ${durationText(s.targetMs)} target`}`);
    text('break-countdown', s.phase === 'break' ? `${breakCountdown(s.breakUntil ?? Date.now())} remaining · wall-clock break. Ends paused.` : '');
    el('break-countdown')!.hidden = s.phase !== 'break';
    const warning = active && s.targetMs !== null && remaining! > 0 && remaining! <= Math.min(60000, s.targetMs * .2);
    el('warning')!.hidden = !warning;
    text('warning', warning ? 'Nearly at your chosen time.' : '');
    el('details')!.hidden = collapsed;
    for (const id of ['collapse', 'dismiss', 'restore']) (el(id) as HTMLButtonElement).disabled = busy;
    text('collapse', collapsed ? 'Expand' : 'Collapse'); el('collapse')!.setAttribute('aria-expanded', String(!collapsed));
    text('viewing-state', `Home recommendations ${preferences.hideHomeRecommendations ? 'hidden' : 'visible'} · Related videos ${preferences.hideWatchRecommendations ? 'hidden' : 'visible'} · Shorts entries ${preferences.hideShortsEntries ? 'hidden' : 'visible'}`);
    el('recovery')!.hidden = !s.recoveryReason;
    text('recovery', s.recoveryReason === 'browser-restart' ? 'Restored paused after Chrome restarted. Resume when ready.' : 'Timing signals were interrupted. The uncertain gap was excluded. Resume when ready.');
    const allowed: Record<string, boolean> = { pause: ['active','checkpoint'].includes(s.phase), resume: ['paused','break'].includes(s.phase), finish: active,
      'end-break': s.phase === 'break', edit: active, session: !active, viewing: true };
    text('resume', s.phase === 'break' ? 'Resume now' : 'Resume');
    choices?.render(s, preferences, busy);
    shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => { button.hidden = !allowed[button.dataset.action!]; button.disabled = busy; });
    setSurfaceTheme(host, preferences.theme, doc);
  }
  function render(settings: Settings, next?: SessionDisplay) {
    preferences = settings;
    if (next) session = next;
    if (collapsePreference !== settings.indicatorCollapsed) { collapsePreference = settings.indicatorCollapsed; collapsed = settings.indicatorCollapsed; }
    if (showPreference !== settings.showIndicator) { showPreference = settings.showIndicator; minimized = !settings.showIndicator; }
    if (settings.extensionPaused) { remove(); return; }
    if (!host) {
      host = doc.createElement('aside'); host.id = INDICATOR_ID; host.setAttribute('data-chrysalis-owned', '');
      host.setAttribute('aria-label', 'Chrysalis session'); shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>${surfaceStyle}
        :host { display:block!important; position:fixed!important; z-index:2147483646!important; inset:88px 12px auto auto!important; max-width:calc(100vw - 24px)!important; width:max-content!important; margin:0!important; }
        .panel { width:224px; max-width:calc(100vw - 24px); background:var(--bg); border:1px solid var(--line); border-radius:14px; padding:12px; box-shadow:0 4px 24px #0002; max-height:calc(100dvh - 176px); overflow:auto; overscroll-behavior:contain; }
        .panel:has(#details:not([hidden])) { width:320px; }
        .top { display:flex; gap:6px; align-items:center; } .brand { margin-right:auto; } .top button { padding:4px 10px; }
        #compact { font-size:26px; line-height:1.2; font-variant-numeric:tabular-nums; margin:10px 0 4px; }
        #phase { font-size:12px; color:var(--muted); } #intention { font-weight:600; overflow-wrap:anywhere; margin-top:16px; }
        .quick { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; } button { font-size:12px; }
        #details { border-top:1px solid var(--line); margin-top:12px; } #details input { width:100%; } #details select { width:100%; }
        #warning { color:var(--accent); font-size:12px; border-left:2px solid var(--accent); padding-left:8px; }
        #restore { border-radius:12px 0 0 12px; font-weight:650; box-shadow:0 2px 12px #0002; }
        :host:has(#panel[hidden]) { right:0!important; top:38vh!important; }
        :host([data-small]) .panel { max-height:calc(100dvh - 176px); }
        #error { font-size:12px; }
      </style><button id="restore" hidden>Chrysalis</button><div id="panel" class="panel"><div class="top"><span class="brand">Chrysalis</span><button id="collapse" aria-controls="details" aria-expanded="false">Expand</button><button id="dismiss" aria-label="Hide timer; keep session running">×</button></div>
      <p id="compact" aria-live="off"></p><p id="phase" role="status"></p><p id="warning" role="status" hidden></p>
      <div class="quick"><button data-action="pause" aria-label="Pause session">Pause</button><button id="resume" data-action="resume" aria-label="Resume session">Resume</button><button data-action="finish" aria-label="Finish session">Finish</button><button data-action="session">Open session</button></div>
      <div id="details" hidden><p id="intention"></p><p id="time" class="note" aria-live="off"></p><p id="recovery" class="note" hidden></p><p id="break-countdown" class="note" hidden></p>${checkpointMarkup}
      <div class="actions"><button data-action="end-break">End break</button><button data-action="edit">Edit plan</button></div>${breakMarkup}
      <p class="note">Counts browsing and watching in the visible YouTube tab of the focused Chrome window. Time away is excluded automatically. Pause requires Resume. These controls do not change playback.</p>
      <p id="viewing-state" class="note"></p><button data-action="viewing">Viewing controls</button></div><p id="error" role="status" hidden></p></div>`;
      choices = mountChoices(shadow, run, error, true);
      el('collapse')!.addEventListener('click', event => { if (!event.isTrusted || busy) return; collapsed = !collapsed; update(); el('collapse')?.focus(); });
      el('dismiss')!.addEventListener('click', event => { if (!event.isTrusted || busy) return; minimized = true; update(); el('restore')?.focus(); });
      el('restore')!.addEventListener('click', event => { if (!event.isTrusted) return; minimized = false; smallExpanded = true; update(); el('collapse')?.focus(); });
      shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', async event => {
        if (!event.isTrusted || !session || busy) return;
        await run({ action: button.dataset.action } as SessionCommand | { action: 'edit' | 'session' | 'viewing' });
      }));
      shadow.addEventListener('keydown', event => event.stopPropagation());
      shadow.addEventListener('keyup', event => event.stopPropagation());
      doc.addEventListener('fullscreenchange', relocate);
      doc.defaultView?.addEventListener('resize', resize);
      doc.defaultView?.addEventListener('focus', update);
      doc.defaultView?.addEventListener('blur', update);
      relocate();
    }
    update();
  }
  async function run(command: SessionCommand | { action: 'edit' | 'session' | 'viewing' }) {
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
