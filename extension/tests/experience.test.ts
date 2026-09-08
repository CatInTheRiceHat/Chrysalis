import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/shared/storage';
import { defaultSnapshot, type StorageSnapshot } from '../src/shared/types';
import { migrate } from '../src/shared/validation';
import { checkTarget } from '../src/session/model';
import { CHANNEL, parseRequest } from '../src/shared/protocol';
import { createHandler } from '../src/shared/handler';
function setup() {
  let disk = defaultSnapshot(), fail = false;
  const store = createStore({ async read() { return structuredClone(disk); }, async write(s: StorageSnapshot) { if (fail) throw new Error('Unavailable'); disk = structuredClone(s); } });
  return { store, fail: () => { fail = true; } };
}
const start = { requestId: 'start', expectedRevision: 0, expectedSessionId: null, command: { action: 'start' as const, plan: { intention: 'Explore', targetMs: 60000 } } };
test('new preferences migrate without losing viewing choices or session data', () => {
  const { historyRevision: _historyRevision, ...base } = defaultSnapshot();
  const old = { ...base, schemaVersion: 3, settings: { theme: 'dark', showIndicator: true, hideHomeRecommendations: true, hideWatchRecommendations: false, hideShortsEntries: true } };
  const result = migrate(old);
  assert.equal(result.schemaVersion, 7); assert.equal(result.settings.hideShortsEntries, true);
  assert.equal(result.settings.defaultTargetMs, 900000); assert.equal(result.settings.introSeen, false);
  assert.deepEqual(result.currentSession, old.currentSession);
});
test('checkpoint preference changes real transitions without revising the plan', async () => {
  const { store } = setup(); await store.execute(start);
  await store.updateSettings({ checkpointsEnabled: false }, 0);
  const state = await store.read();
  if (state.currentSession.phase === 'idle') throw Error();
  state.currentSession.elapsedMs = 60000; checkTarget(state); assert.equal(state.currentSession.phase, 'active');
  state.settings.checkpointsEnabled = true; checkTarget(state); assert.equal(state.currentSession.phase, 'checkpoint');
  assert.equal(state.currentSession.originalTargetMs, 60000);
});
test('clear history removes completed plans and receipts, keeps live session and rejects old retries', async () => {
  const { store } = setup(); const state = await store.execute(start);
  const clear = await store.deleteData('history', state.revision, state.sessionRevision);
  assert.deepEqual(clear.currentSession, state.currentSession); assert.deepEqual(clear.receipts, []);
  await assert.rejects(store.execute(start));
  assert.equal((await store.read()).sessionRevision, clear.sessionRevision);
});
test('delete-all is atomic and cannot be undone by queued old session/settings writes', async () => {
  const { store } = setup(); const state = await store.execute(start);
  const result = await Promise.allSettled([
    store.deleteData('all', state.revision, state.sessionRevision),
    store.updateSettings({ hideShortsEntries: true }, state.revision), store.execute(start),
  ]);
  assert.equal(result[0]?.status, 'fulfilled'); assert.equal(result[1]?.status, 'rejected'); assert.equal(result[2]?.status, 'rejected');
  const empty = await store.read(); assert.equal(empty.currentSession.phase, 'idle');
  assert.deepEqual(empty.settings, defaultSnapshot().settings); assert.deepEqual(empty.completedSessions, []); assert.deepEqual(empty.receipts, []); assert.equal(empty.timing.anchor, null);
  assert(empty.sessionRevision > state.sessionRevision);
  const failed = setup(); const before = await failed.store.execute(start); failed.fail();
  await assert.rejects(failed.store.deleteData('all', before.revision, before.sessionRevision));
  assert.deepEqual((await failed.store.read()).currentSession, before.currentSession);
});
test('only constrained session actions reach content; data and arbitrary plan mutations stay privileged', async () => {
  const { store } = setup(); const state = await store.execute(start);
  const sender = { id: 'own', url: 'https://www.youtube.com/watch?v=a', origin: 'https://www.youtube.com', frameId: 0, tab: { id: 1 } } as chrome.runtime.MessageSender;
  const handle = createHandler(store, 'own', 'test');
  const allowed = await handle({ channel: CHANNEL, type: 'SESSION_CONTROL', mutation: { requestId: 'pause', expectedRevision: state.sessionRevision, expectedSessionId: 'start', command: { action: 'pause' } } }, sender);
  assert.equal(allowed.ok && allowed.type, 'DISPLAY');
  assert.equal('snapshot' in allowed, false);
  assert.ok(parseRequest({ channel: CHANNEL, type: 'SESSION_CONTROL', mutation: start }));
  const denied = await handle({ channel: CHANNEL, type: 'DELETE_DATA', scope: 'all', expectedRevision: 0, expectedSessionRevision: 2, expectedHistoryRevision: 0 }, sender);
  assert.equal(!denied.ok && denied.code, 'FORBIDDEN');
});
