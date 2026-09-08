// Reuse the extension's cream/plum palette without fonts or network requests
// from the host page. All rules stay inside Chrysalis shadow roots.
export const surfaceStyle = `
:host { all: initial; --bg:#faf9f6; --surface:#f2eef5; --ink:#2b2631; --muted:#62596d; --line:#c9c2cf; --accent:#685975; --on-accent:#fff; color-scheme:light; color:var(--ink); font:14px/1.5 system-ui,sans-serif; }
:host([data-theme="dark"]) { --bg:#161320; --surface:#221c30; --ink:#efeaf3; --muted:#c6bdd1; --line:#685975; --accent:#d7c4e7; --on-accent:#221c30; color-scheme:dark; }
@media(prefers-color-scheme:dark) { :host([data-theme="system"]) { --bg:#161320; --surface:#221c30; --ink:#efeaf3; --muted:#c6bdd1; --line:#685975; --accent:#d7c4e7; --on-accent:#221c30; color-scheme:dark; } }
* { box-sizing:border-box; } [hidden] { display:none!important; }
button,input,select { font:inherit; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:8px; min-height:44px; padding:8px 12px; max-width:100%; }
button { cursor:pointer; } button:hover { background:var(--surface); } button.primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); font-weight:650; }
:is(button,input,select):focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
:disabled { opacity:.6; cursor:wait; } label { display:block; margin:16px 0 6px; font-weight:600; }
p { margin:8px 0; } .brand { color:var(--accent); font-weight:650; letter-spacing:.03em; }
.note { color:var(--muted); font-size:12px; line-height:1.6; } .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
@media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; } }
`;

export function setSurfaceTheme(host: HTMLElement, theme: 'system' | 'light' | 'dark', doc: Document) {
  host.dataset.theme = theme === 'system' && doc.documentElement.hasAttribute('dark') ? 'dark' : theme;
}
