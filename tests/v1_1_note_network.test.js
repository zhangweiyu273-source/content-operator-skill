const assert = require('node:assert/strict');
const test = require('node:test');
const { CdpSession } = require('../browser/cdp');
const { captureNoteListNetwork } = require('../collectors/note_list_api');
const { extractNotePayload } = require('../collectors/note_payload_parser');

class FakeSocket {
  static OPEN = 1; static CLOSING = 2;
  constructor() { this.readyState = FakeSocket.OPEN; this.handlers = new Map(); queueMicrotask(() => this.emit('open', {})); }
  addEventListener(name, handler) { if (!this.handlers.has(name)) this.handlers.set(name, []); this.handlers.get(name).push(handler); }
  emit(name, value) { for (const handler of this.handlers.get(name) || []) handler(value); }
  send(raw) {
    const command = JSON.parse(raw);
    const result = command.method === 'Network.getResponseBody' ? { body: '{"ok":true}', base64Encoded: false } : {};
    queueMicrotask(() => this.emit('message', { data: JSON.stringify({ id: command.id, result }) }));
  }
  close() { this.readyState = FakeSocket.CLOSING; this.emit('close', {}); }
}

test('CDP dispatches events, removes listeners, and reads response bodies', async () => {
  const cdp = new CdpSession('ws://127.0.0.1/devtools/page/1', { WebSocketImpl: FakeSocket });
  const seen = [];
  const handler = event => seen.push(event.requestId);
  cdp.on('Network.loadingFinished', handler);
  await cdp.connect();
  cdp.socket.emit('message', { data: JSON.stringify({ method: 'Network.loadingFinished', params: { requestId: 'r1' } }) });
  assert.deepEqual(await cdp.send('Network.getResponseBody', { requestId: 'r1' }), { body: '{"ok":true}', base64Encoded: false });
  cdp.off('Network.loadingFinished', handler);
  cdp.socket.emit('message', { data: JSON.stringify({ method: 'Network.loadingFinished', params: { requestId: 'r2' } }) });
  assert.deepEqual(seen, ['r1']);
  cdp.close();
  assert.equal(cdp.listeners.size, 0);
});

test('recognizes multiple nested notes and pagination without accepting random ids', () => {
  const payload = { data: { note_list: [
    { note_id: 'note_000001', title: '一', publish_time: '2026-09-01', like_count: 3 },
    { noteId: 'note_000002', displayTitle: '二', createTime: 1788192000, viewCount: 9 },
    { id: 'note_000003', title: '三', publishTime: '2026-09-03', commentCount: 2 },
    { id: 'random_999999', name: 'ordinary object', value: 8 },
  ], cursor: 'next-1', has_more: true, total: 3 } };
  const result = extractNotePayload(payload);
  assert.deepEqual(result.notes.map(note => note.note_id), ['note_000001', 'note_000002', 'note_000003']);
  assert.ok(result.pagination.some(page => page.cursor === 'next-1' && page.has_more === true && page.total === 3));
});

test('parses 200+ and 1000+ list payloads without loss', () => {
  for (const size of [250, 1200]) {
    const payload = { data: { notes: Array.from({ length: size }, (_, index) => ({ noteId: `note_${String(index).padStart(6, '0')}`, title: `标题${index}`, publishTime: '2026-09-01', likeCount: index })) } };
    assert.equal(extractNotePayload(payload).notes.length, size);
  }
});

test('network collector reads creator-center Fetch/XHR JSON and cleans listeners', async () => {
  const listeners = new Map();
  const page = {
    on(name, handler) { listeners.set(name, handler); }, off(name) { listeners.delete(name); },
    async send(method) {
      if (method === 'Network.getResponseBody') return { body: JSON.stringify({ data: { notes: [{ note_id: 'note_api_01', title: '网络笔记', publish_time: '2026-09-01' }], next_cursor: 'x', hasMore: false } }) };
      return {};
    },
  };
  const result = await captureNoteListNetwork(page, async () => {
    listeners.get('Network.responseReceived')({ requestId: 'r1', type: 'Fetch', response: { url: 'https://creator.xiaohongshu.com/api/notes' } });
    listeners.get('Network.loadingFinished')({ requestId: 'r1' });
    return { data: [], errors: [] };
  }, { reload: false, initialWaitMs: 0, settleMs: 0, wait: async () => {} });
  assert.equal(result.notes[0].note_id, 'note_api_01');
  assert.equal(result.response_count, 1);
  assert.equal(listeners.size, 0);
});
