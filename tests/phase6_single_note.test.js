const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectSingleNote } = require('../collectors/single_note');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');

test('keeps absent detail metrics null without inventing values', async () => {
  const page = { evaluate: async () => ({ note_id: 'n123456', note_url: 'https://example.test/note/n123456?token=x', title: '标题', publish_time: '2026年9月1日 10:30', body: '正文', metrics: { impressions: '1.2万', likes: null } }) };
  const result = await collectSingleNote(page);
  assert.equal(result.status, 'PASS');
  assert.equal(result.data.metrics.impressions, 12000);
  assert.equal(result.data.metrics.likes, null);
  assert.equal(result.data.metrics.dms, null);
  assert.equal(result.data.note_url, 'https://example.test/note/n123456');
});

test('stores all observed detail metrics in a new snapshot', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-single-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repo = new Repository(database);
  repo.saveAccountSnapshot({ account_id: 'a1', nickname: '作者', snapshot_time: '2026-09-01T00:00:00.000Z' });
  repo.saveSingleNote('a1', { note_id: 'n1', title: '标题', snapshot_time: '2026-09-02T00:00:00.000Z', metrics: { impressions: 100, profile_visits: 3, dms: 1 } });
  const row = database.db.prepare('SELECT * FROM note_snapshots WHERE note_id=?').get('n1');
  assert.equal(row.impressions, 100);
  assert.equal(row.profile_visits, 3);
  assert.equal(row.dms, 1);
  assert.equal(row.views, null);
});
