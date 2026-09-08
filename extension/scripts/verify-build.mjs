import { readFile, stat, readdir, lstat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const expectedFiles = JSON.parse(await readFile('scripts/package-files.json', 'utf8')).sort();
async function inventory(dir, prefix = '') {
  const files = [];
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name), info = await lstat(file);
    assert(!info.isSymbolicLink(), `Symlinks cannot be packaged: ${prefix}${name}`);
    if (info.isDirectory()) files.push(...await inventory(file, `${prefix}${name}/`));
    else { assert(info.isFile()); files.push(`${prefix}${name}`); }
  }
  return files.sort();
}
assert.deepEqual(await inventory(root), expectedFiles, 'Unexpected or missing production assets');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(manifest.version, pkg.version);
assert(manifest.description.length <= 132);
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.externally_connectable, undefined);
assert.equal(manifest.web_accessible_resources, undefined);
assert.equal(manifest.content_security_policy.extension_pages, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
assert.deepEqual(manifest.content_scripts[0].matches, ['https://www.youtube.com/*']);
assert.equal(manifest.content_scripts[0].run_at, 'document_start');
assert.equal(manifest.content_scripts[0].all_frames, false);
const files = new Set([
  manifest.background.service_worker, manifest.action.default_popup, manifest.options_ui.page,
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap(script => [...script.js, ...(script.css ?? [])]),
]);
for (const html of expectedFiles.filter(file => file.endsWith('.html'))) {
  const source = await readFile(path.join(root, html), 'utf8');
  assert.doesNotMatch(source, /\son\w+=|<script(?![^>]*\bsrc=)[^>]*>/i);
  for (const [, ref] of source.matchAll(/(?:src|href)="([^"]+)"/g)) if (!ref.startsWith('#')) files.add(ref.split('#')[0]);
}
const css = await readFile(path.join(root, 'styles.css'), 'utf8');
for (const [, ref] of css.matchAll(/url\('([^']+)'\)/g)) if (!ref.startsWith('#')) files.add(ref.split('#')[0]);
for (const file of files) {
  assert(!file.includes('..') && !file.includes(':'), `Non-local path: ${file}`);
  assert((await stat(path.join(root, file))).size > 0, `Missing/empty: ${file}`);
}
assert(manifest.icons['128'], 'Store package needs a 128px icon');
for (const [size, file] of Object.entries(manifest.icons)) {
  const png = await readFile(path.join(root, file));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), Number(size));
  assert.equal(png.readUInt32BE(20), Number(size));
}
for (const script of ['background.js', 'content.js', 'page.js']) {
  assert.doesNotMatch(await readFile(path.join(root, script), 'utf8'), /\beval\s*\(|new Function\s*\(|import\s*\(/);
  assert.doesNotMatch(await readFile(path.join(root, script), 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|storage\.sync/, 'Unexpected runtime network/sync code');
}
assert((await readFile(path.join(root, 'privacy.html'), 'utf8')).includes(`local preview ${pkg.version}`), 'Privacy version must match the release');
for (const file of expectedFiles) {
  const bytes = await readFile(path.join(root, file));
  assert.doesNotMatch(bytes.toString('utf8'), /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bAIza[A-Za-z0-9_-]{35}\b/, `Credential signature in ${file}`);
}
console.log(`Build verified: ${expectedFiles.length} allowed assets, ${files.size} local references, valid PNG icons, scoped permissions and bundled scripts (${root}).`);
