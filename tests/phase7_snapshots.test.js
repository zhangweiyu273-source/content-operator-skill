const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');
const { writeSnapshot } = require('../storage/snapshots');
const { recordedSync } = require('../app/sync_run');

test('writes immutable snapshot files with unique run IDs', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-snapshot-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const common = { kind: 'account', account_id: 'a1', snapshot_time: '2026-09-01T00:00:00Z', data: { followers: 1 } };
  const first = writeSnapshot(root, { ...common, sync_run_id: 'run-1' });
  const second = writeSnapshot(root, { ...common, sync_run_id: 'run-2' });
  assert.notEqual(first, second);
  assert.equal(fs.readdirSync(root).length, 2);
  assert.equal(JSON.parse(fs.readFileSync(first)).data.followers, 1);
});

test('records pass and fail sync runs without page query strings', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-runs-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repo = new Repository(database);
  const pass = await recordedSync(repo, { accountId: 'a1', collector: 'fixture', pageUrl: 'https://example.test/page?token=secret' }, async () => ({ status: 'PASS', item_count: 2 }));
  await assert.rejects(recordedSync(repo, { accountId: 'a1', collector: 'fixture' }, async () => { throw new Error('TEST_FAILURE'); }));
  const rows = database.db.prepare('SELECT * FROM sync_runs ORDER BY start_time').all();
  assert.equal(rows.length, 2);
  assert.equal(rows.find(row => row.sync_run_id === pass.sync_run_id).page_url, 'https://example.test/page');
  assert.ok(rows.some(row => row.result === 'FAIL'));
  assert.equal(JSON.stringify(rows).includes('secret'), false);
});
