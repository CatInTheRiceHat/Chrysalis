import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/shared/storage';
import { defaultSnapshot, viewingDefaults, type StorageSnapshot } from '../src/shared/types';
import { migrate, snapshot } from '../src/shared/validation';
import { CHANNEL, parseRequest } from '../src/shared/protocol';
import { detectPage } from '../src/content/youtube-adapter';

test('v2 upgrade preserves sessions, timing, receipts and preferences; controls default off', () => {
  const old = { ...defaultSnapshot(), schemaVersion: 2, settings: { showIndicator: false, theme: 'dark' }, revision: 5 };
  old.currentSession = { phase: 'paused', id: 'kept', intention: 'Explore', startedAt: 100,
    originalTargetMs: 300000, targetMs: null, elapsedMs: 400, goalAcknowledged: false,
    breakUntil: null, finishedAt: null, recoveryReason: null };
  old.completedSessions = [{ id: 'finished', intention: 'Study', startedAt: 10, finishedAt: 90,
    originalTargetMs: null, targetMs: null, elapsedMs: 70, reflection: 'Kept' }];
  old.receipts = [{ id: 'request', signature: 'signature' }];
  old.timing.browserEpoch = 'existing';
  const before = structuredClone(old);
  const updated = migrate(old);
  assert.equal(snapshot(updated), true);
  assert.deepEqual(updated.settings, { ...defaultSnapshot().settings, showIndicator: false, theme: 'dark' });
  for (const key of ['currentSession', 'completedSessions', 'timing', 'receipts', 'revision'] as const) assert.deepEqual(updated[key], old[key]);
  assert.deepEqual(old, before);
  assert.throws(() => migrate({ ...old, settings: { ...old.settings, hideShortsEntries: 'true' } }));
});
test('independent controls persist across worker recreation; restore preserves session and display', async () => {
  let disk = defaultSnapshot();
  const adapter = { async read() { return structuredClone(disk); }, async write(next: StorageSnapshot) { disk = structuredClone(next); } };
  const store = createStore(adapter);
  await store.updateSettings({ hideHomeRecommendations: true, theme: 'dark' }, 0);
  await store.updateSettings({ hideShortsEntries: true }, 1);
  assert.deepEqual((await createStore(adapter).read()).settings, { ...defaultSnapshot().settings, hideHomeRecommendations: true, hideShortsEntries: true, showIndicator: true, theme: 'dark' });
  await assert.rejects(store.updateSettings({ hideWatchRecommendations: true }, 0));
  const before = structuredClone(disk.currentSession);
  await store.updateSettings(viewingDefaults, 2);
  assert.deepEqual(disk.settings, { ...defaultSnapshot().settings, showIndicator: true, theme: 'dark' });
  assert.deepEqual(disk.currentSession, before);
});
test('control messages reject non-booleans, extra fields and malformed saved preferences', () => {
  for (const value of ['true', 1, null, {}, undefined]) {
    assert.equal(parseRequest({ channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { hideShortsEntries: value }, expectedRevision: 0 }), null);
    assert.equal(snapshot({ ...defaultSnapshot(), settings: { ...defaultSnapshot().settings, hideShortsEntries: value } }), false);
  }
  assert.equal(parseRequest({ channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { hideShortsEntries: true, blockUrl: '/shorts' }, expectedRevision: 0 }), null);
});
test('only the exact homepage and video watch route receive recommendation rules', () => {
  assert.equal(detectPage('https://www.youtube.com/?app=desktop'), 'home');
  assert.equal(detectPage('https://www.youtube.com/watch?v=a&list=b'), 'watch');
  for (const path of ['/results?search_query=home', '/feed/subscriptions', '/playlist?list=a', '/@channel', '/shorts/a', '/watch', '/watch?v=', '/gaming']) assert.equal(detectPage(`https://www.youtube.com${path}`), 'other');
  assert.equal(detectPage('https://www.youtube.com.evil.test/'), 'other');
});
