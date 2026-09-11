const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { assertPageSafe } = require('../collectors/page_guard');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');
const { recordedSync } = require('../app/sync_run');

test('stops for captcha, risk, permission and schema changes', async () => {
  for (const code of ['CAPTCHA_REQUIRED', 'LOGIN_REQUIRED', 'RISK_CONTROL', 'PERMISSION_DENIED']) {
    const page = { evaluate: async () => ({ checks: { [code]: true }, structureVisible: true }) };
    await assert.rejects(assertPageSafe(page, 'notes'), error => error.code === code && error.details.USER_ACTION_REQUIRED === 'YES');
  }
  const changed = { evaluate: async () => ({ checks: {}, structureVisible: false }) };
  await assert.rejects(assertPageSafe(changed, 'notes'), error => error.code === 'PAGE_SCHEMA_CHANGED' && error.details.PAGE_SCHEMA_CHANGED === 'YES');
  await assert.doesNotReject(assertPageSafe({ evaluate: async () => ({ checks: {}, structureVisible: true }) }, 'notes'));
});

test('audit records user-action stops as ABORTED', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-guard-'));
  const database = new LocalDatabase(path.join(root, 'test.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repo = new Repository(database);
  await assert.rejects(recordedSync(repo, { collector: 'notes' }, async () => {
    const error = new Error('manual action'); error.code = 'CAPTCHA_REQUIRED'; error.syncResult = 'ABORTED'; throw error;
  }));
  const row = database.db.prepare('SELECT result, details_json FROM sync_runs').get();
  assert.equal(row.result, 'ABORTED');
  assert.equal(JSON.parse(row.details_json).error_code, 'CAPTCHA_REQUIRED');
});
