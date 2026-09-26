const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { mergeNotes } = require('../collectors/notes');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');

test('merges API and DOM notes by note_id with structured non-null fields preferred', () => {
  const dom = [{ note_id: 'n000001', title: 'DOM title', cover: 'https://img.test/dom', metrics: { likes: 2, comments: 1 } }, { note_id: 'n000002', title: 'DOM only', metrics: {} }];
  const api = [{ note_id: 'n000001', title: 'API title', publish_time: '2026-09-01T00:00:00.000Z', cover: null, metrics: { likes: 9, comments: null } }];
  const result = mergeNotes(api, dom);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'API title');
  assert.equal(result[0].cover, 'https://img.test/dom');
  assert.deepEqual(result[0].metrics, { likes: 9, comments: 1 });
});

test('repeated merged sync updates existing notes and never duplicates note_id', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-v11-merge-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repository = new Repository(database);
  repository.saveAccountSnapshot({ account_id: 'account', nickname: '作者', snapshot_time: '2026-08-31T00:00:00.000Z' });
  const first = Array.from({ length: 80 }, (_, index) => ({ note_id: `note_${index}`, title: `旧${index}`, metrics: { likes: index } }));
  const second = [...first.map(note => ({ ...note, title: `新${note.note_id}` })), { note_id: 'note_80', title: '新增一' }, { note_id: 'note_81', title: '新增二' }];
  assert.deepEqual(repository.saveNotes('account', first, '2026-09-01T00:00:00.000Z'), { found: 80, added: 80, updated: 0 });
  assert.deepEqual(repository.saveNotes('account', second, '2026-09-02T00:00:00.000Z'), { found: 82, added: 2, updated: 80 });
  assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM notes').get().n, 82);
});
