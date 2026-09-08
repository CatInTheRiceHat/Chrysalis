import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createPersistence, MEMORY_KEY, PREFERENCES_KEY, type Area } from '../src/shared/persistence';
import { createStore, STORAGE_KEY } from '../src/shared/storage';
import { defaultSnapshot, emptyHistoryDetails, type StorageSnapshot } from '../src/shared/types';
import { createEncryption, decrypt, derive, envelope, type Envelope } from '../src/shared/crypto';
import { createHandler } from '../src/shared/handler';
Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
const password = 'a long test passphrase';
class MemoryArea implements Area {
  data: Record<string, unknown> = {}; failSet = false; failRead = false;
  async get(keys: string[]) { if (this.failRead) throw new Error('read failed'); return structuredClone(Object.fromEntries(keys.filter(k => k in this.data).map(k => [k, this.data[k]]))); }
  async set(values: Record<string, unknown>) { if (this.failSet) throw new Error('write failed'); Object.assign(this.data, structuredClone(values)); }
}
function historyState(): StorageSnapshot {
  const s = defaultSnapshot();
  s.settings.hideHomeRecommendations = true;
  s.completedSessions = [{ id: 'private-session-id', intention: 'private intention', startedAt: 1, originalTargetMs: 60000, targetMs: 120000, elapsedMs: 6000, finishedAt: 20, history: emptyHistoryDetails(), reflection: { answer: 'yes', note: 'private note' }, reflectionPrompted: true }];
  s.currentSession = { ...s.completedSessions[0]!, id: 'unfinished-id', phase: 'paused', goalAcknowledged: false, breakUntil: null, breakStartedAt: null, finishedAt: null, recoveryReason: null };
  // The real session structure has no reflection properties.
  delete (s.currentSession as unknown as Record<string, unknown>).reflection; delete (s.currentSession as unknown as Record<string, unknown>).reflectionPrompted;
  s.receipts = [{ id: 'receipt-id', signature: 'private intention' }];
  s.timing = { browserEpoch: 'epoch-id', anchor: null, signals: [{ documentId: 'document-id', seq: 4 }] };
  return s;
}
function setup() { const local = new MemoryArea(), session = new MemoryArea(); const p = createPersistence(local, session); return { local, session, p, store: createStore(p.adapter) }; }
function diskIsPrivate(local: MemoryArea) {
  const disk = JSON.stringify(local.data);
  for (const marker of ['private intention','private note','private-session-id','receipt-id','document-id','unfinished-id','rawKey',password]) assert(!disk.includes(marker), marker);
}
test('default activity is memory-only; preferences alone survive browser restart and controls need no password', async () => {
  const { local, session, p, store } = setup();
  await store.initialize(); await store.updateSettings({ hideHomeRecommendations: true }, 0);
  await p.adapter.write(historyState()); diskIsPrivate(local);
  assert.deepEqual(Object.keys(local.data), [PREFERENCES_KEY]);
  assert.equal((await p.adapter.read() as StorageSnapshot).completedSessions.length, 1);
  const woken = createStore(createPersistence(local, session).adapter);
  assert.equal((await woken.read()).completedSessions.length, 1);
  session.data = {};
  const restarted = createStore(createPersistence(local, session).adapter);
  const fresh = await restarted.read(); assert.equal(fresh.currentSession.phase, 'idle'); assert.equal(fresh.completedSessions.length, 0); assert(fresh.settings.hideHomeRecommendations);
  await restarted.execute({ requestId: 'new', expectedRevision: fresh.sessionRevision, expectedSessionId: null, command: { action: 'start', plan: { intention: 'no password', targetMs: null } } });
  assert.equal((await restarted.read()).currentSession.phase, 'active'); diskIsPrivate(local);
});
test('explicit legacy encryption replaces the only plaintext record, retains history/archive and discards receipts', async () => {
  const { local, session, p } = setup(); const old = historyState(); local.data[STORAGE_KEY] = old;
  const pending = await p.history('status'); assert(pending.status.legacyPending); assert.equal(pending.snapshot.completedSessions.length, 0); assert.deepEqual(local.data[STORAGE_KEY], old);
  const done = await p.history('migrate-encrypt', password);
  assert(done.status.unlocked); assert.equal(done.snapshot.completedSessions[0]!.reflection?.note, 'private note');
  assert.equal(done.status.archivedSession.phase, 'paused'); assert.equal(done.snapshot.currentSession.phase, 'idle'); assert.deepEqual(done.snapshot.receipts, []);
  diskIsPrivate(local);
  const raw = (session.data[MEMORY_KEY] as { rawKey: string }).rawKey;
  assert(!JSON.stringify(local.data).includes(raw));
  const vault = (local.data[STORAGE_KEY] as unknown as { vault: Envelope }).vault;
  const payload = await decrypt(vault, raw) as Record<string, unknown>; assert.deepEqual(Object.keys(payload).sort(), ['archivedSession','sessions']);
  assert(!JSON.stringify(payload).includes('receipt-id')); assert(!JSON.stringify(payload).includes('document-id'));
});
test('encryption uses fresh nonces, authenticated metadata and rejects incorrect passwords/tampering', async () => {
  const { encrypted, raw } = await createEncryption(password, { test: 'secret' }); assert(envelope(encrypted));
  await assert.rejects(() => decrypt(encrypted, 'A'.repeat(43) + '='));
  await assert.rejects(() => decrypt({ ...encrypted, ciphertext: encrypted.ciphertext.slice(0,-4) + 'AAAA' }, raw));
  await assert.rejects(() => decrypt({ ...encrypted, salt: 'AAAAAAAAAAAAAAAAAAAAAA==' }, raw));
  await assert.rejects(() => derive(password, '%%%'));
  const { encrypted: other } = await createEncryption(password, { test: 'secret' }); assert.notEqual(other.iv, encrypted.iv); assert.notEqual(other.salt, encrypted.salt);
});
test('locked history does not gate viewing/session actions; unlock merges temporary history; worker wake retains unlock, browser restart locks', async () => {
  const { local, session, p, store } = setup(); await p.adapter.write(historyState()); await p.history('enable', password);
  const vaultBefore = structuredClone(local.data[STORAGE_KEY]);
  await p.history('lock'); assert.equal((await store.read()).completedSessions.length, 0);
  assert.equal((await store.read()).currentSession.phase, 'paused');
  await store.updateSettings({ hideShortsEntries: true }, (await store.read()).revision);
  const s = await store.read(); await store.execute({ requestId: 'resume', expectedRevision: s.sessionRevision, expectedSessionId: s.currentSession.phase === 'idle' ? null : s.currentSession.id, command: { action: 'resume' } });
  assert.equal((await store.read()).currentSession.phase, 'active'); assert.deepEqual(local.data[STORAGE_KEY], vaultBefore);
  await assert.rejects(() => p.history('unlock', 'incorrect password'), /could not be unlocked/); assert.deepEqual(local.data[STORAGE_KEY], vaultBefore);
  await p.history('unlock', password);
  assert((await createPersistence(local, session).history('status')).status.unlocked);
  session.data = {};
  const reopened = createPersistence(local, session); assert(!(await reopened.history('status')).status.unlocked);
  assert.equal((await reopened.history('status')).snapshot.currentSession.phase, 'idle');
  assert.equal((await reopened.history('unlock', password)).snapshot.completedSessions.length, 1); diskIsPrivate(local);
});
test('migration write failures preserve old data; retry succeeds; pending and unknown legacy data require explicit choices', async () => {
  const { local, p, store } = setup(); const old = historyState(); local.data[STORAGE_KEY] = structuredClone(old); local.failSet = true;
  await assert.rejects(() => p.history('migrate-encrypt', password)); assert.deepEqual(local.data[STORAGE_KEY], old);
  local.failSet = false;
  const s = await store.read(); await assert.rejects(() => store.deleteData('all', s.revision, s.sessionRevision, s.historyRevision)); assert.deepEqual(local.data[STORAGE_KEY], old);
  await p.history('migrate-delete'); diskIsPrivate(local); assert(!(await p.history('status')).status.legacyPending);
  local.data[STORAGE_KEY] = { schemaVersion: 999, private: 'unreadable' };
  assert(!(await p.history('status')).status.legacyReadable);
  await assert.rejects(() => p.history('migrate-encrypt', password)); assert.equal((local.data[STORAGE_KEY] as { schemaVersion: number }).schemaVersion, 999);
  await p.history('migrate-delete'); assert(!(await p.history('status')).status.legacyPending);
});
test('history disk failures retain temporary changes and surface unsaved status without stopping sessions', async () => {
  const { local, session, p, store } = setup(); await p.history('enable', password); local.failSet = true;
  const value = historyState(); await p.adapter.write({ ...value, settings: defaultSnapshot().settings });
  assert((await p.history('status')).status.saveError); assert.equal((await store.read()).completedSessions.length, 1);
  await assert.rejects(() => p.history('lock'), /unsaved/);
  local.failSet = false; await p.history('retry'); assert(!(await p.history('status')).status.saveError);
  session.failSet = true; const prior = JSON.stringify(session.data); await assert.rejects(() => p.adapter.write(defaultSnapshot())); assert.equal(JSON.stringify(session.data), prior);
  session.failSet = false; diskIsPrivate(local);
});
test('durable deletion marker prevents revival when RAM cleanup fails; locked history deletes without a password', async () => {
  const { local, session, p, store } = setup(); await p.adapter.write(historyState()); await p.history('enable', password);
  const state = await store.read(); session.failSet = true;
  await assert.rejects(() => store.deleteData('all', state.revision, state.sessionRevision, state.historyRevision));
  assert.equal((local.data[STORAGE_KEY] as { vault: unknown }).vault, null);
  session.failSet = false;
  const next = await createPersistence(local, session).history('status'); assert.equal(next.snapshot.completedSessions.length, 0); assert.equal(next.snapshot.currentSession.phase, 'idle'); assert(!next.status.unlocked);
  assert(!(session.data[MEMORY_KEY] as { rawKey: unknown }).rawKey); diskIsPrivate(local);
  await p.history('enable', password); await p.history('lock'); const s = await store.read(); await store.deleteData('history', s.revision, s.sessionRevision, s.historyRevision); assert(!(await p.history('status')).status.enabled);
});
test('content scripts cannot invoke vault operations or receive keys/history', async () => {
  const { p, store } = setup();
  const handle = createHandler(store, 'extension', '0.9.0', undefined, undefined, undefined, (a,pw) => store.exclusive(() => p.history(a,pw)));
  const sender = { id: 'extension', tab: { id: 1 }, frameId: 0, url: 'https://www.youtube.com/' } as chrome.runtime.MessageSender;
  for (const action of ['status','unlock','enable','migrate-delete']) assert.equal((await handle({ channel: 'chrysalis/v1', type: 'HISTORY_VAULT', action, password }, sender)).ok, false);
});

test('migration readback accepts Chrome reordered keys; post-write memory failure leaves recoverable ciphertext', async () => {
  const { local, session, p } = setup(); local.data[STORAGE_KEY] = historyState();
  const read = local.get.bind(local);
  local.get = async keys => JSON.parse(JSON.stringify(await read(keys), (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, value[k]])) : value)) as Record<string, unknown>;
  assert((await p.history('migrate-encrypt', password)).status.unlocked);
  const second = setup(); second.local.data[STORAGE_KEY] = historyState(); await second.p.history('status'); second.session.failSet = true;
  await assert.rejects(() => second.p.history('migrate-encrypt', password)); diskIsPrivate(second.local);
  second.session.failSet = false;
  assert(!(await second.p.history('status')).status.unlocked);
  assert.equal((await second.p.history('unlock', password)).snapshot.completedSessions.length, 1);
  local.failRead = true; await assert.rejects(() => p.history('status'));
  local.failRead = false; session.failRead = true; await assert.rejects(() => p.history('status'));
});

test('combined disk and follow-up memory failure retains dirty marker so lock cannot discard unsaved history', async () => {
  const { local, session, p } = setup(); await p.history('enable', password);
  const set = local.set.bind(local);
  local.set = async () => { session.failSet = true; throw new Error('disk failed'); };
  await assert.rejects(() => p.adapter.write({ ...historyState(), settings: defaultSnapshot().settings }));
  session.failSet = false; local.set = set;
  assert((await p.history('status')).status.saveError);
  await assert.rejects(() => p.history('lock'), /unsaved/);
  await p.history('retry'); assert(!(await p.history('status')).status.saveError);
});
