const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
menu.hidden = false;
document.documentElement.classList.add('has-js');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('open', open);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    menu.click(); menu.focus();
  }
});
const toggle = document.querySelector('.theme-toggle');
const choices = ['system', 'light', 'dark'];
let theme = 'system';
try { const saved = localStorage.getItem('chrysalis.site.theme'); if (choices.includes(saved)) theme = saved; } catch { /* Storage is optional. */ }
function renderTheme() { document.documentElement.dataset.theme = theme; toggle.textContent = `Theme: ${theme}`; toggle.setAttribute('aria-label', `Color theme: ${theme}. Change theme`); }
toggle.hidden = false; renderTheme();
toggle.addEventListener('click', () => { theme = choices[(choices.indexOf(theme) + 1) % choices.length]; renderTheme(); try { localStorage.setItem('chrysalis.site.theme', theme); } catch { /* Continue without persistence. */ } });
