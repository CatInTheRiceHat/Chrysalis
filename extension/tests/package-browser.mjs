// Run the existing lifecycle suites on bytes extracted from the distribution ZIP.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const stem = `release/chrysalis-${version}`;
const report = JSON.parse(await readFile(`${stem}-build-manifest.json`, 'utf8'));
const hash = data => createHash('sha256').update(data).digest('hex');
assert.equal(hash(await readFile(`${stem}.zip`)), report.sha256);
const unpacked = path.resolve(`${stem}-unpacked`);
for (const [file, digest] of Object.entries(report.files)) {
  assert.equal(hash(await readFile(path.join(unpacked, file))), digest);
  assert.equal(hash(await readFile(path.join('dist', file))), digest);
}
assert.equal(spawnSync(process.execPath, ['scripts/verify-build.mjs', unpacked], { stdio: 'inherit' }).status, 0);
const suites = ['integrated-browser', 'browser', 'session-browser', 'viewing-browser', 'experience-browser', 'checkpoints-browser', 'history-browser', 'hardening-browser', 'usability-browser', 'usability-native'];
for (const suite of suites) {
  console.log(`Packaged-extension verification: ${suite}`);
  const result = spawnSync(process.execPath, [`tests/${suite}.mjs`], { stdio: 'inherit', env: { ...process.env, CHRYSALIS_EXTENSION_PATH: unpacked, CHRYSALIS_USABILITY_OUTPUT: path.resolve('test-results/usability') } });
  assert.equal(result.status, 0, `Packaged extension failed ${suite}`);
}
await writeFile(`${stem}-validation.json`, JSON.stringify({ version, sourceRevision: report.sourceRevision, sourceTreeSha256: report.sourceTreeSha256, sourceDirty: report.sourceDirty, zipSha256: report.sha256, verifiedAt: new Date().toISOString(), unpacked, passedSuites: suites, evidence: 'Real unpacked extension loaded from ZIP-extracted assets in disposable Chromium profiles. Controlled YouTube-origin fixtures; live selector evidence is separate.' }, null, 2) + '\n');
console.log(`All ${suites.length} suites passed against the extracted distribution ZIP.`);
