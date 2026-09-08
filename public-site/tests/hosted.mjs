// Read-only platform QA. Never visits APIs, authentication callbacks or real tokens.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = process.env.CHRYSALIS_SITE_URL;
assert(base && new URL(base).protocol === 'https:', 'Set CHRYSALIS_SITE_URL to the HTTPS deployment origin');
const origin = new URL(base).origin;
const out = `test-results/hosted-${new URL(base).hostname}`;
await mkdir(out, { recursive: true });
const report = { origin, checkedAt: new Date().toISOString(), passed: false, routes: [], assets: [], errors: [], externalRequests: [] };
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('request', r => { if (new URL(r.url()).origin !== origin) report.externalRequests.push(new URL(r.url()).origin); });
  const publicRoutes = ['/', '/install', '/privacy', '/contact', '/legacy', '/legacy-account'];
  const legacyRoutes = ['/algorithm', '/reels', '/home', '/community', '/challenges', '/saved', '/search', '/inbox', '/u/launch-check', '/login', '/signup', '/forgot-password', '/reset-password', '/diagnostic', '/study', '/profile', '/profile/edit'];
  for (const route of [...publicRoutes, ...legacyRoutes, '/missing-launch-check']) {
    const response = await page.goto(origin + route);
    if (new URL(page.url()).origin !== origin || (await page.title()).includes('Vercel')) throw new Error('Deployment protection prevents anonymous page inspection');
    const status = route === '/missing-launch-check' ? 404 : 200;
    assert.equal(response.status(), status, route);
    assert.equal(response.headers()['referrer-policy'], 'no-referrer', route);
    assert.equal(response.headers()['x-content-type-options'], 'nosniff', route);
    await expect(page.locator('h1')).toBeVisible();
    if (legacyRoutes.includes(route)) await expect(page.locator('main')).toContainText(/prototype|original/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route);
    assert.equal((await page.reload()).status(), status, `refresh ${route}`);
    report.routes.push({ route, status, refresh: true });
    if (publicRoutes.includes(route)) await page.screenshot({ path: `${out}/mobile-${route.replaceAll('/', '') || 'home'}.png`, fullPage: true });
    for (const href of await page.locator('a[href]').evaluateAll(links => links.map(a => a.getAttribute('href')))) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const target = new URL(href, origin);
      assert(!target.pathname.startsWith('/api/'));
      const res = await context.request.get(target.href);
      assert.equal(res.status(), 200, href);
    }
  }
  await page.goto(origin + '/contact');
  await expect(page.getByRole('link', { name: 'Open the issue tracker' })).toHaveAttribute('href', 'https://github.com/CatInTheRiceHat/Chrysalis/issues');
  await expect(page.getByRole('link', { name: /elaineyouyuanche@gmail.com/ })).toHaveAttribute('href', 'mailto:elaineyouyuanche@gmail.com');
  await page.goto(origin);
  await page.keyboard.press('Tab'); await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
  await page.locator('.menu-toggle').click(); await expect(page.locator('nav')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('.menu-toggle')).toBeFocused();
  for (const width of [760, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.screenshot({ path: `${out}/desktop.png`, fullPage: true });
  await page.locator('.theme-toggle').click(); await page.locator('.theme-toggle').click();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `${out}/desktop-dark.png`, fullPage: true });
  const hash = b => createHash('sha256').update(b).digest('hex');
  for (const asset of ['logo.png', 'Montserrat.ttf', 'AbrilFatface.ttf', 'site.css', 'site.js']) {
    const response = await context.request.get(`${origin}/assets/${asset}`);
    assert.equal(response.status(), 200, asset);
    const digest = hash(await response.body());
    assert.equal(digest, hash(await readFile(`dist/assets/${asset}`)), asset);
    report.assets.push({ asset, sha256: digest });
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.externalRequests, []);
  report.passed = true;
  report.browser = browser.version();
} catch (error) {
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
