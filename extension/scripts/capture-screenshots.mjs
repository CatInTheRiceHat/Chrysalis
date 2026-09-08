// Screenshots of actual extension contexts, from the extracted distribution ZIP.
// No seeded session records, DOM replacements, composite UI or participant data.
import { chromium, expect } from '@playwright/test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const extension = path.resolve(`release/chrysalis-${version}-unpacked`);
const profile = await mkdtemp(path.join(tmpdir(), 'chrysalis-captures-'));
const output = 'distribution/screenshots'; await mkdir(output, { recursive: true });
let context;
const captures = [], checks = [], limitations = [];
try {
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const base = `chrome-extension://${new URL(worker.url()).hostname}/`;
  const popup = await context.newPage(); await popup.setViewportSize({ width: 375, height: 850 });
  await popup.goto(`${base}popup.html`); await expect(popup.locator('#intro-skip')).toBeVisible();
  async function capture(page, file, description, storeCandidate = false) {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/${file}` });
    captures.push({ file, description, storeCandidate, width: page.viewportSize().width, height: page.viewportSize().height,
      sha256: createHash('sha256').update(await readFile(`${output}/${file}`)).digest('hex') });
  }
  await capture(popup, 'onboarding.png', 'Actual popup document at 375px, opened as an extension page; native toolbar chrome is not depicted.');
  await popup.locator('#intro-skip').click();
  const settings = await context.newPage(); await settings.goto(`${base}options.html#viewing`);
  await settings.locator('#hide-shorts').check(); await expect(settings.locator('#save-status')).toHaveText('Saved on this device.');
  await settings.locator('#viewing').scrollIntoViewIfNeeded();
  await capture(settings, '01-viewing-settings.png', 'Actual viewing preferences with Shorts entry-point hiding chosen during this capture.', true);
  await settings.getByRole('link', { name: 'Read the full local privacy explanation' }).click();
  await expect(settings.getByRole('heading', { name: 'Chrysalis privacy explanation' })).toBeVisible();
  await expect(settings.locator('body')).toContainText('not encrypted');
  checks.push('The packaged privacy page opens from settings and renders the actual local-data explanation.');
  await settings.goto(`${base}options.html#history`);
  await popup.bringToFront(); await popup.locator('#intention').selectOption('Exploring');
  await popup.locator('#time-target').selectOption('custom'); await popup.locator('#custom-minutes').fill('1'); await popup.locator('#submit-plan').click();
  await expect(popup.locator('#session-phase')).toHaveText('Active');
  // Make explicit revisions through the real form; history must reflect these actions.
  for (const minutes of ['2', '1']) {
    await popup.locator('#edit-plan').click(); await popup.locator('#time-target').selectOption('custom');
    await popup.locator('#custom-minutes').fill(minutes); await popup.locator('#submit-plan').click();
  }
  const live = await context.newPage();
  await live.goto('https://www.youtube.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const indicator = live.locator('#chrysalis-extension-indicator');
  await expect(indicator).toBeVisible({ timeout: 25000 }); await live.bringToFront();
  const state = () => popup.evaluate(async () => { const r = await chrome.runtime.sendMessage({ channel: 'chrysalis/v1', type: 'GET_SNAPSHOT' }); if (!r.ok) throw Error(r.error); return r.snapshot; });
  await expect.poll(async () => (await state()).currentSession.elapsedMs, { timeout: 15000 }).toBeGreaterThanOrEqual(2000);
  await indicator.scrollIntoViewIfNeeded();
  await capture(live, '02-live-youtube-session.png', 'Actual signed-out YouTube homepage with a live foreground session; no YouTube page content was substituted.', true);
  console.log('Capturing a real one-minute foreground session; waiting for its checkpoint.');
  await expect.poll(async () => (await state()).currentSession.phase, { timeout: 80000, intervals: [1000] }).toBe('checkpoint');
  await indicator.scrollIntoViewIfNeeded();
  await capture(live, '03-live-checkpoint.png', 'Actual checkpoint reached after one measured minute; elapsed state was not seeded or fabricated.', true);
  await popup.bringToFront(); await popup.locator('#additional-duration').selectOption('custom'); await popup.locator('#additional-minutes').fill('1');
  await popup.locator('[data-choice="extend"]').click();
  await popup.locator('#break-duration').selectOption('custom'); await popup.locator('#break-minutes').fill('1'); await popup.locator('[data-choice="break"]').click();
  await expect(popup.locator('#session-phase')).toHaveText('Break');
  await capture(popup, 'break-popup.png', 'Actual voluntary break in the popup document, opened as a page; excluded from store-sized screenshots.');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await popup.locator('[data-action="end-break"]').click(); await popup.locator('[data-action="finish"]').click();
  await expect(popup.locator('#session-reflection')).toBeVisible();
  await capture(popup, 'reflection-popup.png', 'Actual optional reflection after this automated test session; no answer, note or participant finding is invented.');
  await popup.locator('#session-reflection [data-skip]').click();
  const saved = (await state()).completedSessions[0];
  assert(saved.elapsedMs >= 60000); assert(saved.history.breakMs >= 2000); assert.equal(saved.reflection, null);
  await settings.bringToFront(); await settings.locator('#history').scrollIntoViewIfNeeded();
  await expect(settings.locator('.history-entry')).toHaveCount(1);
  await capture(settings, '04-local-history.png', 'A real record created by the preceding automated session actions; not participant data or research evidence.', true);
  checks.push('Real foreground pulses reached a checkpoint on live YouTube; UI target revisions, added time, voluntary break, finish and Skip produced the photographed history record.');
  limitations.push('Signed-out Home only; native toolbar popover, authenticated feeds and all experimental layouts are not established by these captures.');
  await writeFile(`${output}/capture-report.json`, JSON.stringify({ version, browser: context.browser().version(), capturedAt: new Date().toISOString(), source: extension, captures, checks, limitations }, null, 2) + '\n');
  console.log(`Saved ${captures.length} actual screenshots to ${output}.`);
} finally { await context?.close(); await rm(profile, { recursive: true, force: true, maxRetries: 3 }); }
