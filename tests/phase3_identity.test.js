const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { collectIdentity } = require('../collectors/identity');
const { avatarIdentityKey, bindIdentity, readIdentity, verifyIdentity } = require('../storage/identity_store');
const selectors = require('../collectors/selectors/xiaohongshu');

test('collects only normalized identity fields from page result', async () => {
  const page = { evaluate: async () => ({ nickname: ' 测试 用户 ', account_id: '小红书号： user_123', profile_url: 'https://example.test/profile?token=secret', avatar_url: 'https://cdn.test/a.png?sig=secret' }) };
  const result = await collectIdentity(page);
  assert.equal(result.nickname, '测试 用户');
  assert.equal(result.account_id, 'user_123');
  assert.equal(result.profile_url, 'https://example.test/profile');
  assert.equal(result.avatar_url, 'https://cdn.test/a.png');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('recognizes the current creator home account card structure', () => {
  assert.equal(selectors.identity.root[0], '.home-card-wrapper .personal .base');
  assert.ok(selectors.identity.nickname.includes('.home-card-wrapper .personal .base .account-name'));
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

test('verifies bound account on subpages only when nickname and avatar both match', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-identity-subpage-'));
  const filename = path.join(root, 'account_identity.json');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  bindIdentity(filename, { account_id: 'a1', nickname: '甲', avatar_url: 'https://img.test/avatar/stableavataridentifier!750w.jpg' });
  const verified = verifyIdentity(filename, { account_id: null, nickname: '甲', avatar_url: 'https://other-cdn.test/stableavataridentifier' });
  assert.equal(verified.ACCOUNT_IDENTITY_VERIFIED, 'YES');
  assert.equal(verified.verification_method, 'nickname_avatar');
  assert.equal(avatarIdentityKey('https://img.test/avatar/stableavataridentifier!750w.jpg'), 'stableavataridentifier');
  assert.equal(verifyIdentity(filename, { account_id: null, nickname: '乙', avatar_url: 'https://other-cdn.test/stableavataridentifier' }).ACCOUNT_MISMATCH, 'YES');
  assert.equal(verifyIdentity(filename, { account_id: null, nickname: '甲', avatar_url: null }).reason, 'IDENTITY_NOT_VISIBLE');
});
