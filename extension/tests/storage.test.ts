import test from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, createStore } from '../src/shared/storage';
import { defaultSnapshot, emptyHistoryDetails, type StorageSnapshot } from '../src/shared/types';
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
  for (const data of [{ ...defaultSnapshot(), schemaVersion: 99 }, { ...defaultSnapshot(), settings: {} }, null]) {
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
  const details = { history: emptyHistoryDetails(), id: 'local-id', intention: 'Explore', startedAt: 100, originalTargetMs: 300_000, targetMs: null, elapsedMs: 120_000 };
  data.currentSession = { ...details, phase: 'paused', goalAcknowledged: false, breakUntil: null, breakStartedAt: null, finishedAt: null, recoveryReason: null };
  data.completedSessions = [{ ...details, finishedAt: 200_000, reflection: null, reflectionPrompted: false }];
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

test('valid schema 5 upgrades without losing history, settings, or unfinished session data', async () => {
  const source = createStore(memory(defaultSnapshot()).adapter);
  let n = 0;
  const command = async (command: Parameters<typeof source.execute>[0]['command']) => {
    const s = await source.read();
    return source.execute({ requestId: `upgrade-${++n}`, expectedRevision: s.sessionRevision, expectedSessionId: s.currentSession.phase === 'idle' ? null : s.currentSession.id, command });
  };
  await command({ action: 'start', plan: { intention: 'Stored intention', targetMs: 300000 } });
  await command({ action: 'edit', plan: { intention: 'Revised intention', targetMs: null } });
  await command({ action: 'finish' });
  let current = await source.read();
  await source.changeHistory(current.completedSessions[0]!.id, current.historyRevision, { action: 'reflect', reflection: { answer: 'partly', note: 'Stored note' } });
  await command({ action: 'start', plan: { intention: 'Unfinished plan', targetMs: null } });
  current = await source.read(); current.settings.hideShortsEntries = true;
  const legacy = { ...current, schemaVersion: 5, settings: { ...current.settings } };
  delete (legacy.settings as Partial<typeof current.settings>).extensionPaused;
  const m = memory(legacy); const store = createStore(m.adapter);
  const upgraded = await store.read();
  assert.deepEqual(upgraded, { ...current, sequence: current.sequence + 1 });
  await store.read(); assert.equal(m.writes(), 1);
});
test('repeated read-only renders and paused observations do not repeatedly persist snapshots', async () => {
  const m = memory(defaultSnapshot()); const store = createStore(m.adapter);
  await store.updateSettings({ extensionPaused: true }, 0);
  const writes = m.writes();
  for (let i = 0; i < 100; i++) {
    await store.read();
    await store.observe({ visible: true, mono: i, sentAt: Date.now(), seq: i }, { tabId: 1, windowId: 1, documentId: 'doc' }, async () => true);
  }
  assert.equal(m.writes(), writes);
});
