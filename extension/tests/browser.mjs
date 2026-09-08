import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Real unpacked extension + real Chrome APIs, isolated temporary browser profile.
// Default uses a controlled page at the supported origin; LIVE_YOUTUBE=1 also
// checks the actual public YouTube website, without signing in.
const extensionPath = path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? 'dist');
const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-extension-test-'));
const results = [];
const errors = [];
await mkdir('test-results', { recursive: true });
const launch = () => chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 1100, height: 850 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
let context;
try {
  context = await launch();
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).hostname;
  const base = `chrome-extension://${extensionId}/`;
  const version = context.browser()?.version() ?? await worker.evaluate(() => navigator.userAgent);
  const watchErrors = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text());
    });
  };
  const popup = await context.newPage();
  watchErrors(popup);
  await popup.goto(`${base}popup.html`);
  await popup.locator('#intro-skip').click();
  await popup.locator('.quick-preferences summary').click();
  await expect(popup.getByRole('heading', { name: 'Your YouTube session' })).toBeVisible();
  await expect(popup.locator('#connection')).toHaveText('Extension connected');
  await expect(popup.locator('#show-indicator')).toBeChecked();
  await popup.locator('#theme').selectOption('dark');
  await expect(popup.locator('#save-status')).toHaveText('Saved on this device.');
  await popup.setViewportSize({ width: 375, height: 650 });
  await popup.screenshot({ path: 'test-results/popup-dark.png' });
  await popup.close();

  const reopened = await context.newPage();
  watchErrors(reopened);
  await reopened.goto(`${base}popup.html`);
  await reopened.locator('.quick-preferences summary').click();
  await expect(reopened.locator('#theme')).toHaveValue('dark');
  const optionsPromise = context.waitForEvent('page');
  await reopened.getByRole('button', { name: 'Open settings' }).click();
  const options = await optionsPromise;
  watchErrors(options);
  await options.waitForURL(`${base}options.html`);
  await expect(options.getByRole('heading', { name: 'A small presence. Your preferences.' })).toBeVisible();
  await expect(options.locator('#theme')).toHaveValue('dark');
  results.push('Popup and options render, PING/PONG works, options opens, settings survive popup closure.');

  await context.route('https://www.youtube.com/**', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><html><head><title>YouTube test fixture</title></head><body><main><h1>Controlled YouTube fixture</h1><button id="youtube-control">YouTube control</button></main></body></html>',
  }));
  const youtube = await context.newPage();
  watchErrors(youtube);
  const cdp = await context.newCDPSession(youtube);
  const worlds = new Map();
  cdp.on('Runtime.executionContextCreated', ({ context: execution }) => worlds.set(execution.id, execution));
  cdp.on('Runtime.executionContextsCleared', () => worlds.clear());
  await cdp.send('Runtime.enable');
  await youtube.goto('https://www.youtube.com/');
  await youtube.bringToFront();
  const introduction = youtube.locator('#chrysalis-session-dialog');
  await expect(introduction.locator('dialog')).toBeVisible({ timeout: 22000 });
  await introduction.getByRole('button', { name: 'Continue without a timer', exact: true }).click();
  await expect(introduction).toHaveCount(0);
  await youtube.locator('#youtube-control').click();
  assert.equal(await worker.evaluate(async () => (await chrome.storage.session.get('chrysalis.extension.v1'))['chrysalis.extension.v1'].currentSession.phase), 'idle');
  results.push('Default introduction dismisses through Continue without a timer, restores host interaction and creates no session.');
  const indicator = youtube.locator('#chrysalis-extension-indicator');
  await expect(indicator).toHaveCount(1);
  await expect(indicator).toContainText('Ready when you are');
  const extensionWorld = [...worlds.values()].find(world => world.origin === `chrome-extension://${extensionId}`);
  assert(extensionWorld, `Missing extension isolated world: ${JSON.stringify([...worlds.values()])}`);
  async function isolated(expression) {
    const result = await cdp.send('Runtime.evaluate', { expression, contextId: extensionWorld.id, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const bundle = await readFile(path.join(extensionPath, 'content.js'), 'utf8');
  await isolated(bundle);
  await isolated(bundle);
  await expect(introduction).toHaveCount(0);
  await expect(indicator).toHaveCount(1);
  await youtube.evaluate(() => {
    history.pushState({}, '', '/watch?v=fixture');
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await expect(indicator).toHaveCount(1);
  await expect(youtube.locator('#youtube-control')).toBeVisible();
  results.push('Native content-script injection, repeated initialization and SPA event leave exactly one indicator and preserve page controls.');

  const denied = await isolated(`chrome.runtime.sendMessage({channel:'chrysalis/v1',type:'UPDATE_SETTINGS',patch:{showIndicator:false},expectedRevision:1})`);
  assert.equal(denied.code, 'FORBIDDEN');
  const privateRead = await isolated(`chrome.runtime.sendMessage({channel:'chrysalis/v1',type:'GET_SNAPSHOT'})`);
  assert.equal(privateRead.code, 'FORBIDDEN');
  const directRead = await isolated(`(async()=>{try {await chrome.storage.session.get(null); return 'allowed';}catch{return 'denied';}})()`);
  assert.equal(directRead, 'denied');
  results.push('Actual content context cannot mutate settings, request private snapshots or directly read restricted storage.');

  // Hold initial display replies in the actual isolated content context, then
  // deliver a browser-generated focus event to the registered lifecycle handler.
  // The harness controls event ordering, not production state. Claiming the introduction
  // here used to consume it while the dialog had no state and could not render.
  await worker.evaluate(() => chrome.storage.session.remove('chrysalis.visit'));
  await isolated(`globalThis.__originalSend = chrome.runtime.sendMessage.bind(chrome.runtime);
    globalThis.__displayReplies = []; globalThis.__promptCount = 0;
    globalThis.__messageListeners = new Map(); globalThis.__heldMessages = [];
    globalThis.__addMessage = chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage);
    globalThis.__removeMessage = chrome.runtime.onMessage.removeListener.bind(chrome.runtime.onMessage);
    chrome.runtime.onMessage.addListener = listener => {
      const held = (...args) => globalThis.__heldMessages.push(() => listener(...args));
      globalThis.__messageListeners.set(listener, held); globalThis.__addMessage(held);
    };
    chrome.runtime.onMessage.removeListener = listener => globalThis.__removeMessage(globalThis.__messageListeners.get(listener) ?? listener);
    globalThis.__earlyFocus = 0;
    globalThis.__windowAdd = window.addEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      if (type === 'focus') globalThis.__focusHandler = listener;
      globalThis.__windowAdd(type, listener, options);
    };
    chrome.runtime.sendMessage = async message => {
      if (message.type === 'PROMPT') globalThis.__promptCount++;
      if (['GET_DISPLAY','OBSERVE'].includes(message.type)) await new Promise(resolve => globalThis.__displayReplies.push(resolve));
      return globalThis.__originalSend(message);
    };`);
  await isolated(bundle);
  await isolated(`window.addEventListener = globalThis.__windowAdd;
    document.addEventListener('focusin', event => {
      if (event.isTrusted) { globalThis.__earlyFocus++; globalThis.__focusHandler(event); }
    }, { once: true });`);
  await youtube.evaluate(() => document.activeElement?.blur());
  await youtube.locator('#youtube-control').click();
  await expect.poll(() => isolated('globalThis.__earlyFocus')).toBeGreaterThan(0);
  await expect.poll(() => isolated('globalThis.__displayReplies.length')).toBeGreaterThan(0);
  assert.equal(await isolated('globalThis.__promptCount'), 0, 'Do not claim before a display can render');
  await isolated(`chrome.runtime.sendMessage = globalThis.__originalSend;
    chrome.runtime.onMessage.addListener = globalThis.__addMessage; chrome.runtime.onMessage.removeListener = globalThis.__removeMessage;
    for (const [listener, held] of globalThis.__messageListeners) { globalThis.__removeMessage(held); globalThis.__addMessage(listener); }
    globalThis.__heldMessages.splice(0).forEach(deliver => deliver());
    globalThis.__displayReplies.splice(0).forEach(resolve => resolve());`);
  await expect(introduction.locator('dialog')).toBeVisible({ timeout: 22000 });
  await youtube.keyboard.press('Escape'); await expect(introduction).toHaveCount(0);
  await youtube.locator('#youtube-control').click();
  results.push('Fault-injected early focus cannot consume an introduction before delayed state arrives; the dialog appears once afterward and releases host focus on dismissal.');

  await options.locator('#show-indicator').uncheck();
  await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  await expect(indicator.locator('#restore')).toBeVisible();
  await expect(reopened.locator('#show-indicator')).not.toBeChecked();
  await options.locator('#show-indicator').check();
  await expect(indicator).toHaveCount(1);
  await indicator.locator('#restore').click();
  await indicator.getByRole('button', { name: /Hide timer/ }).click();
  await expect(indicator.locator('#restore')).toBeVisible();
  await youtube.reload();
  await expect(indicator).toHaveCount(1);
  results.push('Settings synchronize across pages; indicator minimizes/restores immediately and leaves an accessible restore tab.');

  await context.route('https://example.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Unrelated site</h1>' }));
  const other = await context.newPage();
  await other.goto('https://example.com/');
  await expect(other.locator('#chrysalis-extension-indicator')).toHaveCount(0);
  results.push('No injection on an unrelated origin.');

  // Exercise worker stop/restart without restarting a page or resetting storage.
  const versions = new Map();
  const stoppedVersions = new Set();
  cdp.on('ServiceWorker.workerVersionUpdated', ({ versions: updates }) => {
    for (const entry of updates) {
      versions.set(entry.versionId, entry);
      if (entry.runningStatus === 'stopped') stoppedVersions.add(entry.versionId);
    }
  });
  await cdp.send('ServiceWorker.enable');
  await expect.poll(() => [...versions.values()].some(item => item.scriptURL === `${base}background.js`)).toBe(true);
  const workerVersion = [...versions.values()].find(item => item.scriptURL === `${base}background.js`);
  stoppedVersions.delete(workerVersion.versionId);
  await cdp.send('ServiceWorker.stopWorker', { versionId: workerVersion.versionId });
  // An open session UI can legitimately wake it on its next read. Check the
  // actual stop event, rather than requiring it to remain stopped until polling.
  await expect.poll(() => stoppedVersions.has(workerVersion.versionId)).toBe(true);
  const pong = await reopened.evaluate(() => chrome.runtime.sendMessage({ channel: 'chrysalis/v1', type: 'PING' }));
  assert.equal(pong.type, 'PONG');
  await reopened.reload();
  await expect(reopened.locator('#theme')).toHaveValue('dark');
  results.push('Worker forcibly stopped, woke through messaging, and recovered persisted settings.');

  await options.locator('#theme').selectOption('light');
  await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  await options.screenshot({ path: 'test-results/settings-light.png', fullPage: true });
  await reopened.screenshot({ path: 'test-results/popup-light.png' });
  assert.equal(await options.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await options.setViewportSize({ width: 375, height: 850 });
  assert.equal(await options.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  results.push('Dark/light UI and narrow settings layout checked; screenshots saved.');
  assert.deepEqual(errors, [], 'Extension page/fixture runtime or CSP errors');

  if (process.env.LIVE_YOUTUBE === '1') {
    await context.unroute('https://www.youtube.com/**');
    const live = await context.newPage();
    await live.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await expect(live.locator('#chrysalis-extension-indicator')).toHaveCount(1);
    await live.screenshot({ path: 'test-results/live-youtube.png' });
    results.push(`Live public YouTube indicator verified at ${live.url()} (signed out).`);
  }

  await context.close();
  context = await launch();
  const afterRestart = await context.newPage();
  await afterRestart.goto(`${base}popup.html`);
  await expect(afterRestart.locator('#theme')).toHaveValue('light');
  await expect(afterRestart.locator('#show-indicator')).toBeChecked();
  results.push('Settings persisted through a full browser restart using the isolated test profile.');
  const report = { browser: version, results, liveYouTube: process.env.LIVE_YOUTUBE === '1', toolbarPopover: 'Popup document verified; native toolbar click not automated.' };
  await writeFile('test-results/browser-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
