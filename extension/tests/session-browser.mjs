import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-session-test-'));
const extensionPath = path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? 'dist');
const launch = () => chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 1100, height: 900 },
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
let context;
try {
  context = await launch();
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const version = context.browser().version();
  const id = new URL(worker.url()).hostname;
  const base = `chrome-extension://${id}/`;
  await context.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html',
    body: '<!doctype html><title>YouTube session fixture</title><main><h1>YouTube browsing fixture</h1><button>Browse</button></main>' }));
  await context.route('https://example.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Another window</h1>' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}popup.html`);
  await page.locator('#intro-skip').click();
  const state = () => page.evaluate(async () => (await chrome.runtime.sendMessage({ channel: 'chrysalis/v1', type: 'GET_SNAPSHOT' })).snapshot);
  const elapsed = async () => (await state()).currentSession.elapsedMs;
  const youtube = await context.newPage();
  await youtube.goto('https://www.youtube.com/');
  await page.bringToFront();
  await expect(page.locator('#session-phase')).toHaveText('Idle');
  await page.locator('#intention').selectOption('Studying');
  await page.locator('#time-target').selectOption('5');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.locator('#session-phase')).toHaveText('Active');
  await youtube.bringToFront();
  await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThanOrEqual(2000);
  await expect(youtube.locator('#chrysalis-extension-indicator')).toContainText('YouTube time');
  checks.push('Start via popup; Chrome-confirmed focused YouTube browsing accumulates foreground time.');

  // A second focused window leaves the original YouTube tab selected but unfocused.
  const otherWindow = await worker.evaluate(() => chrome.windows.create({ url: 'https://example.com/', focused: true }));
  await expect.poll(async () => (await state()).timing.anchor).toBeNull();
  const away = await elapsed();
  await pause(3000);
  assert.equal(await elapsed(), away);
  await worker.evaluate(windowId => chrome.windows.remove(windowId), otherWindow.id);
  await youtube.bringToFront();
  await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThan(away);
  checks.push('Visible YouTube in an unfocused window contributes no time; focusing it resumes observation.');

  const second = await context.newPage();
  await second.goto('https://www.youtube.com/watch?v=fixture');
  const before = await elapsed(); const startWall = Date.now();
  await second.bringToFront(); await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThanOrEqual(before + 2000).catch(async error => { console.log('second tab failed', await state(), await worker.evaluate(() => chrome.windows.getLastFocused({populate:true}))); throw error; });
  const firstLeg = await elapsed();
  await youtube.bringToFront(); await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThanOrEqual(firstLeg + 2000);
  const gained = (await elapsed()) - before;
  assert(gained <= Date.now() - startWall + 250, `Two tabs double-counted: ${gained}`);
  assert(gained > 1500);
  await youtube.reload();
  await expect(youtube.locator('#chrysalis-extension-indicator')).toHaveCount(1);
  await expect.poll(async () => (await state()).timing.anchor?.documentId, { timeout: 10000 }).toBeTruthy();
  await second.close();
  checks.push('Tab switching does not double-count; refresh re-establishes document ownership; another tab can close safely.');

  await page.bringToFront(); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#session-phase')).toHaveText('Paused');
  const paused = await elapsed(); await youtube.bringToFront(); await pause(3000);
  assert.equal(await elapsed(), paused);
  await page.bringToFront(); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await youtube.bringToFront(); await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThan(paused);
  checks.push('Explicit pause excludes time on YouTube; Resume re-enables counting.');

  await page.bringToFront(); await page.locator('#edit-plan').click();
  await page.locator('#intention').selectOption('custom');
  await page.locator('#custom-intention').fill('Understand a specific topic');
  await page.locator('#time-target').selectOption('custom');
  await page.locator('#custom-minutes').fill('1.5');
  await page.getByRole('button', { name: 'Save plan' }).click();
  assert.equal((await state()).currentSession.targetMs, 300000);
  await page.locator('#custom-minutes').fill('1');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.locator('#session-intention')).toHaveText('Understand a specific topic');
  let s = await state(); assert.equal(s.currentSession.originalTargetMs, 300000); assert.equal(s.currentSession.targetMs, 60000);
  checks.push('Custom intention and validated custom target update through UI; original target remains intact.');

  // Seed near the target only in this disposable profile; actual pulses cross it.
  await worker.evaluate(async () => {
    const key = 'chrysalis.extension.v1'; const state = (await chrome.storage.local.get(key))[key];
    state.currentSession.elapsedMs = 59000; state.timing.anchor = null; state.sequence++;
    await chrome.storage.local.set({ [key]: state });
  });
  await youtube.bringToFront();
  await expect.poll(async () => (await state()).currentSession.phase, { timeout: 15000 }).toBe('checkpoint');
  await expect(youtube.locator('#chrysalis-extension-indicator')).toContainText('Time target reached');
  await page.bringToFront(); await expect(page.locator('#checkpoint-copy')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss checkpoint' }).click();
  await expect(page.locator('#session-phase')).toHaveText('Active');
  await page.getByRole('button', { name: 'Take a break' }).click();
  await expect(page.locator('#session-phase')).toHaveText('Break');
  const onBreak = await elapsed(); await youtube.bringToFront(); await pause(2500);
  assert.equal(await elapsed(), onBreak);
  await page.bringToFront(); await page.getByRole('button', { name: 'End break', exact: true }).click();
  await expect(page.locator('#session-phase')).toHaveText('Paused');
  await page.getByRole('button', { name: 'Finish session' }).evaluate(button => { button.click(); button.click(); });
  await expect(page.locator('#session-summary')).toBeVisible();
  s = await state(); assert.equal(s.completedSessions.length, 1);
  assert.equal(s.completedSessions[0].originalTargetMs, 300000); assert.equal(s.completedSessions[0].targetMs, 60000);
  checks.push('Real pulses cross a seeded near-target state; Dismissal, voluntary break, early end and duplicate-safe Finish work.');
  await mkdir('test-results', { recursive: true });
  await page.setViewportSize({ width: 375, height: 720 });
  await page.screenshot({ path: 'test-results/session-summary.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

  await page.locator('#time-target').selectOption('none');
  await page.getByRole('button', { name: 'Start another session' }).click();
  await youtube.bringToFront(); await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThan(1000);
  if (process.env.LIVE_YOUTUBE === '1') {
    await context.unroute('https://www.youtube.com/**');
    const live = await context.newPage();
    await live.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await live.bringToFront();
    const liveStart = await elapsed();
    await expect.poll(elapsed, { timeout: 15000 }).toBeGreaterThanOrEqual(liveStart + 2000);
    await expect(live.locator('#chrysalis-extension-indicator')).toContainText('YouTube time');
    await live.screenshot({ path: 'test-results/session-live-youtube.png' });
    checks.push('Live signed-out YouTube homepage: foreground browsing time and session indicator verified.');
  }
  const priorElapsed = await elapsed();
  await context.close(); context = await launch();
  const restoredPage = await context.newPage();
  await restoredPage.goto(`${base}popup.html`);
  await expect(restoredPage.locator('#session-phase')).toHaveText('Paused');
  await expect(restoredPage.locator('#recovery')).toContainText('restored paused');
  const restored = await restoredPage.evaluate(async () => (await chrome.runtime.sendMessage({ channel: 'chrysalis/v1', type: 'GET_SNAPSHOT' })).snapshot);
  assert.equal(restored.currentSession.recoveryReason, 'browser-restart');
  assert(restored.currentSession.elapsedMs >= priorElapsed && restored.currentSession.elapsedMs <= priorElapsed + 5000);
  assert.equal(restored.completedSessions.length, 1);
  checks.push('Full browser restart restores an unfinished session paused, preserves observed time and completed summary.');
  assert.deepEqual(errors, []);
  await writeFile('test-results/session-browser-report.json', JSON.stringify({ browser: version, checks, liveYouTube: process.env.LIVE_YOUTUBE === '1', note: 'Actual extension/Chrome events on origin fixtures; target proximity seeded in temporary profile.' }, null, 2) + '\n');
  console.log(JSON.stringify({ browser: version, checks }, null, 2));
} finally { await context?.close(); await rm(profile, { recursive: true, force: true }); }
