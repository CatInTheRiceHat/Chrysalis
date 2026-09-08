import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server did not start')), 10000);
    server.on('error', reject);
    server.stdout.on('data', data => { const m = String(data).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) { clearTimeout(timeout); resolve(m[0]); } });
  });
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: 'light' });
  const page = await context.newPage(), errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith(base)) external.push(r.url()); });
  await mkdir('test-results', { recursive: true });
  for (const route of ['/', '/install', '/privacy', '/contact', '/legacy']) {
    const response = await page.goto(`${base}${route}`); assert.equal(response.status(), 200);
    await expect(page.locator('h1')).toBeVisible();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route);
    await page.screenshot({ path: `test-results/mobile-${route.replaceAll('/', '') || 'home'}.png`, fullPage: true });
  }
  await page.goto(base);
  await page.keyboard.press('Tab'); await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
  await page.locator('.menu-toggle').click(); await expect(page.locator('nav')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('nav')).toBeHidden(); await expect(page.locator('.menu-toggle')).toBeFocused();
  await page.locator('.menu-toggle').click(); await page.locator('nav').getByRole('link', { name: 'Install', exact: true }).click();
  await expect(page).toHaveURL(`${base}/install`);
  await page.getByText('Build from source instead', { exact: true }).click(); await expect(page.locator('pre')).toBeVisible();
  await page.locator('.theme-toggle').click(); await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(base);
  await expect(page.locator('nav')).toBeVisible();
  await page.screenshot({ path: 'test-results/desktop-dark.png', fullPage: true });
  await page.locator('.theme-toggle').click(); await page.locator('.theme-toggle').click();
  await page.screenshot({ path: 'test-results/desktop-light.png', fullPage: true });
  await page.setViewportSize({ width: 760, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.goto(`${base}/contact`);
  await expect(page.getByRole('link', { name: 'Open the issue tracker' })).toHaveAttribute('href', 'https://github.com/CatInTheRiceHat/Chrysalis/issues');
  await expect(page.getByRole('link', { name: /elaineyouyuanche@gmail.com/ })).toHaveAttribute('href', 'mailto:elaineyouyuanche@gmail.com');
  const missing = await page.goto(`${base}/missing-page`); assert.equal(missing.status(), 404);
  await expect(page.getByRole('link', { name: 'Meet Chrysalis' })).toBeVisible();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await writeFile('test-results/browser-report.json', JSON.stringify({ browser: browser.version(), passed: true, routes: 5, checks: ['375/760/1440px without horizontal overflow', 'keyboard skip link and menu/Escape', 'persistent light/dark themes', 'install source disclosure', 'contact destinations', '404 recovery', 'zero external page requests'], limitations: ['Email link verified against repository and markup, not delivery.', 'No human screen-reader test.'] }, null, 2));
  console.log('Public-site browser checks passed.');
} finally { await browser?.close(); server.kill(); }
