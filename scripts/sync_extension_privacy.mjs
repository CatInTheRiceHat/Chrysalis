// Explicit authoring utility; neither independent product build imports its sibling.
// Keep extension/PRIVACY.md authoritative and checked-in HTML copies synchronized.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(`${root}extension/PRIVACY.md`, 'utf8');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const inline = s => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
const blocks = source.trim().split(/\n\s*\n/).slice(1);
const body = blocks.map(block => {
  if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
  if (block.startsWith('- ')) return '<ul>' + block.split(/\n(?=- )/).map(item => `<li>${inline(item.slice(2).replace(/\n\s*/g, ' '))}</li>`).join('') + '</ul>';
  return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
}).join('\n');
const offline = `<!doctype html><html lang="en" data-theme="system"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chrysalis privacy</title><link rel="stylesheet" href="styles.css"></head><body class="options"><main class="settings-shell privacy"><h1>Chrysalis privacy explanation</h1>\n${body}\n<p><a href="options.html#data">Back to settings and data controls</a></p></main></body></html>\n`;
for (const [file, text] of [['extension/static/privacy.html', offline], ['public-site/src/privacy.html', body + '\n']]) {
  if (process.argv.includes('--check')) assert.equal(await readFile(root + file, 'utf8'), text, `${file} differs; run node scripts/sync_extension_privacy.mjs`);
  else await writeFile(root + file, text);
}
console.log('Privacy markdown, packaged page and public-site copy agree.');
