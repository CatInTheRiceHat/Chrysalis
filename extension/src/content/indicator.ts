import { clockText } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';

export const INDICATOR_ID = 'chrysalis-extension-indicator';
export function createIndicator(doc: Document) {
  let host: HTMLElement | null = null;
  let label: HTMLElement | null = null;
  let dismissed = false;
  let previousEnabled = false;
  function remove() { host?.remove(); host = null; }
  function render(settings: Settings, session?: SessionDisplay) {
    const caption = !session || session.phase === 'idle' ? 'Chrysalis is here' :
      `${session.phase === 'checkpoint' ? 'Target reached · open Chrysalis' : session.phase === 'active' ? 'YouTube time' : session.phase === 'break' ? 'On a break' : session.phase === 'finished' ? 'Finished' : 'Paused'} · ${clockText(session.elapsedMs)}`;
    if (settings.showIndicator && !previousEnabled) dismissed = false;
    previousEnabled = settings.showIndicator;
    if (!settings.showIndicator || dismissed) { remove(); return; }
    if (host?.isConnected) { host.dataset.theme = settings.theme; if (label) label.textContent = caption; return; }
    // Clean a previous injection's owned host, without changing YouTube elements.
    doc.querySelector(`[id="${INDICATOR_ID}"][data-chrysalis-owned]`)?.remove();
    host = doc.createElement('aside');
    host.id = INDICATOR_ID;
    host.setAttribute('data-chrysalis-owned', '');
    host.dataset.theme = settings.theme;
    host.setAttribute('aria-label', 'Chrysalis extension');
    const shadow = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = `
      :host { all: initial; position: fixed; bottom: 18px; left: 18px; z-index: 2147483646;
        color-scheme: light; --bg: #faf9f6; --ink: #2b2631; --line: #c9c2cf;
        --accent: #685975; font: 13px/1.4 system-ui, sans-serif; }
      :host([data-theme="dark"]) { color-scheme: dark; --bg: #221c30; --ink: #efeaf3;
        --line: #685975; --accent: #c9b8d8; }
      @media (prefers-color-scheme: dark) { :host([data-theme="system"]) {
        color-scheme: dark; --bg: #221c30; --ink: #efeaf3; --line: #685975; --accent: #c9b8d8; } }
      .pill { display: flex; align-items: center; gap: 10px; padding: 3px 4px 3px 14px;
        border: 1px solid var(--line); border-radius: 30px; background: var(--bg); color: var(--ink);
        box-shadow: 0 2px 10px #0001; max-width: calc(100vw - 40px); }
      .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
      button { font: inherit; color: inherit; border: 0; background: transparent;
        border-radius: 50%; min-width: 36px; min-height: 36px; cursor: pointer; font-size: 20px; }
      button:focus-visible { outline: 2px solid var(--accent); outline-offset: -3px; }
    `;
    const pill = doc.createElement('div');
    pill.className = 'pill';
    const dot = doc.createElement('span');
    dot.className = 'dot'; dot.setAttribute('aria-hidden', 'true');
    const text = doc.createElement('span');
    text.textContent = caption; label = text;
    const close = doc.createElement('button');
    close.type = 'button'; close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss Chrysalis indicator until this page is reloaded');
    close.addEventListener('click', () => { dismissed = true; remove(); });
    pill.append(dot, text, close);
    shadow.append(style, pill);
    doc.documentElement.append(host);
  }
  return { render, remove, error(message: string) { if (label) label.textContent = message; } };
}
