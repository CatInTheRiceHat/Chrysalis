import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/shared/storage';
import { defaultSnapshot, HISTORY_LIMIT, type StorageSnapshot } from '../src/shared/types';
import type { SessionCommand } from '../src/session/model';
import { migrate, snapshot } from '../src/shared/validation';
import { CHANNEL, parseRequest } from '../src/shared/protocol';
import { createHandler } from '../src/shared/handler';
import { summaryRows } from '../src/ui/history';

function fixture() {
  let disk = defaultSnapshot(), now = 1_000_000, n = 0, fail = false, epoch = 'one';
  const adapter = { async read() { return structuredClone(disk); }, async write(s: StorageSnapshot) { if (fail) throw Error('Disk failure'); disk = structuredClone(s); } };
  const environment = { now: () => now, epoch: async () => epoch };
  const store = createStore(adapter, environment);
  async function command(command: SessionCommand) {
    const s = await store.read();
    return store.execute({ requestId: `h-${++n}`, expectedRevision: s.sessionRevision, expectedSessionId: s.currentSession.phase === 'idle' ? null : s.currentSession.id, command });
  }
  return { store, adapter, environment, command, advance(ms: number) { now += ms; }, epoch() { epoch = 'two'; }, fail() { fail = true; },
    start: (intention = 'Entertainment') => command({ action: 'start', plan: { intention, targetMs: 60000 } }),
    async pulse() { return store.observe({ visible: true, mono: now, sentAt: now, seq: ++n }, { tabId: 1, windowId: 1, documentId: 'doc' }, async () => true); } };
}
test('new summaries record explicit revisions and actual break time separately from foreground time', async () => {
  const f = fixture(); await f.start(); await f.pulse();
  for (let i = 0; i < 30; i++) { f.advance(2000); await f.pulse(); }
  await f.command({ action: 'dismiss-checkpoint' });
  await f.command({ action: 'edit', plan: { intention: 'Exploring', targetMs: 60000 } });
  await f.command({ action: 'extend', durationMs: 60000 });
  await f.command({ action: 'edit', plan: { intention: 'Exploring', targetMs: 900000 } });
  await f.command({ action: 'break', durationMs: 120000 }); f.advance(30000);
  await f.command({ action: 'end-break' });
  await f.command({ action: 'break', durationMs: 60000 }); f.advance(100000);
  let s = await f.store.read(); assert.equal(s.currentSession.phase, 'paused');
  s = await f.command({ action: 'finish' });
  const summary = s.completedSessions[0]!;
  assert.equal(summary.history.breakMs, 90000, 'expiry caps at the chosen deadline');
  assert.equal(summary.elapsedMs, 60000);
  assert.deepEqual(summary.history.targetRevisions.map(r => [r.kind, r.fromMs, r.toMs]), [['extend', 60000, 120000], ['edit', 120000, 900000]]);
  assert.equal(summary.originalTargetMs, 60000); assert.equal(summary.reflection, null);
  assert(summaryRows(summary).some(([label, value]) => label === 'Break time (wall-clock)' && value === '1:30'));
});
test('a restarted break records wall time once, including early finish after restart', async () => {
  const f = fixture(); await f.start(); await f.command({ action: 'break', durationMs: 60000 });
  f.advance(20000); f.epoch(); await createStore(f.adapter, f.environment).read();
  f.advance(5000); const s = await f.command({ action: 'finish' });
  assert.equal(s.completedSessions[0]!.history.breakMs, 25000);
  assert.equal(s.completedSessions[0]!.elapsedMs, 0);
});
test('one reflection offer survives competing surfaces and worker recreation; skip stays missing', async () => {
  const f = fixture(); await f.start(); const s = await f.command({ action: 'finish' });
  const id = s.completedSessions[0]!.id;
  const claims = await Promise.all([f.store.offerReflection(id), f.store.offerReflection(id)]);
  assert.equal(claims.filter(c => c.offered).length, 1);
  assert.equal((await createStore(f.adapter, f.environment).offerReflection(id)).offered, false);
  const claimed = await f.store.read();
  const skipped = await f.store.changeHistory(id, claimed.historyRevision, { action: 'reflect', reflection: null });
  assert.equal(skipped.completedSessions[0]!.reflection, null);
  assert.equal(skipped.completedSessions[0]!.reflectionPrompted, true);
  assert(summaryRows(skipped.completedSessions[0]!).every(([, value]) => !value.includes('unsuccessful')));
});
test('answers and notes are optional data with strict bounds, never inferred from a longer session', async () => {
  const f = fixture(); await f.start(); const s = await f.command({ action: 'finish' });
  const id = s.completedSessions[0]!.id;
  const saved = await f.store.changeHistory(id, s.historyRevision, { action: 'reflect', reflection: { answer: 'yes', note: '  <img src=x onerror=alert(1)>  ' } });
  assert.deepEqual(saved.completedSessions[0]!.reflection, { answer: 'yes', note: '<img src=x onerror=alert(1)>' });
  await assert.rejects(f.store.changeHistory(id, saved.historyRevision, { action: 'reflect', reflection: { answer: 'no', note: 'x'.repeat(501) } }));
  assert.deepEqual((await f.store.read()).completedSessions, saved.completedSessions);
});
test('deleting one session removes its finished duplicate and receipts; queued saves cannot recreate it', async () => {
  const f = fixture(); await f.start(); const s = await f.command({ action: 'finish' });
  const id = s.completedSessions[0]!.id;
  const results = await Promise.allSettled([
    f.store.changeHistory(id, s.historyRevision, { action: 'delete' }),
    f.store.changeHistory(id, s.historyRevision, { action: 'reflect', reflection: { answer: 'yes', note: 'late private note' } }),
  ]);
  assert.equal(results[0]!.status, 'fulfilled'); assert.equal(results[1]!.status, 'rejected');
  const empty = await f.store.read();
  assert.equal(empty.currentSession.phase, 'idle'); assert.deepEqual(empty.completedSessions, []); assert.deepEqual(empty.receipts, []);
  await assert.rejects(f.store.changeHistory(id, empty.historyRevision, { action: 'reflect', reflection: { answer: 'yes', note: null } }));
  assert.equal((await f.store.offerReflection(id)).offered, false);
});
test('clear history preserves an unfinished plan; reset clears preferences and invalidates every older operation', async () => {
  const f = fixture(); await f.start(); const finished = await f.command({ action: 'finish' });
  const id = finished.completedSessions[0]!.id; await f.start('Current plan');
  let s = await f.store.read();
  await f.store.deleteData('history', s.revision, s.sessionRevision, s.historyRevision);
  s = await f.store.read(); assert.equal(s.currentSession.phase, 'active'); assert.deepEqual(s.completedSessions, []);
  await f.store.updateSettings({ theme: 'dark' }, s.revision); s = await f.store.read();
  await f.store.deleteData('all', s.revision, s.sessionRevision, s.historyRevision);
  await assert.rejects(f.store.changeHistory(id, s.historyRevision, { action: 'reflect', reflection: { answer: 'no', note: null } }));
  await assert.rejects(f.store.updateSettings({ theme: 'dark' }, s.revision));
  const reset = await f.store.read(); assert.equal(reset.currentSession.phase, 'idle'); assert.equal(reset.settings.theme, 'system');
});
test('retention keeps only the latest 100 real sessions, prunes old private records, and bounds target revisions', async () => {
  const f = fixture(); let s = defaultSnapshot();
  for (let i = 0; i < 102; i++) { await f.start(`Intention-${i}`); f.advance(1); s = await f.command({ action: 'finish' }); }
  assert.equal(s.completedSessions.length, HISTORY_LIMIT);
  assert.equal(s.completedSessions[0]!.intention, 'Intention-101');
  assert.equal(s.completedSessions.at(-1)!.intention, 'Intention-2');
  assert.equal(JSON.stringify(s).includes('"Intention-0"'), false);
  await f.start();
  for (let i = 0; i < 105; i++) await f.command({ action: 'edit', plan: { intention: 'Explore', targetMs: i % 2 ? 60000 : 120000 } });
  s = await f.command({ action: 'finish' });
  assert.equal(s.completedSessions[0]!.history.targetRevisions.length, 100);
  assert.equal(s.completedSessions[0]!.history.omittedRevisions, 5);
});
test('v4 recovery preserves text and missing reflection without inventing revision or break details', () => {
  const { historyRevision: _historyRevision, ...base } = defaultSnapshot();
  const { extensionPaused: _paused, ...oldSettings } = base.settings;
  const old = { ...base, settings: oldSettings, schemaVersion: 4, currentSession: { phase: 'idle' }, completedSessions: [{ id: 'old', intention: '<script>unsafe()</script>', startedAt: 10, finishedAt: 100, originalTargetMs: 60000, targetMs: 120000, elapsedMs: 70, reflection: '<b>legacy note</b>' }] };
  const upgraded = migrate(old);
  const s = upgraded.completedSessions[0]!;
  assert.equal(upgraded.schemaVersion, 7); assert.equal(s.history.complete, false);
  assert.deepEqual(s.history.targetRevisions, []); assert.equal(s.reflectionPrompted, true);
  assert.deepEqual(s.reflection, { answer: null, note: '<b>legacy note</b>' });
  assert(summaryRows(s).some(([, value]) => value === 'Not recorded in the earlier version'));
  const missing = migrate({ ...old, completedSessions: [{ ...old.completedSessions[0], reflection: null }] });
  assert.equal(missing.completedSessions[0]!.reflection, null);
});
test('corrupt new history records remain untouched and write failures never claim saved reflection', async () => {
  const f = fixture(); await f.start(); const s = await f.command({ action: 'finish' }); f.fail();
  await assert.rejects(f.store.offerReflection(s.completedSessions[0]!.id));
  assert.equal((await f.store.read()).completedSessions[0]!.reflectionPrompted, false);
  const corrupt = structuredClone(s); corrupt.completedSessions[0]!.history.breakMs = -1;
  assert.equal(snapshot(corrupt), false); assert.throws(() => migrate(corrupt));
  let writes = 0;
  await assert.rejects(createStore({ async read() { return corrupt; }, async write() { writes++; } }).read());
  assert.equal(writes, 0);
});
test('history protocol rejects arbitrary fields and forbids content access to reflection or records', async () => {
  const message = { channel: CHANNEL, type: 'HISTORY', sessionId: 's', expectedRevision: 0, change: { action: 'reflect', reflection: { answer: 'yes', note: null } } };
  assert(parseRequest(message)); assert.equal(parseRequest({ ...message, url: 'https://example.com' }), null);
  assert.equal(parseRequest({ ...message, change: { action: 'reflect', reflection: { answer: 'skip', note: null } } }), null);
  const f = fixture(), handle = createHandler(f.store, 'own', 'test');
  const sender = { id: 'own', frameId: 0, url: 'https://www.youtube.com/', tab: { id: 1 } } as chrome.runtime.MessageSender;
  for (const request of [message, { channel: CHANNEL, type: 'OFFER_REFLECTION', sessionId: 's' }]) {
    const r = await handle(request, sender); assert.equal(!r.ok && r.code, 'FORBIDDEN');
  }
});

test('unchanged summary targets display once; different final targets remain explicit', async () => {
  const f = fixture(); await f.start();
  const unchanged = (await f.command({ action: 'finish' })).completedSessions[0]!;
  assert.deepEqual(summaryRows(unchanged).filter(([label]) => label.includes('target')), [['Original time target', '1 minute']]);
  await f.command({ action: 'reset' }); await f.start();
  await f.command({ action: 'edit', plan: { intention: 'Entertainment', targetMs: 900000 } });
  const revised = (await f.command({ action: 'finish' })).completedSessions.find(item => item.id !== unchanged.id)!;
  assert.deepEqual(summaryRows(revised).filter(([label]) => label.includes('target')), [['Original time target', '1 minute'], ['Final time target', '15 minutes']]);
});

test('viewing deep link remains enumerated and rejects arbitrary destinations', () => {
  assert(parseRequest({ channel: CHANNEL, type: 'OPEN_PAGE', page: 'viewing' }));
  for (const page of ['https://example.com', 'options.html#viewing', 'instagram']) {
    assert.equal(parseRequest({ channel: CHANNEL, type: 'OPEN_PAGE', page }), null);
  }
});
