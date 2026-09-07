import test from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, createStore } from '../src/shared/storage';
import { defaultSnapshot, type StorageSnapshot } from '../src/shared/types';
import { snapshot } from '../src/shared/validation';

function memory(initial?: unknown) {
  let disk = structuredClone(initial);
  let fail = false;
  let writes = 0;
  const adapter = {
    async read() { return structuredClone(disk); },
    async write(value: StorageSnapshot) {
      await new Promise(resolve => setTimeout(resolve, 2));
      if (fail) throw new Error('Disk unavailable');
      disk = structuredClone(value); writes++;
    },
  };
  return { adapter, disk: () => disk, writes: () => writes, fail: (value: boolean) => { fail = value; } };
}
test('initialization creates defaults once and preserves existing data on later worker starts', async () => {
  const m = memory();
  const store = createStore(m.adapter);
  await store.initialize();
  await store.updateSettings({ theme: 'dark' }, 0);
  await createStore(m.adapter).initialize();
  assert.equal(m.writes(), 2);
  assert.equal((await createStore(m.adapter).read()).settings.theme, 'dark');
});
test('competing stale updates cannot overwrite another window or duplicate a mutation', async () => {
  const m = memory(defaultSnapshot());
  const store = createStore(m.adapter);
  const results = await Promise.allSettled([
    store.updateSettings({ theme: 'dark' }, 0),
    store.updateSettings({ showIndicator: false }, 0),
    store.updateSettings({ theme: 'dark' }, 0),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await store.read()).revision, 1);
  await assert.rejects(store.updateSettings({ showIndicator: false }, 0), ConflictError);
  await store.updateSettings({ showIndicator: false }, 1);
  assert.deepEqual((await store.read()).settings, { ...defaultSnapshot().settings, theme: 'dark', showIndicator: false });
});
test('storage failures reject without claiming a save and do not poison the mutation queue', async () => {
  const m = memory(defaultSnapshot());
  const store = createStore(m.adapter);
  m.fail(true);
  await assert.rejects(store.updateSettings({ theme: 'dark' }, 0));
  assert.equal((await store.read()).revision, 0);
  m.fail(false);
  await store.updateSettings({ theme: 'light' }, 0);
  assert.equal((await store.read()).settings.theme, 'light');
});
test('unsupported or malformed saved data is preserved, never replaced with defaults', async () => {
  for (const data of [{ ...defaultSnapshot(), schemaVersion: 5 }, { ...defaultSnapshot(), settings: {} }, null]) {
    const m = memory(data);
    const store = createStore(m.adapter);
    await assert.rejects(store.initialize());
    await assert.rejects(store.updateSettings({ theme: 'dark' }, 0));
    assert.deepEqual(m.disk(), data);
    assert.equal(m.writes(), 0);
  }
});
test('settings edits preserve current session and completed summaries with original targets', async () => {
  const data = defaultSnapshot();
  const details = { id: 'local-id', intention: 'Explore', startedAt: 100, originalTargetMs: 300_000, targetMs: null, elapsedMs: 120_000 };
  data.currentSession = { ...details, phase: 'paused', goalAcknowledged: false, breakUntil: null, finishedAt: null, recoveryReason: null };
  data.completedSessions = [{ ...details, finishedAt: 200_000, reflection: null }];
  const store = createStore(memory(data).adapter);
  await store.updateSettings({ theme: 'dark' }, 0);
  const result = await store.read();
  assert.deepEqual(result.currentSession, data.currentSession);
  assert.deepEqual(result.completedSessions, data.completedSessions);
  result.settings.theme = 'light';
  assert.equal((await store.read()).settings.theme, 'dark');
});
test('schema validation rejects invalid sessions, summaries, and unknown stored fields', () => {
  assert.equal(snapshot(defaultSnapshot()), true);
  assert.equal(snapshot({ ...defaultSnapshot(), secret: 'unexpected' }), false);
  assert.equal(snapshot({ ...defaultSnapshot(), currentSession: { phase: 'active' } }), false);
  assert.equal(snapshot({ ...defaultSnapshot(), completedSessions: [{}] }), false);
  assert.equal(snapshot({ ...defaultSnapshot(), revision: -1 }), false);
  assert.equal(snapshot({ ...defaultSnapshot(), settings: { showIndicator: true, theme: 'unsupported' } }), false);
});
