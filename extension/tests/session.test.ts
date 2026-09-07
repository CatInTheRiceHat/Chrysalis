import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/shared/storage';
import { defaultSnapshot, type StorageSnapshot } from '../src/shared/types';
import { MAX_GAP_MS, StaleSessionError, targetFromMinutes, validatePlan, type SessionCommand } from '../src/session/model';
import { parseRequest, CHANNEL } from '../src/shared/protocol';

function fixture(initial = defaultSnapshot()) {
  let disk = structuredClone(initial);
  let now = 1_000_000;
  let epoch = 'browser-a';
  let n = 0;
  const adapter = { async read() { return structuredClone(disk); }, async write(value: StorageSnapshot) { disk = structuredClone(value); } };
  const environment = { now: () => now, epoch: async () => epoch };
  const store = createStore(adapter, environment);
  async function mutation(command: SessionCommand) {
    const state = await store.read();
    return { requestId: `request-${++n}`, expectedRevision: state.sessionRevision,
      expectedSessionId: state.currentSession.phase === 'idle' ? null : state.currentSession.id, command };
  }
  const cmd = async (command: SessionCommand) => store.execute(await mutation(command));
  let signal = 0;
  async function pulse(tabId = 1, windowId = 1, eligible = true, visible = true, doc = `doc-${tabId}`, mono = now) {
    return store.observe({ seq: ++signal, mono, visible, sentAt: now }, { tabId, windowId, documentId: doc }, async () => eligible);
  }
  return { store, adapter, environment, mutation, cmd, pulse,
    now: () => now, advance: (ms: number) => { now += ms; }, epoch: (id: string) => { epoch = id; },
    start: (targetMs: number | null = null) => cmd({ action: 'start', plan: { intention: 'Entertainment', targetMs } }),
  };
}
function elapsed(state: StorageSnapshot) { return state.currentSession.phase === 'idle' ? 0 : state.currentSession.elapsedMs; }

test('target and custom intention validation accepts bounds and rejects ambiguous/unsafe input', () => {
  assert.equal(targetFromMinutes('1'), 60_000);
  assert.equal(targetFromMinutes(' 1440 '), 86_400_000);
  for (const value of ['', '0', '-1', '1.5', '1e2', 'Infinity', '1441', 'NaN', 'abc']) assert.throws(() => targetFromMinutes(value));
  assert.deepEqual(validatePlan({ intention: '  Explore a topic  ', targetMs: null }), { intention: 'Explore a topic', targetMs: null });
  for (const intention of ['', ' ', 'a'.repeat(81), 'two\nlines']) assert.throws(() => validatePlan({ intention, targetMs: null }));
  for (const targetMs of [0, -1, 1000, 60_001, Infinity, NaN, 86_400_001]) assert.throws(() => validatePlan({ intention: 'Studying', targetMs }));
});
test('start without target; only one confirmed foreground owner contributes browsing/playback time', async () => {
  const f = fixture(); await f.start();
  await f.pulse(); f.advance(2000); await f.pulse();
  assert.equal(elapsed(await f.store.read()), 2000);
  f.advance(1000); await f.pulse(2, 2, false); // Visible tab in an unfocused window.
  assert.equal(elapsed(await f.store.read()), 2000);
  f.advance(1000); await f.pulse();
  assert.equal(elapsed(await f.store.read()), 4000);
  assert.equal((await f.store.read()).currentSession.phase, 'active');
});
test('tab switches, closure and window focus stop an interval; background/hidden time is excluded', async () => {
  const f = fixture(); await f.start(); await f.pulse();
  f.advance(1000); await f.store.boundary({ type: 'activate', tabId: 2, windowId: 1 });
  f.advance(40_000); await f.pulse(1, 1, false, false);
  await f.pulse(2); f.advance(2000); await f.pulse(2);
  assert.equal(elapsed(await f.store.read()), 3000);
  f.advance(500); await f.store.boundary({ type: 'focus', windowId: -1 });
  f.advance(60_000); await f.pulse(2, 1, false);
  assert.equal(elapsed(await f.store.read()), 3500);
  await f.pulse(2); f.advance(500); await f.store.boundary({ type: 'leave', tabId: 2 });
  f.advance(60_000);
  assert.equal(elapsed(await f.store.read()), 4000);
});
test('events in an unrelated window do not end the foreground tab interval', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(1000);
  await f.store.boundary({ type: 'activate', windowId: 2, tabId: 20 });
  await f.store.boundary({ type: 'leave', tabId: 20 });
  f.advance(1000); await f.pulse(); assert.equal(elapsed(await f.store.read()), 2000);
});
test('visibility, refresh and document handoffs never bridge unobserved time', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(1000);
  await f.pulse(1, 1, true, false); f.advance(60_000);
  await f.pulse(); f.advance(1000); await f.store.boundary({ type: 'leave', tabId: 1 });
  f.advance(2000); await f.pulse(1, 1, true, true, 'new-document', 0);
  f.advance(2000); await f.pulse(1, 1, true, true, 'new-document', 2000);
  assert.equal(elapsed(await f.store.read()), 4000);
});
test('pause/resume does not count explicit pause or unobserved intervals', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(1200); await f.cmd({ action: 'pause' });
  f.advance(3_600_000); await f.pulse(); assert.equal(elapsed(await f.store.read()), 1200);
  await f.cmd({ action: 'resume' }); await f.pulse(); f.advance(2000); await f.pulse();
  assert.equal(elapsed(await f.store.read()), 3200);
});
test('target revision preserves original target and final summary; finish/reset are explicit', async () => {
  const f = fixture(); await f.start(300_000); await f.pulse(); f.advance(1000);
  await f.cmd({ action: 'edit', plan: { intention: 'A specific topic', targetMs: 900_000 } });
  const state = await f.cmd({ action: 'finish' });
  assert.equal(state.currentSession.phase, 'finished');
  assert.deepEqual(state.completedSessions.map(s => [s.originalTargetMs, s.targetMs, s.intention, s.elapsedMs]), [[300_000, 900_000, 'A specific topic', 1000]]);
  await f.cmd({ action: 'reset' }); assert.equal((await f.store.read()).currentSession.phase, 'idle');
  assert.equal((await f.store.read()).completedSessions.length, 1);
});
test('checkpoint counts foreground decision time, Continue acknowledges once, target changes rearm', async () => {
  const f = fixture(); await f.start(60_000); await f.pulse();
  for (let i = 0; i < 30; i++) { f.advance(2000); await f.pulse(); }
  assert.equal((await f.store.read()).currentSession.phase, 'checkpoint');
  f.advance(2000); await f.pulse(); assert.equal(elapsed(await f.store.read()), 62_000);
  await f.cmd({ action: 'continue' }); await f.pulse(); f.advance(2000); await f.pulse();
  assert.equal((await f.store.read()).currentSession.phase, 'active');
  await f.cmd({ action: 'edit', plan: { intention: 'Exploring', targetMs: 60_000 } });
  assert.equal((await f.store.read()).currentSession.phase, 'active', 'intention-only edit must not rearm target');
  await f.cmd({ action: 'edit', plan: { intention: 'Exploring', targetMs: null } });
  await f.cmd({ action: 'edit', plan: { intention: 'Exploring', targetMs: 60_000 } });
  assert.equal((await f.store.read()).currentSession.phase, 'checkpoint');
});
test('breaks exclude time, end early or expire paused, and never auto-resume', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(1000);
  await f.cmd({ action: 'break', durationMs: 60_000 });
  f.advance(30_000); await f.pulse(); assert.equal(elapsed(await f.store.read()), 1000);
  assert.equal((await f.store.read()).currentSession.phase, 'break');
  await f.cmd({ action: 'end-break' }); assert.equal((await f.store.read()).currentSession.phase, 'paused');
  await f.cmd({ action: 'break', durationMs: 60_000 });
  f.advance(60_000); assert.equal((await f.store.read()).currentSession.phase, 'paused');
  f.advance(1000); await f.pulse(); assert.equal(elapsed(await f.store.read()), 1000);
});
test('concurrent messages and duplicate request receipts produce one start/finish even across worker recreation', async () => {
  const f = fixture(); const start = await f.mutation({ action: 'start', plan: { intention: 'Studying', targetMs: null } });
  const results = await Promise.all([f.store.execute(start), f.store.execute(start)]);
  assert.equal(results[0].sessionRevision, results[1].sessionRevision);
  const finish = await f.mutation({ action: 'finish' });
  const competing = { ...finish, requestId: 'different-request' };
  const outcomes = await Promise.allSettled([f.store.execute(finish), f.store.execute(competing)]);
  assert.equal(outcomes[0]!.status, 'fulfilled'); assert.equal(outcomes[1]!.status, 'rejected');
  const reopened = createStore(f.adapter, f.environment);
  assert.equal((await reopened.execute(finish)).completedSessions.length, 1);
  await assert.rejects(reopened.execute({ ...finish, command: { action: 'reset' } }), StaleSessionError);
});
test('stale editor cannot change a newer session, and invalid transitions fail without mutation', async () => {
  const f = fixture(); await f.start();
  const oldEdit = await f.mutation({ action: 'edit', plan: { intention: 'Old draft', targetMs: 300_000 } });
  await f.cmd({ action: 'finish' }); await f.start();
  await assert.rejects(f.store.execute(oldEdit), StaleSessionError);
  await assert.rejects(f.cmd({ action: 'resume' }), StaleSessionError);
  const s = (await f.store.read()).currentSession;
  assert.notEqual(s.phase, 'idle'); if (s.phase !== 'idle') assert.equal(s.intention, 'Entertainment');
});
test('worker suspension retains short observation continuity; browser restart recovers unfinished sessions paused', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(2000); await f.pulse();
  const worker = createStore(f.adapter, f.environment); f.advance(2000);
  await worker.observe({ mono: f.now(), sentAt: f.now(), seq: 99, visible: true }, { tabId: 1, windowId: 1, documentId: 'doc-1' }, async () => true);
  assert.equal(elapsed(await worker.read()), 4000);
  f.advance(3_600_000); f.epoch('browser-b');
  const restored = await createStore(f.adapter, f.environment).read();
  assert.equal(restored.currentSession.phase, 'paused'); assert.equal(elapsed(restored), 4000);
  assert.equal(restored.timing.anchor, null);
  assert.equal(restored.currentSession.recoveryReason, 'browser-restart');
});
test('long/negative/monotonic-inconsistent gaps are dropped, surfaced, and require explicit resume', async () => {
  for (const kind of ['long', 'negative', 'monotonic']) {
    const f = fixture(); await f.start(); await f.pulse(); f.advance(2000); await f.pulse();
    const mono = f.now();
    f.advance(kind === 'long' ? MAX_GAP_MS + 1 : kind === 'negative' ? -1000 : 2000);
    await f.pulse(1, 1, true, true, 'doc-1', kind === 'monotonic' ? mono + 60_000 : f.now());
    const state = await f.store.read();
    assert.equal(state.currentSession.phase, 'paused'); assert.equal(elapsed(state), 2000);
    assert.equal(state.currentSession.recoveryReason, 'signal-gap');
    await f.cmd({ action: 'resume' }); await f.pulse(); f.advance(2000); await f.pulse();
    assert.equal(elapsed(await f.store.read()), 4000);
  }
});
test('duplicate/out-of-order observations cannot recreate an owner after it becomes hidden', async () => {
  const f = fixture(); await f.start();
  const observer = { tabId: 1, windowId: 1, documentId: 'manual-doc' };
  const positive = { mono: f.now(), sentAt: f.now(), seq: 1, visible: true };
  await f.store.observe(positive, observer, async () => true); f.advance(1000);
  await f.store.observe({ ...positive, mono: f.now(), sentAt: f.now(), seq: 2, visible: false }, observer, async () => true);
  await f.store.observe(positive, observer, async () => true);
  assert.equal((await f.store.read()).timing.anchor, null);
  assert.equal(elapsed(await f.store.read()), 1000);
});
test('foundation schema upgrades retain settings and summary data without importing legacy apps', async () => {
  let disk: unknown = { schemaVersion: 1, revision: 3, settings: { theme: 'dark', showIndicator: false }, currentSession: { phase: 'idle' }, completedSessions: [] };
  const store = createStore({ async read() { return disk; }, async write(value) { disk = value; } });
  const state = await store.read();
  assert.equal(state.schemaVersion, 4); assert.equal(state.settings.theme, 'dark'); assert.equal(state.revision, 3);
  assert.equal(state.currentSession.phase, 'idle');
});
test('typed protocol rejects malformed observations and session mutations before storage', () => {
  for (const message of [
    { type: 'OBSERVE', sample: { visible: true, mono: -1, seq: 0, sentAt: 0 } },
    { type: 'SESSION', mutation: { requestId: 'x', expectedRevision: 0, expectedSessionId: null, command: { action: 'start', plan: { intention: '', targetMs: null } } } },
    { type: 'SESSION', mutation: { requestId: 'x', expectedRevision: 0, expectedSessionId: null, command: { action: 'break', durationMs: 0 } } },
  ]) assert.equal(parseRequest({ channel: CHANNEL, ...message }), null);
});

test('idle observations leave no document trail and UI reads never manufacture time', async () => {
  const f = fixture(); await f.pulse();
  assert.deepEqual((await f.store.read()).timing.signals, []);
  await f.start(); f.advance(3_600_000);
  assert.equal(elapsed(await f.store.read()), 0);
  await f.pulse(); f.advance(MAX_GAP_MS + 1);
  assert.equal((await f.store.read()).currentSession.phase, 'paused');
  assert.equal(elapsed(await f.store.read()), 0);
});
test('even conflicting eligible observers share one timeline rather than summing tab durations', async () => {
  const f = fixture(); await f.start(); await f.pulse(1);
  for (let i = 0; i < 4; i++) {
    f.advance(1000);
    await Promise.all([f.pulse(1), f.pulse(2, 2)]);
  }
  assert(elapsed(await f.store.read()) <= 4000);
  assert.equal((await f.store.read()).timing.anchor?.tabId, 2);
});
test('a delayed browser query drops its interval and recovers a long signal gap', async () => {
  const f = fixture(); await f.start(); await f.pulse(); f.advance(2000);
  await f.store.observe({ visible: true, mono: f.now(), sentAt: f.now(), seq: 99 },
    { tabId: 1, windowId: 1, documentId: 'doc-1' }, async () => { f.advance(6000); return true; });
  assert.equal((await f.store.read()).currentSession.phase, 'paused');
  assert.equal(elapsed(await f.store.read()), 0);
});
test('failed finish cannot partially save a summary or receipt; retry commits exactly once', async () => {
  const f = fixture(); await f.start();
  const finish = await f.mutation({ action: 'finish' });
  let fail = true;
  const store = createStore({ read: f.adapter.read, async write(value) {
    if (fail) throw new Error('Disk failed'); await f.adapter.write(value);
  } }, f.environment);
  await assert.rejects(store.execute(finish));
  assert.equal((await f.store.read()).currentSession.phase, 'active');
  assert.equal((await f.store.read()).completedSessions.length, 0);
  fail = false; await store.execute(finish); await store.execute(finish);
  assert.equal((await store.read()).completedSessions.length, 1);
});
test('restarted breaks restore paused; backward date changes do not prevent finishing', async () => {
  const f = fixture(); await f.start(); await f.cmd({ action: 'break', durationMs: 60_000 });
  f.epoch('browser-restarted');
  assert.equal((await f.store.read()).currentSession.phase, 'paused');
  f.advance(-60_000); await f.cmd({ action: 'finish' });
  const state = await f.store.read();
  assert.equal(state.currentSession.phase, 'finished');
  assert.equal(state.completedSessions[0]!.finishedAt, state.completedSessions[0]!.startedAt);
});
