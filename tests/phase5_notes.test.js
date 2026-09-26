const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectNotes, SCROLL_EXPRESSION } = require('../collectors/notes');
const { notesExpression } = require('../collectors/notes');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');

test('scrolls with limits, deduplicates, and reports malformed rows', async () => {
  const batches = [
    [{ note_id: 'note0001', title: '第一篇', publish_time: '2026-09-01', likes: '12' }],
    [{ note_id: 'note0001', title: '第一篇', publish_time: '2026-09-01', likes: '13' }, { note_id: 'note0002', title: '', publish_time: '昨天' }],
    [], [],
  ];
  let batch = 0;
  const page = { evaluate: async expression => expression === SCROLL_EXPRESSION ? {} : batches[Math.min(batch++, batches.length - 1)] };
  const result = await collectNotes(page, { maxRounds: 10, stableRounds: 2, delayMs: 0, wait: async () => {} });
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].metrics.likes, 13);
  assert.equal(result.status, 'ATTENTION');
  assert.ok(result.errors.some(error => error.code === 'TITLE_MISSING'));
  assert.ok(result.errors.some(error => error.code === 'DATE_PARSE_FAILED'));
  assert.ok(batch <= 4);
});

test('groups alternative visible labels before capturing metric values', () => {
  assert.match(notesExpression(), /\(\?:' \+ label \+ '\)\[：/);
  assert.doesNotThrow(() => new Function(`return ${notesExpression()}`));
});

test('upserts notes and appends metric snapshots without duplicates', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-notes-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repo = new Repository(database);
  repo.saveAccountSnapshot({ account_id: 'a1', nickname: '作者', snapshot_time: '2026-09-01T00:00:00.000Z' });
  const first = repo.saveNotes('a1', [{ note_id: 'n1', title: '旧标题', metrics: { likes: 1 } }], '2026-09-02T00:00:00.000Z');
  const second = repo.saveNotes('a1', [{ note_id: 'n1', title: '新标题', metrics: { likes: 2 } }, { note_id: 'n2', title: '二' }], '2026-09-03T00:00:00.000Z');
  assert.deepEqual(first, { found: 1, added: 1, updated: 0 });
  assert.deepEqual(second, { found: 2, added: 1, updated: 1 });
  assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM notes').get().n, 2);
  assert.equal(database.db.prepare('SELECT title FROM notes WHERE note_id=?').get('n1').title, '新标题');
  assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM note_snapshots').get().n, 2);
});
