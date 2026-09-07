import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.externally_connectable, undefined);
assert.deepEqual(manifest.content_scripts[0].matches, ['https://www.youtube.com/*']);
const files = new Set([
  manifest.background.service_worker, manifest.action.default_popup, manifest.options_ui.page,
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap(script => [...script.js, ...(script.css ?? [])]),
]);
for (const html of [manifest.action.default_popup, manifest.options_ui.page]) {
  const source = await readFile(`dist/${html}`, 'utf8');
  assert.doesNotMatch(source, /\son\w+=|<script(?![^>]*\bsrc=)[^>]*>/i);
  for (const [, ref] of source.matchAll(/(?:src|href)="([^"]+)"/g)) if (!ref.startsWith('#')) files.add(ref.split('#')[0]);
}
const css = await readFile('dist/styles.css', 'utf8');
for (const [, ref] of css.matchAll(/url\('([^']+)'\)/g)) if (!ref.startsWith('#')) files.add(ref.split('#')[0]);
for (const file of files) {
  assert(!file.includes('..') && !file.includes(':'), `Non-local path: ${file}`);
  assert((await stat(path.join('dist', file))).size > 0, `Missing/empty: ${file}`);
}
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = await readFile(`dist/${file}`);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
for (const script of ['background.js', 'content.js', 'page.js']) {
  assert.doesNotMatch(await readFile(`dist/${script}`, 'utf8'), /\beval\s*\(|new Function\s*\(|import\s*\(/);
}
console.log(`Build verified: ${files.size} local manifest/page/style references, valid PNG icon, scoped permissions and bundled scripts.`);
