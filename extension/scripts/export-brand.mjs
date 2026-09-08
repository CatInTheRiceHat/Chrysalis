// Render existing brand assets at standard icon sizes; no generated artwork.
// Run only when refreshing checked-in exports; production builds need no browser.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
const logo = (await readFile('static/assets/logo.png')).toString('base64');
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [16, 32, 48, 128]) {
    const art = size === 128 ? 100 : Math.round(size * 100 / 128);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent;display:grid;place-items:center;width:${size}px;height:${size}px"><img alt="" src="data:image/png;base64,${logo}" width="${art}" height="${art}"></body></html>`);
    await page.locator('img').evaluate(img => img.decode());
    await page.screenshot({ path: `static/icons/icon-${size}.png`, omitBackground: true });
  }
  await mkdir('distribution/artwork', { recursive: true });
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(`<html><body style="margin:0;width:440px;height:280px;background:#221c30;display:grid;place-items:center"><img alt="" src="data:image/png;base64,${logo}" width="150" height="150"></body></html>`);
  await page.locator('img').evaluate(img => img.decode());
  await page.screenshot({ path: 'distribution/artwork/promo-440x280.png' });
} finally { await browser.close(); }
