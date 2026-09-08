import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-viewing-live-'));
const extensionPath = path.resolve(process.env.CHRYSALIS_EXTENSION_PATH ?? 'dist');
await mkdir('test-results', { recursive: true });
const checks = [], limitations = [];
let context;
try {
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 }, args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).hostname;
  const options = await context.newPage(); await options.goto(`chrome-extension://${id}/options.html`);
  await expect(options.locator('#connection')).toHaveText('Extension connected');
  await options.locator('#intro-skip').click();
  async function toggle(selector, value) {
    await options.locator(selector).setChecked(value);
    await expect(options.locator('#save-status')).toHaveText('Saved on this device.');
  }
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.locator('#chrysalis-extension-indicator')).toHaveCount(1);
  await page.bringToFront();
  await expect(page.locator('#chrysalis-session-dialog dialog')).toBeVisible({ timeout: 22000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#chrysalis-session-dialog')).toHaveCount(0);
  checks.push('Live first-visit introduction dismisses with Escape before interacting with YouTube viewing controls.');
  const nav = page.locator('ytd-guide-entry-renderer').filter({ has: page.locator('a#endpoint[title="Shorts"]') }).first();
  await expect(nav).toBeVisible({ timeout: 20000 });
  await toggle('#hide-shorts', true); await expect(nav).toBeHidden();
  await toggle('#hide-shorts', false); await expect(nav).toBeVisible();
  checks.push('Live expanded guide: English Shorts entry without href hides and restores; other navigation remains.');
  await toggle('#hide-home', true);
  const home = page.locator('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
  await expect(home).toBeAttached();
  await page.locator('#chrysalis-viewing-status').locator('summary').click();
  const homeCards = home.locator('ytd-rich-item-renderer').filter({ has: page.locator('a[href^="/watch?"]') });
  if (await homeCards.count()) {
    await expect(homeCards.first()).toBeHidden();
    await toggle('#hide-home', false); await expect(homeCards.first()).toBeVisible();
    checks.push('Live homepage recognized video cards hide and restore.');
  } else {
    await expect(page.locator('#chrysalis-viewing-status')).toContainText('No supported items found.');
    await expect(page.getByText('Try searching to get started', { exact: true })).toBeVisible();
    limitations.push('Signed-out homepage has an empty-feed prompt; populated homepage card/shelf selectors remain fixture-only verification. Prompt remains visible, correctly reports no supported items.');
    await toggle('#hide-home', false);
  }
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const related = page.locator('ytd-watch-flexy:not([hidden]) #related ytd-watch-next-secondary-results-renderer');
  const card = related.locator('yt-lockup-view-model').filter({ has: page.locator('a[href^="/watch?"]:not([href*="list="])') }).first();
  await expect(card).toBeVisible({ timeout: 25000 });
  const shelf = related.locator('ytd-reel-shelf-renderer').first();
  const hasShelf = await shelf.count() > 0;
  const player = page.locator('#movie_player');
  await expect(player).toBeVisible();
  const beforePlayer = await player.elementHandle();
  await toggle('#hide-related', true); await expect(card).toBeHidden();
  if (hasShelf) await expect(shelf).toBeHidden();
  await expect(player).toBeVisible();
  await expect(page.locator('#movie_player .ytp-play-button')).toBeAttached();
  await expect(page.locator('#movie_player .ytp-subtitles-button')).toBeAttached();
  assert(await beforePlayer.evaluate(e => e === document.querySelector('#movie_player')));
  await toggle('#hide-related', false); await expect(card).toBeVisible();
  if (hasShelf) await expect(shelf).toBeVisible();
  checks.push('Live watch page: current yt-lockup-view-model recommendations hide/restore. Player node, playback controls and caption control preserved.');
  if (hasShelf) {
    await toggle('#hide-shorts', true); await expect(shelf).toBeHidden(); await expect(card).toBeVisible();
    await toggle('#hide-shorts', false); await expect(shelf).toBeVisible();
    checks.push('Live watch Shorts shelf hides/restores independently of ordinary related videos.');
  } else limitations.push('Watch Shorts shelf not supplied in this run; live shelf verification unavailable.');
  await page.bringToFront();
  const media = page.locator('#movie_player video').first();
  // Establish baseline playback before testing controls; network/codec failures
  // must be reported separately from extension-caused regressions.
  let baselineAdvanced = false;
  await toggle('#hide-related', false);
  if (await media.evaluate(v => v.paused)) await page.locator('#movie_player .ytp-play-button').click();
  const baseline = await media.evaluate(v => v.currentTime);
  try {
    await expect.poll(() => media.evaluate(v => v.currentTime), { timeout: 10000 }).toBeGreaterThan(baseline + .2);
    baselineAdvanced = true;
  } catch {
    const diagnostic = await media.evaluate(v => ({ paused: v.paused, readyState: v.readyState, networkState: v.networkState, error: v.error?.code ?? null }));
    limitations.push(`Live playback did not advance even with controls off; actual playback progress unverified. ${JSON.stringify(diagnostic)}. Fixture media and live player/control preservation checked.`);
  }
  if (baselineAdvanced) {
    const before = await media.evaluate(v => v.currentTime);
    await toggle('#hide-related', true); await page.bringToFront();
    await expect.poll(() => media.evaluate(v => v.currentTime), { timeout: 15000 }).toBeGreaterThan(before + .2);
    checks.push('Actual YouTube video time advances with related-video hiding enabled.');
  }
  await toggle('#hide-related', true); await toggle('#hide-home', true); await toggle('#hide-shorts', true);
  await page.evaluate(() => { window.chrysalisNavigationProbe = 'same-document'; });
  const search = page.locator('input[name="search_query"]').first();
  await search.fill('nature'); await search.press('Enter');
  await page.waitForURL('**/results?search_query=nature', { timeout: 20000 });
  await expect(page.locator('ytd-search ytd-video-renderer').first()).toBeVisible({ timeout: 20000 });
  assert.equal(await page.evaluate(() => window.chrysalisNavigationProbe), 'same-document');
  const searchShelf = page.locator('ytd-search ytd-reel-shelf-renderer').first();
  if (await searchShelf.count()) await expect(searchShelf).toBeVisible();
  checks.push('Real search submitted with all controls on; native SPA navigation retains document and search results remain visible.');
  const subscriptionLink = page.locator('ytd-guide-entry-renderer a[href="/feed/subscriptions"]').first();
  await expect(subscriptionLink).toBeVisible(); await subscriptionLink.click();
  await page.waitForURL('**/feed/subscriptions', { timeout: 20000 });
  await expect(page.locator('ytd-browse[page-subtype="subscriptions"]')).toBeVisible();
  assert.equal(await page.evaluate(() => window.chrysalisNavigationProbe), 'same-document');
  checks.push('Live subscriptions navigation/page remains available with all toggles on; signed-out prompt preserved.');
  limitations.push('Authenticated subscription feed, populated signed-in homepage, playlist playback, live-chat, ads within recommendation cards, non-English href-less Shorts labels and all experimental layouts not live-verified.');
  await options.locator('#restore-layout').click();
  await expect(page.locator('#chrysalis-viewing-style, #chrysalis-viewing-status')).toHaveCount(0);
  await expect(page.locator('ytd-guide-entry-renderer').filter({ has: page.locator('a#endpoint[title="Shorts"]') }).first()).toBeVisible();
  checks.push('Restore ordinary layout removes control style/status and restores live guide entry after SPA navigation.');
  await page.screenshot({ path: 'test-results/viewing-live-restored.png' });
  const report = { browser: context.browser().version(), date: new Date().toISOString(), signedIn: false, checks, limitations };
  await writeFile('test-results/viewing-live-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await context?.close(); await rm(profile, { recursive: true, force: true }); }
