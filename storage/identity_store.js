const fs = require('node:fs');
const path = require('node:path');

function readIdentity(filename) {
  if (!fs.existsSync(filename)) return null;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function bindIdentity(filename, candidate) {
  if (!candidate?.account_id || !candidate?.nickname) throw new Error('IDENTITY_INCOMPLETE');
  const existing = readIdentity(filename);
  if (existing && existing.account_id !== candidate.account_id) throw new Error('ACCOUNT_IDENTITY_ALREADY_BOUND');
  const record = {
    schema_version: 1,
    account_id: candidate.account_id,
    nickname: candidate.nickname,
    profile_url: candidate.profile_url || null,
    avatar_url: candidate.avatar_url || null,
    confirmed_by_user_at: existing?.confirmed_by_user_at || new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, filename);
  return record;
}

function verifyIdentity(filename, current) {
  const bound = readIdentity(filename);
  if (!bound) return { ACCOUNT_IDENTITY_VERIFIED: 'NO', USER_ACTION_REQUIRED: 'YES', reason: 'IDENTITY_NOT_BOUND' };
  if (!current?.account_id) return { ACCOUNT_IDENTITY_VERIFIED: 'NO', USER_ACTION_REQUIRED: 'YES', reason: 'IDENTITY_NOT_VISIBLE' };
  if (bound.account_id !== current.account_id) {
    return { ACCOUNT_IDENTITY_VERIFIED: 'NO', ACCOUNT_MISMATCH: 'YES', SYNC_ABORTED: 'YES', reason: 'ACCOUNT_MISMATCH' };
  }
  return { ACCOUNT_IDENTITY_VERIFIED: 'YES', account: bound };
}

module.exports = { bindIdentity, readIdentity, verifyIdentity };
