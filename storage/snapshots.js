const fs = require('node:fs');
const path = require('node:path');

function safePart(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
}

function writeSnapshot(directory, { kind, account_id, snapshot_time, sync_run_id, data }) {
  if (!['account', 'stage', 'note-list', 'single-note'].includes(kind)) throw new Error('SNAPSHOT_KIND_INVALID');
  fs.mkdirSync(directory, { recursive: true });
  const time = new Date(snapshot_time || Date.now()).toISOString();
  const filename = `${time.replace(/[:.]/g, '-')}_${safePart(account_id)}_${kind}_${safePart(sync_run_id)}.json`;
  const target = path.join(directory, filename);
  const temporary = `${target}.tmp`;
  const payload = { schema_version: 1, kind, account_id, snapshot_time: time, sync_run_id, data };
  fs.writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temporary, target);
  return target;
}

module.exports = { safePart, writeSnapshot };
