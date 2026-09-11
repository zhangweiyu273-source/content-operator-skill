const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LocalDatabase } = require('../storage/database');
const { Repository } = require('../storage/repository');
const { exportPublicV1, EXPORT_FILES } = require('../exporters/public_v1');

function zipNames(buffer) {
  const names = [];
  for (let i = 0; i < buffer.length - 4; i += 1) if (buffer.readUInt32LE(i) === 0x04034b50) {
    const size = buffer.readUInt32LE(i + 18); const nameLength = buffer.readUInt16LE(i + 26); const extra = buffer.readUInt16LE(i + 28);
    names.push(buffer.subarray(i + 30, i + 30 + nameLength).toString()); i += 29 + nameLength + extra + size;
  }
  return names;
}

test('exports Public V1 records and a strict whitelist bundle', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-export-'));
  const database = new LocalDatabase(path.join(root, 'content_operator.db'));
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const repo = new Repository(database);
  repo.saveAccountSnapshot({ account_id: 'a1', nickname: '作者', followers: 100, snapshot_time: '2026-09-01T00:00:00.000Z' });
  repo.saveSingleNote('a1', { note_id: 'n1', title: '=公式注入', publish_time: '2026-08-31T00:00:00.000Z', snapshot_time: '2026-09-01T00:00:00.000Z', metrics: { views: 10 } });
  fs.mkdirSync(path.join(root, 'browser_profile')); fs.writeFileSync(path.join(root, 'browser_profile', 'Cookies'), 'secret-cookie');
  const output = exportPublicV1(database, path.join(root, 'exports'), 'a1');
  const notes = JSON.parse(fs.readFileSync(path.join(root, 'exports', 'notes.json')));
  assert.equal(notes[0].metrics.views, 10);
  assert.equal(notes[0].metrics.likes, null);
  assert.equal(notes[0].evidence.source_type, 'LOCAL_DATA_CONNECTOR');
  assert.deepEqual(zipNames(fs.readFileSync(output.zip_path)), EXPORT_FILES);
  assert.equal(fs.readFileSync(output.zip_path).includes(Buffer.from('secret-cookie')), false);
  assert.match(fs.readFileSync(path.join(root, 'exports', 'notes.csv'), 'utf8'), /'=公式注入/);
  assert.equal(fs.readFileSync(path.join(root, 'exports', 'notes.xlsx')).subarray(0, 2).toString(), 'PK');
});
