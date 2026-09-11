const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectIdentity } = require('../collectors/identity');
const { bindIdentity, readIdentity, verifyIdentity } = require('../storage/identity_store');

test('collects only normalized identity fields from page result', async () => {
  const page = { evaluate: async () => ({ nickname: ' 测试 用户 ', account_id: 'user_123', profile_url: 'https://example.test/profile?token=secret', avatar_url: 'https://cdn.test/a.png?sig=secret' }) };
  const result = await collectIdentity(page);
  assert.equal(result.nickname, '测试 用户');
  assert.equal(result.profile_url, 'https://example.test/profile');
  assert.equal(result.avatar_url, 'https://cdn.test/a.png');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('requires explicit binding and blocks account mismatch', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-identity-'));
  const filename = path.join(root, 'account_identity.json');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(verifyIdentity(filename, { account_id: 'a1' }).reason, 'IDENTITY_NOT_BOUND');
  bindIdentity(filename, { account_id: 'a1', nickname: '甲' });
  assert.equal(readIdentity(filename).account_id, 'a1');
  assert.equal(verifyIdentity(filename, { account_id: 'a1' }).ACCOUNT_IDENTITY_VERIFIED, 'YES');
  const mismatch = verifyIdentity(filename, { account_id: 'a2' });
  assert.equal(mismatch.ACCOUNT_MISMATCH, 'YES');
  assert.equal(mismatch.SYNC_ABORTED, 'YES');
  assert.throws(() => bindIdentity(filename, { account_id: 'a2', nickname: '乙' }), /ALREADY_BOUND/);
});
