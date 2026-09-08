import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrompts, offerPrompt, VISIT_GAP_MS, type Visit } from '../src/session/prompts';
import { defaultSnapshot } from '../src/shared/types';
import { applyCommand } from '../src/session/model';
import { migrate, settingsPatch } from '../src/shared/validation';

test('one introduction across simultaneous tabs, refresh and worker suspension; a new visit follows 30 minutes away', async () => {
  let disk: Visit | undefined, now = 1000;
  const state = defaultSnapshot();
  const adapter = { async read() { return disk; }, async write(v: Visit) { disk = v; } };
  const worker = () => createPrompts(adapter, async () => state, () => now);
  const first = worker();
  assert.deepEqual(await Promise.all([first(async () => true), first(async () => true)]), ['intro', null]);
  now += 10000;
  assert.equal(await worker()(async () => true), null);
  now += VISIT_GAP_MS - 1;
  assert.equal(await worker()(async () => true), null, 'foreground use renews the visit');
  now += VISIT_GAP_MS;
  assert.equal(await worker()(async () => true), 'intro');
});
test('background tabs cannot claim or renew a visit; failed persistence never returns an offer', async () => {
  let writes = 0, fail = true;
  const request = createPrompts({ async read() { return undefined; }, async write() { writes++; if (fail) throw new Error('Unavailable'); } }, async () => defaultSnapshot());
  assert.equal(await request(async () => false), null); assert.equal(writes, 0);
  await assert.rejects(request(async () => true));
  fail = false; assert.equal(await request(async () => true), 'intro');
});
test('unfinished sessions suppress introductions even after a long absence, and disabled settings suppress offers', () => {
  const state = defaultSnapshot();
  applyCommand(state, { requestId: 'session', expectedRevision: 0, expectedSessionId: null, command: { action: 'start', plan: { intention: 'Your session', targetMs: 60000 } } }, 0);
  for (const phase of ['active', 'paused', 'break'] as const) {
    state.currentSession.phase = phase;
    assert.equal(offerPrompt(undefined, state, VISIT_GAP_MS * 2).prompt, null);
  }
  state.currentSession = { phase: 'idle' };
  state.settings.autoSessionIntro = false;
  assert.equal(offerPrompt(undefined, state, 0).prompt, null);
  state.settings.autoSessionIntro = true; state.settings.extensionPaused = true;
  assert.equal(offerPrompt(undefined, state, 0).prompt, null);
});
test('checkpoint claims persist across tabs but deliberately revised targets offer a new check-in', () => {
  const state = defaultSnapshot();
  applyCommand(state, { requestId: 's', expectedRevision: 0, expectedSessionId: null, command: { action: 'start', plan: { intention: 'Your session', targetMs: 60000 } } }, 0);
  assert(state.currentSession.phase !== 'idle');
  state.currentSession.phase = 'checkpoint'; state.currentSession.elapsedMs = 60000;
  const first = offerPrompt(undefined, state, 0);
  assert.equal(first.prompt, 'checkpoint');
  assert.equal(offerPrompt(first.visit, state, VISIT_GAP_MS).prompt, null);
  state.currentSession.history.targetRevisions.push({ kind: 'edit', at: 100, fromMs: 120000, toMs: 60000 });
  assert.equal(offerPrompt(first.visit, state, 100).prompt, 'checkpoint');
});
test('schema 6 upgrades enable automatic intros while preserving the existing collapse preference and all saved data', () => {
  const prior = defaultSnapshot();
  prior.settings.indicatorCollapsed = false;
  const { autoSessionIntro: _, ...settings } = prior.settings;
  const old = { ...prior, schemaVersion: 6, settings };
  const result = migrate(old);
  assert.equal(result.schemaVersion, 7); assert.equal(result.settings.autoSessionIntro, true);
  assert.equal(result.settings.indicatorCollapsed, false);
  assert.deepEqual(result.currentSession, prior.currentSession);
  assert.equal(settingsPatch({ autoSessionIntro: 'yes' }), false);
  assert.equal(settingsPatch({ autoSessionIntro: false }), true);
});
