/**
 * Ten-post feed QA with local fixtures (no backend required).
 * Start: VITE_SKIP_AUTH=true npm run dev -- --host 127.0.0.1 --port 4318
 * Run: npm run qa:feed-batches -- http://127.0.0.1:4318
 * Optional: CHROME_PATH=/path/to/chrome when Playwright browsers aren't installed.
 */
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const baseURL = process.argv[2] || 'http://127.0.0.1:4318';
const fixture = (start, count) => Array.from({ length: count }, (_, offset) => ({
  youtube_id: `csl-batch-${start + offset}`,
  title: `Sample post ${start + offset}`,
  channel_title: `Fictional studio ${Math.floor((start + offset) / 4) % 3}`,
  short_description: 'Bundled browser test content.',
}));

try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('chrysalis-algorithm-onboarded', '1');
      localStorage.setItem('chrysalis-algorithm-mode', 'flutter-feed');
    });
    const requests = [];
    let failNext = true;
    let offline = false;
    await page.route('**/api/feed/**', async route => {
      const params = new URL(route.request().url()).searchParams;
      requests.push(params);
      const excluded = (params.get('exclude_ids') || '').split(',').filter(Boolean);
      assert.equal(params.get('k'), '10');
      if (offline || (excluded.length === 10 && failNext)) {
        failNext = false;
        await route.fulfill({ status: 503, json: { error: 'Test network failure' } });
        return;
      }
      // Hold the request briefly to exercise duplicate-click protection.
      await new Promise(resolve => setTimeout(resolve, 150));
      await route.fulfill({ json: {
        items: fixture(excluded.length + 1, excluded.length === 20 ? 2 : 10),
        has_more: excluded.length < 20,
      } });
    });
    // Keep any existing event calls inside this isolated test.
    await page.route('**/api/events**', route => route.fulfill({ json: {} }));
    await page.goto(baseURL);
    const cards = page.locator('.reel-card');
    const titles = () => cards.evaluateAll(nodes => nodes.map(node => node.querySelector('.reel-title-clamp')?.textContent));
    const endpoint = page.getByRole('region', { name: 'End of this batch' });
    const load = page.getByRole('button', { name: 'Load 10 more', exact: true });
    await expect(cards).toHaveCount(10);
    await expect(load).toBeEnabled();
    const details = viewport.width < 768
      ? page.getByRole('button', { name: 'Open feed details', exact: true })
      : page.getByRole('button', { name: /^Your intention:/ }).filter({ visible: true });
    await details.click();
    await page.getByRole('button', { name: 'More variety', exact: true }).click();
    await page.getByRole('button', { name: 'Close feed details', exact: true }).last().click();
    const firstBatchTitles = await titles();
    const initialRequests = requests.length;
    await endpoint.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    assert.equal(requests.length, initialRequests, 'scrolling must not request more posts');
    await load.click();
    await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
    await expect(cards).toHaveCount(10);
    await page.getByRole('button', { name: 'Try again', exact: true }).evaluate(button => {
      button.click();
      button.click();
    });
    await expect(cards).toHaveCount(20);
    assert.equal(requests.length, initialRequests + 2, 'only the failed request and one retry');
    assert.equal(requests.at(-1).get('exclude_ids').split(',').length, 10);
    assert.deepEqual((await titles()).slice(0, 10), firstBatchTitles,
      'preference tuning must not reshuffle the previous batch when more posts arrive');
    await expect(cards.nth(10)).toBeFocused();
    await expect(cards.nth(10)).toBeInViewport({ ratio: 0.5 });
    await endpoint.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    assert.equal(requests.length, initialRequests + 2);
    await load.click();
    await expect(cards).toHaveCount(22);
    await expect(load).toHaveCount(0);
    await endpoint.scrollIntoViewIfNeeded();
    await expect(endpoint).toContainText('There are no more fresh posts');
    assert.equal(new Set(await titles()).size, 22);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `/tmp/chrysalis-batch-end-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Refresh feed', exact: true }).click();
    await expect(cards).toHaveCount(10);
    assert.equal(requests.at(-1).get('exclude_ids'), null, 'refresh starts a fresh batch');
    offline = true;
    await page.reload();
    await expect(endpoint).toContainText('These are sample posts');
    await expect(load).toHaveCount(0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}px: explicit batches, retry, double click, focus, final partial batch, refresh, offline fallback`);
    await context.close();
  }
} finally {
  await browser.close();
}
