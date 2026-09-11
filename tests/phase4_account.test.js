const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectAccount } = require('../collectors/account');
const { parseCount } = require('../parsers/numbers');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');

test('parses localized counts strictly', () => {
  assert.equal(parseCount('1.2万'), 12000);
  assert.equal(parseCount('3,210'), 3210);
  assert.equal(parseCount('--'), null);
  assert.throws(() => parseCount('大约十万'), /INVALID_NUMBER/);
});

test('missing metrics remain null and invalid metrics raise attention', async () => {
  const page = { evaluate: async () => ({ nickname: '作者', account_id: 'a1', followers: '1.5万', following: null, total_likes_and_saves: '异常', note_count: '23' }) };
  const result = await collectAccount(page);
  assert.equal(result.data.followers, 15000);
  assert.equal(result.data.following, null);
  assert.equal(result.data.total_likes_and_saves, null);
  assert.equal(result.status, 'ATTENTION');
  assert.equal(result.errors[0].field, 'total_likes_and_saves');
});

test('stores a current account record and append-only snapshot', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-account-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repository = new Repository(database);
  repository.saveAccountSnapshot({ account_id: 'a1', nickname: '作者', followers: 100, snapshot_time: '2026-01-01T00:00:00.000Z' });
  repository.saveAccountSnapshot({ account_id: 'a1', nickname: '作者', followers: 110, snapshot_time: '2026-01-02T00:00:00.000Z' });
  assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n, 1);
  assert.equal(database.db.prepare('SELECT followers FROM accounts WHERE account_id=?').get('a1').followers, 110);
  assert.equal(database.db.prepare('SELECT COUNT(*) AS n FROM account_snapshots').get().n, 2);
});
