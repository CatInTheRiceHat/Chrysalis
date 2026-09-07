import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNEL, parseRequest, senderRole } from '../src/shared/protocol';
import { createHandler } from '../src/shared/handler';
import { createStore } from '../src/shared/storage';
import { defaultSnapshot } from '../src/shared/types';

const id = 'test-extension';
const page = { id, url: `chrome-extension://${id}/popup.html` };
const content = { id, url: 'https://www.youtube.com/watch?v=example', origin: 'https://www.youtube.com', frameId: 0, tab: { id: 7 } } as chrome.runtime.MessageSender;
function setup() {
  let disk = defaultSnapshot();
  const store = createStore({ async read() { return disk; }, async write(value) { disk = value; } });
  return { store, handle: createHandler(store, id, '0.1.0') };
}
test('exact message shapes reject arbitrary patches and prototype-shaped requests', () => {
  for (const request of [null, {}, { channel: CHANNEL, type: 'EVAL', code: '1' },
    { channel: CHANNEL, type: 'PING', url: 'https://example.com' },
    { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: {}, expectedRevision: 0 },
    { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { theme: 'dark', currentSession: {} }, expectedRevision: 0 },
    { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { showIndicator: 'false' }, expectedRevision: 0 },
    { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { theme: 'dark' }, expectedRevision: -1 },
  ]) assert.equal(parseRequest(request), null);
});
test('sender validation rejects foreign extensions, subframes, spoofed domains and other extension pages', () => {
  assert.equal(senderRole(page, id), 'page');
  assert.equal(senderRole({ ...page, url: `chrome-extension://${id}/options.html`, frameId: 0 }, id), 'page');
  assert.equal(senderRole(content, id), 'content');
  for (const sender of [
    {}, { ...content, id: 'other' }, { ...content, frameId: 1 },
    { ...content, url: 'https://www.youtube.com.evil.test/' },
    { ...content, url: 'https://m.youtube.com/' }, { ...content, origin: 'https://evil.test' },
    { ...page, url: `chrome-extension://${id}/unexpected.html` },
  ]) assert.equal(senderRole(sender, id), null);
});
test('content can exchange messages/read display settings but cannot read or write privileged state', async () => {
  const { store, handle } = setup();
  assert.deepEqual(await handle({ channel: CHANNEL, type: 'PING' }, content), { ok: true, type: 'PONG', version: '0.1.0' });
  const display = await handle({ channel: CHANNEL, type: 'GET_SETTINGS' }, content);
  assert.equal(display.ok, true);
  assert.equal('currentSession' in display, false);
  for (const request of [
    { channel: CHANNEL, type: 'GET_SNAPSHOT' },
    { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { showIndicator: false }, expectedRevision: 0 },
  ]) {
    const result = await handle(request, content);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'FORBIDDEN');
  }
  assert.equal((await store.read()).revision, 0);
});
test('extension pages can persist settings and stale messages return a typed conflict', async () => {
  const { handle } = setup();
  const message = { channel: CHANNEL, type: 'UPDATE_SETTINGS', patch: { theme: 'dark' }, expectedRevision: 0 };
  assert.equal((await handle(message, page)).ok, true);
  const repeat = await handle(message, page);
  assert.equal(repeat.ok, false);
  if (!repeat.ok) assert.equal(repeat.code, 'CONFLICT');
  assert.equal((await handle({ channel: CHANNEL, type: 'GET_SNAPSHOT' }, page)).ok, true);
});
