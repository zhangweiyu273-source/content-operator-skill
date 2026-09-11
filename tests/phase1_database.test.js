const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LocalDatabase } = require('../storage/database');
const { ensureWorkspace, PRIVATE_DIRS } = require('../storage/workspace');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-phase1-'));
  const workspace = ensureWorkspace(path.join(root, 'workspace'));
  const database = new LocalDatabase(workspace.database);
  return { root, workspace, database };
}

test('initializes isolated empty workspace and schema', t => {
  const f = fixture();
  t.after(() => { f.database.close(); fs.rmSync(f.root, { recursive: true, force: true }); });
  for (const name of PRIVATE_DIRS) assert.ok(fs.statSync(path.join(f.workspace.root, name)).isDirectory());
  assert.equal(f.database.schemaVersion(), 1);
  assert.equal(f.database.healthCheck().healthy, true);
});

test('transaction rolls back all writes on failure', t => {
  const f = fixture();
  t.after(() => { f.database.close(); fs.rmSync(f.root, { recursive: true, force: true }); });
  assert.throws(() => f.database.transaction(db => {
    db.prepare('INSERT INTO accounts(account_id, created_at, updated_at) VALUES (?, ?, ?)')
      .run('a1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    throw new Error('force rollback');
  }));
  assert.equal(f.database.db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count, 0);
});

test('protects note identity and creates healthy backup', async t => {
  const f = fixture();
  t.after(() => { f.database.close(); fs.rmSync(f.root, { recursive: true, force: true }); });
  const now = new Date().toISOString();
  f.database.db.prepare('INSERT INTO accounts(account_id, created_at, updated_at) VALUES (?, ?, ?)').run('a1', now, now);
  const insert = f.database.db.prepare('INSERT INTO notes(account_id, note_id, first_seen_at, updated_at) VALUES (?, ?, ?, ?)');
  insert.run('a1', 'n1', now, now);
  assert.throws(() => insert.run('a1', 'n1', now, now), /UNIQUE/);
  const backupPath = await f.database.createBackup(f.workspace.backups);
  assert.ok(fs.statSync(backupPath).size > 0);
  const backupDb = new LocalDatabase(backupPath);
  assert.equal(backupDb.healthCheck().healthy, true);
  backupDb.close();
});
