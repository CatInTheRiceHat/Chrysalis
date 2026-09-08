import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-viewing-'));
const extensionPath = path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? 'dist');
await mkdir('test-results', { recursive: true });
const checks = [];
let context;
const homeCard = id => `<ytd-rich-item-renderer id="${id}"><div id="content"><ytd-rich-grid-media><a href="/watch?v=${id}">Home video</a></ytd-rich-grid-media></div></ytd-rich-item-renderer>`;
const shelf = id => `<ytd-reel-shelf-renderer id="${id}"><a href="/shorts/fixture">Shorts shelf</a></ytd-reel-shelf-renderer>`;
const fixture = `<!doctype html><html><head><style>
body { font:16px sans-serif; } ytd-rich-item-renderer, ytd-rich-section-renderer, yt-lockup-view-model, ytd-compact-video-renderer, ytd-reel-shelf-renderer, ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer { display:block; margin:5px; padding:3px; } [hidden] { display:none !important; } video { width:180px;height:100px; } </style></head><body>
<header><form id="search"><input aria-label="Search"><button>Search</button></form><button id="account">Sign in</button></header>
<ytd-guide-renderer><ytd-guide-entry-renderer id="nav-home"><a href="/">Home</a></ytd-guide-entry-renderer><ytd-guide-entry-renderer id="nav-shorts"><a id="endpoint" title="Shorts">Shorts</a></ytd-guide-entry-renderer><ytd-guide-entry-renderer id="nav-subscriptions"><a href="/feed/subscriptions">Subscriptions</a></ytd-guide-entry-renderer></ytd-guide-renderer>
<ytd-mini-guide-renderer><ytd-mini-guide-entry-renderer id="mini-shorts"><a href="/shorts/">Shorts</a></ytd-mini-guide-entry-renderer></ytd-mini-guide-renderer>
<a id="ordinary-shorts-link" href="/shorts/fixture">An ordinary Shorts URL</a>
<ytd-page-manager>
<ytd-browse page-subtype="home"><ytd-rich-grid-renderer><div id="masthead-ad"><button id="masthead-ad-button">Advertisement</button></div><div id="contents">
${homeCard('home-video')}
<ytd-rich-item-renderer id="home-ad"><div id="content"><ytd-ad-slot-renderer><button>Advertisement</button></ytd-ad-slot-renderer></div></ytd-rich-item-renderer>
<ytd-rich-section-renderer id="home-shorts"><div id="content"><ytd-rich-shelf-renderer is-shorts><a href="/shorts/fixture">Shorts shelf</a></ytd-rich-shelf-renderer></div></ytd-rich-section-renderer>
<ytd-rich-section-renderer id="home-prompt">Try searching to get started</ytd-rich-section-renderer>
</div></ytd-rich-grid-renderer></ytd-browse>
<ytd-watch-flexy hidden><div id="primary"><video id="player" controls muted></video><button id="captions">Captions</button><button id="playback">Playback</button></div><div id="secondary"><div id="player-ads"><button>Advertisement</button></div><ytd-playlist-panel-renderer id="queue"><a href="/watch?v=b&list=queue">Playlist queue</a></ytd-playlist-panel-renderer><div id="chat">Live chat</div><div id="related"><ytd-watch-next-secondary-results-renderer><div id="items"><ytd-item-section-renderer><div id="contents">
<yt-lockup-view-model id="related-video"><div><a href="/watch?v=related">Related video</a></div></yt-lockup-view-model>
<ytd-compact-video-renderer id="compact-video"><a href="/watch?v=compact">Legacy video</a></ytd-compact-video-renderer>
${shelf('watch-shorts')}
<ytd-ad-slot-renderer id="related-ad"><button>Advertisement</button></ytd-ad-slot-renderer>
<yt-lockup-view-model id="recommended-playlist"><a href="/watch?v=a&list=playlist">Playlist</a></yt-lockup-view-model>
<unknown-recommendation id="unknown">Unfamiliar recommendation layout</unknown-recommendation>
</div></ytd-item-section-renderer></div></ytd-watch-next-secondary-results-renderer></div></div></ytd-watch-flexy>
<main id="other" hidden><ytd-rich-grid-renderer><div id="contents">${homeCard('subscription-video')}</div></ytd-rich-grid-renderer><ytd-video-renderer id="search-video"><a href="/watch?v=result">Search result</a></ytd-video-renderer>${shelf('search-shorts')}<a id="playlist-page" href="/playlist?list=a">Playlist page</a></main>
</ytd-page-manager></body></html>`;
try {
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1200, height: 900 }, args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).hostname;
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await expect(options.locator('#connection')).toHaveText('Extension connected');
  await options.locator('#intro-skip').click();
  await options.locator('#auto-session-intro').uncheck();
  await context.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  const youtube = await context.newPage();
  const errors = [];
  youtube.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(youtube);
  const worlds = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context: world }) => worlds.set(world.id, world));
  await cdp.send('Runtime.enable');
  await youtube.goto('https://www.youtube.com/');
  await expect(youtube.locator('#chrysalis-extension-indicator')).toHaveCount(1);
  const world = [...worlds.values()].find(w => w.origin === `chrome-extension://${id}`);
  assert(world);
  async function isolated(expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, contextId: world.id, awaitPromise: true, returnByValue: true });
    assert.equal(r.exceptionDetails, undefined, JSON.stringify(r.exceptionDetails)); return r.result.value;
  }
  await isolated(`globalThis.activeControlObservers=0; const NativeObserver=MutationObserver; globalThis.MutationObserver=class extends NativeObserver { active=false; observe(...args){if(!this.active){this.active=true;activeControlObservers++;}return super.observe(...args)} disconnect(){if(this.active){this.active=false;activeControlObservers--;}super.disconnect()} };`);
  const visible = async (...ids) => { for (const id of ids) await expect(youtube.locator(`#${id}`)).toBeVisible(); };
  const hidden = async (...ids) => { for (const id of ids) await expect(youtube.locator(`#${id}`)).toBeHidden(); };
  async function toggle(selector, value) {
    await options.locator(selector).setChecked(value);
    await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  }
  async function navigate(url, kind) {
    await youtube.evaluate(({ url, kind }) => {
      document.dispatchEvent(new Event('yt-navigate-start'));
      history.pushState({}, '', url);
      document.querySelector('ytd-browse').hidden = kind !== 'home';
      document.querySelector('ytd-watch-flexy').hidden = kind !== 'watch';
      document.querySelector('#other').hidden = kind !== 'other';
      document.dispatchEvent(new Event('yt-navigate-finish'));
    }, { url, kind });
  }
  for (const selector of ['#hide-home', '#hide-related', '#hide-shorts']) await expect(options.locator(selector)).not.toBeChecked();
  await visible('home-video', 'home-shorts', 'home-ad', 'nav-shorts');
  await expect(youtube.locator('#chrysalis-viewing-style')).toHaveCount(0);
  checks.push('Default layout untouched; all three saved controls initially off.');
  await youtube.evaluate(() => { window.originalCard = document.querySelector('#home-video'); window.originalHtml = window.originalCard.outerHTML; });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('#viewing-preferences').click();
  await options.locator('#hide-home').check();
  await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  await popup.close();
  await options.reload(); await expect(options.locator('#hide-home')).toBeChecked();
  const second = await context.newPage(); await second.goto('https://www.youtube.com/');
  await expect(second.locator('#home-video')).toBeHidden();
  await hidden('home-video', 'home-shorts');
  await visible('home-ad', 'home-prompt', 'masthead-ad-button', 'nav-shorts', 'ordinary-shorts-link', 'search', 'account');
  await youtube.evaluate(html => document.querySelector('ytd-rich-grid-renderer > #contents').insertAdjacentHTML('beforeend', html), homeCard('late-video'));
  await hidden('late-video');
  await toggle('#hide-home', false);
  await expect(second.locator('#home-video')).toBeVisible(); await second.close();
  await visible('home-video', 'home-shorts', 'late-video');
  assert(await youtube.evaluate(() => window.originalCard === document.querySelector('#home-video') && window.originalCard.outerHTML === window.originalHtml));
  await expect(youtube.locator('#chrysalis-viewing-style')).toHaveCount(0);
  checks.push('Popup saves/reopens controls and broadcasts to two YouTube tabs. Home hides/restores cards/shelves including late insertion; original nodes/content retained and ads/prompts untouched.');
  await toggle('#hide-shorts', true);
  await hidden('nav-shorts', 'mini-shorts', 'home-shorts');
  await visible('home-video', 'ordinary-shorts-link', 'nav-subscriptions', 'nav-home');
  await toggle('#hide-shorts', false);
  await visible('nav-shorts', 'mini-shorts', 'home-shorts');
  await navigate('/watch?v=fixture', 'watch');
  await visible('related-video', 'compact-video', 'watch-shorts');
  await youtube.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
    const paint = () => { canvas.getContext('2d').fillRect(0, 0, 100, 100); requestAnimationFrame(paint); }; paint();
    const player = document.querySelector('#player'); player.srcObject = canvas.captureStream(10); await player.play();
  });
  const time = await youtube.locator('#player').evaluate(v => v.currentTime);
  await toggle('#hide-related', true);
  await hidden('related-video', 'compact-video', 'watch-shorts');
  await visible('player', 'captions', 'playback', 'player-ads', 'related-ad', 'queue', 'chat', 'recommended-playlist', 'unknown');
  await expect.poll(() => youtube.locator('#player').evaluate(v => v.currentTime)).toBeGreaterThan(time + .1);
  assert.equal(await youtube.locator('#player').evaluate(v => v.paused), false);
  await toggle('#hide-related', false);
  await visible('related-video', 'compact-video', 'watch-shorts');
  await toggle('#hide-shorts', true);
  await hidden('watch-shorts'); await visible('related-video', 'compact-video');
  checks.push('Watch and Shorts controls work independently across SPA navigation; turning off restores content; real fixture media continues playing, captions/controls, ads, queue and chat remain visible.');
  await toggle('#hide-related', true); await toggle('#hide-home', true);
  // A reused card gains an ad subtree: CSS safety guards must immediately unhide it.
  await youtube.locator('#related-video').evaluate(e => e.insertAdjacentHTML('beforeend', '<ytd-ad-slot-renderer id="late-ad">Advertisement</ytd-ad-slot-renderer>'));
  await visible('related-video', 'late-ad');
  await youtube.locator('#late-ad').evaluate(e => e.remove()); await hidden('related-video');
  for (const url of ['/results?search_query=fixture', '/feed/subscriptions', '/playlist?list=a', '/shorts/fixture']) {
    await navigate(url, 'other');
    await visible('subscription-video', 'search-video', 'search-shorts', 'playlist-page', 'ordinary-shorts-link', 'nav-subscriptions', 'search', 'account');
  }
  checks.push('Search, subscriptions, playlist and direct Shorts route remain usable with all toggles on; unrelated links and unknown/ad-bearing cards fail open.');
  await navigate('/', 'home'); await hidden('home-video', 'home-shorts');
  await youtube.locator('ytd-browse').evaluate(e => e.setAttribute('page-subtype', 'unfamiliar'));
  await visible('home-video', 'home-shorts');
  await youtube.locator('#chrysalis-viewing-status').locator('summary').click();
  await expect(youtube.locator('#chrysalis-viewing-status')).toContainText('No supported items found. Empty or unfamiliar layouts stay visible.');
  await youtube.locator('ytd-browse').evaluate(e => e.setAttribute('page-subtype', 'home'));
  await hidden('home-video');
  const bundle = await readFile(path.join(extensionPath, 'content.js'), 'utf8'); await isolated(bundle); await isolated(bundle);
  await expect(youtube.locator('#chrysalis-viewing-style')).toHaveCount(1);
  await expect(youtube.locator('#chrysalis-viewing-status')).toHaveCount(1);
  assert.equal(await isolated('activeControlObservers'), 2);
  await youtube.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  // The pagehide observation reply must not remount UI while suspended.
  await youtube.waitForTimeout(600);
  assert.equal(await isolated('activeControlObservers'), 0);
  await visible('home-video', 'home-shorts', 'nav-shorts');
  await youtube.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await hidden('home-video');
  await expect.poll(() => isolated('activeControlObservers')).toBe(2);
  await options.reload(); await expect(options.locator('#hide-home')).toBeChecked();
  await options.locator('#theme').selectOption('dark');
  await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  await expect(youtube.locator('#chrysalis-viewing-status')).toHaveAttribute('data-theme', 'dark');
  await options.locator('#restore-layout').click();
  await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  await visible('home-video', 'home-shorts', 'nav-shorts', 'mini-shorts');
  await expect(youtube.locator('#chrysalis-viewing-style, #chrysalis-viewing-status, html[data-chrysalis-view-page]')).toHaveCount(0);
  assert.equal(await isolated('activeControlObservers'), 0); // Floating session UI needs no placement observer.
  await youtube.evaluate(html => document.querySelector('ytd-rich-grid-renderer > #contents').insertAdjacentHTML('beforeend', html), homeCard('after-disable'));
  await youtube.waitForTimeout(600);
  await visible('after-disable');
  await expect(youtube.locator('#chrysalis-viewing-style, #chrysalis-viewing-status')).toHaveCount(0);
  await expect(options.locator('#theme')).toHaveValue('dark');
  checks.push('Unknown layout reports no supported items; reinjection has one observer/style/status; pagehide/pageshow cleans/restores; restore-all removes every viewing-control artifact/observer and preserves appearance.');
  await options.screenshot({ path: 'test-results/viewing-settings-dark.png', fullPage: true });
  await options.setViewportSize({ width: 375, height: 850 });
  assert.equal(await options.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await writeFile('test-results/viewing-fixture-report.json', JSON.stringify({ browser: context.browser().version(), checks, evidence: 'Controlled fixtures with real unpacked extension; not live YouTube selector evidence.' }, null, 2));
  console.log(checks.join('\n'));
} finally { await context?.close(); await rm(profile, { recursive: true, force: true }); }
