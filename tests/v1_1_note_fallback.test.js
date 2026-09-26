const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectNotes, SCROLL_EXPRESSION } = require('../collectors/notes');
const { ConnectorService, ensureCollectorPage } = require('../app/service');
const { bindIdentity } = require('../storage/identity_store');

test('uses DOM fallback when CDP network events are unavailable', async () => {
  let round = 0;
  const page = { evaluate: async expression => expression === SCROLL_EXPRESSION ? { height: 1000 } : (round++ ? [] : [{ note_id: 'fallback_01', title: '回退笔记', publish_time: '2026-09-01' }]) };
  const result = await collectNotes(page, { maxRounds: 5, stableRounds: 2, delayMs: 0, wait: async () => {} });
  assert.equal(result.data.length, 1);
  assert.equal(result.sources.api_network, 0);
  assert.equal(result.sources.dom_fallback, 1);
  assert.equal(result.network_unavailable, true);
});

test('ignores selector matches that have no note identity', async () => {
  let round = 0;
  const page = { evaluate: async expression => expression === SCROLL_EXPRESSION ? { height: 1000 } : (round++ ? [] : [{ note_id: null, title: null }, { note_id: 'real_note_01', title: '真实笔记', publish_time: '2026-09-01' }]) };
  const result = await collectNotes(page, { maxRounds: 4, stableRounds: 2, delayMs: 0, wait: async () => {} });
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.data.map(note => note.note_id), ['real_note_01']);
});

test('auto-navigates creator pages to note manager but keeps single-note route separate', async () => {
  const commands = []; let href = 'https://creator.xiaohongshu.com/statistics/note-detail?noteId=detail_01';
  const page = { send: async (method, params) => { commands.push(method); if (method === 'Page.navigate') href = params.url; }, evaluate: async () => href };
  const target = await ensureCollectorPage(page, { url: 'https://creator.xiaohongshu.com/new/home' }, 'notes', { wait: async () => {}, maxAttempts: 2 });
  assert.equal(new URL(target.url).pathname, '/new/note-manager');
  assert.deepEqual(commands, ['Page.enable', 'Page.navigate']);
  commands.length = 0;
  await ensureCollectorPage(page, { url: 'https://creator.xiaohongshu.com/statistics/note-detail?noteId=detail_01' }, 'single-note');
  assert.deepEqual(commands, []);
});

test('identity mismatch aborts history sync before collection', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-v11-mismatch-'));
  const service = new ConnectorService(path.join(root, 'workspace'));
  t.after(() => { service.close(); fs.rmSync(root, { recursive: true, force: true }); });
  bindIdentity(service.workspace.identity, { account_id: 'bound_account', nickname: '本人' });
  service.withPage = async operation => operation({ evaluate: async expression => expression.includes('page_title:')
    ? { account_id: 'other_account', nickname: '其他账号' } : { checks: {}, structureVisible: true } }, { url: 'https://creator.xiaohongshu.com/new/note-manager' });
  await assert.rejects(service.sync('notes'), error => error.code === 'ACCOUNT_MISMATCH' && error.syncResult === 'ABORTED');
  assert.equal(service.database.db.prepare('SELECT result FROM sync_runs').get().result, 'ABORTED');
});
