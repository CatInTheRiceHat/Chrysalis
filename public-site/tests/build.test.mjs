import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const routes = ['/', '/install', '/privacy', '/contact', '/legacy', '/legacy-account'];
test('every public route renders standalone HTML with a single primary heading and reachable local links', async () => {
  for (const route of routes) {
    const html = await readFile(`dist${route}/index.html`, 'utf8');
    assert.equal((html.match(/<h1[> ]/g) ?? []).length, 1, route);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /id="main"/);
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!href.startsWith('/')) continue;
      const [url, anchor] = href.split('#');
      let target = `dist${url}`;
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      assert((await stat(target)).size > 0, href);
      if (anchor) assert((await readFile(target, 'utf8')).includes(`id="${anchor}"`), href);
    }
    assert.doesNotMatch(html, /VITE_|supabase|\/api\/|<iframe|googletagmanager|chromewebstore\.google\.com/);
  }
});
test('privacy and installation disclose preview status, timing, retention and update limitations', async () => {
  const install = await readFile('dist/install/index.html', 'utf8');
  for (const text of ['Load unpacked', 'Every new session needs a time target', 'Version 0.9.2', 'Reload', 'not published']) assert(install.includes(text), text);
  const privacy = await readFile('dist/privacy/index.html', 'utf8');
  for (const text of ['100 completed', 'not encrypted', 'Delete all', '30 minutes', 'AES-256-GCM', 'hosting provider']) assert(privacy.includes(text), text);
  const assets = await readdir('dist/assets');
  assert(assets.includes('Montserrat-OFL.txt')); assert(assets.includes('AbrilFatface-OFL.txt'));
});
