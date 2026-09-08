import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const scratch = await mkdtemp(path.join(tmpdir(), 'chrysalis-package-guards-'));
try {
  await cp('dist', scratch, { recursive: true });
  const verify = () => spawnSync(process.execPath, ['scripts/verify-build.mjs', scratch], { encoding: 'utf8' }).status;
  assert.equal(verify(), 0);
  await writeFile(path.join(scratch, '.env'), 'TEST_FIXTURE_ONLY=not-a-secret');
  assert.notEqual(verify(), 0, 'Unexpected development files must reject packaging');
  await rm(path.join(scratch, '.env'));
  const privacy = await readFile(path.join(scratch, 'privacy.html'), 'utf8');
  await writeFile(path.join(scratch, 'privacy.html'), privacy + '\n-----BEGIN PRIVATE KEY-----\nTEST FIXTURE ONLY');
  assert.notEqual(verify(), 0, 'A private-key signature in an allowed file must reject packaging');
  await writeFile(path.join(scratch, 'privacy.html'), privacy);
  await rm(path.join(scratch, 'content.js'));
  assert.notEqual(verify(), 0, 'Missing manifest references must reject packaging');
  console.log('Package guards passed: unexpected development file, credential signature and missing script rejected.');
} finally { await rm(scratch, { recursive: true, force: true }); }
