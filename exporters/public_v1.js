const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createXlsx, safeSpreadsheetText } = require('./xlsx');
const { createZip } = require('./zip');

const METRICS = ['impressions', 'views', 'clicks', 'likes', 'saves', 'comments', 'follows', 'profile_visits', 'dms', 'leads'];
const EXPORT_FILES = ['account_profile_input.json', 'notes.json', 'latest_snapshot.json', 'publication_manifest_input.json', 'notes.csv', 'notes.xlsx'];

function jsonFile(filename, value) { fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function csvCell(value) { const text = safeSpreadsheetText(value).replace(/"/g, '""'); return `"${text}"`; }

function exportPublicV1(database, exportDirectory, accountId) {
  fs.mkdirSync(exportDirectory, { recursive: true });
  const account = database.db.prepare('SELECT * FROM accounts WHERE account_id=?').get(accountId);
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  const generatedAt = new Date().toISOString();
  const rows = database.db.prepare(`SELECT n.*,
    s.snapshot_time, s.impressions, s.views, s.clicks, s.likes, s.saves, s.comments,
    s.follows, s.profile_visits, s.dms, s.leads
    FROM notes n LEFT JOIN note_snapshots s ON s.id=(SELECT id FROM note_snapshots
      WHERE account_id=n.account_id AND note_id=n.note_id ORDER BY snapshot_time DESC, id DESC LIMIT 1)
    WHERE n.account_id=? ORDER BY n.publish_time DESC, n.note_id`).all(accountId);
  const accountProfile = {
    account_name: account.nickname || '', source_channel: 'xiaohongshu', current_positioning: '',
    target_audience: [], audience_problems: [], content_pillars: [], commercial_goal: '',
    primary_conversion_action: '', creator_advantages: [], real_experience_assets: [], prohibited_claims: [],
    style_profile: { tone: [], sentence_style: [], emoji_level: '', preferred_openings: [], preferred_structures: [], disliked_patterns: [] },
    content_constraints: [], updated_at: account.updated_at || generatedAt,
  };
  const notes = rows.map(row => {
    const snapshotTime = row.snapshot_time || generatedAt;
    const age = row.publish_time ? Math.max(0, (new Date(snapshotTime) - new Date(row.publish_time)) / 3600000) : null;
    return {
      note_id: row.note_id, note_url: row.note_url || '', publish_time: row.publish_time || '', snapshot_time: snapshotTime,
      note_age_hours: Number.isFinite(age) ? Math.round(age * 100) / 100 : null, title: row.title || '', cover_copy: '',
      body: row.body || '', topic: '', content_pillar: '', topic_mode: '',
      metrics: Object.fromEntries(METRICS.map(field => [field, row[field] ?? null])),
      evidence: { source_type: 'LOCAL_DATA_CONNECTOR', source_file: 'local-database', confidence: 'PAGE_VISIBLE' },
    };
  });
  const latestSnapshot = database.db.prepare('SELECT * FROM account_snapshots WHERE account_id=? ORDER BY snapshot_time DESC, id DESC LIMIT 1').get(accountId) || null;
  jsonFile(path.join(exportDirectory, 'account_profile_input.json'), accountProfile);
  jsonFile(path.join(exportDirectory, 'notes.json'), notes);
  jsonFile(path.join(exportDirectory, 'latest_snapshot.json'), latestSnapshot);
  const columns = ['note_id', 'note_url', 'publish_time', 'snapshot_time', 'title', ...METRICS];
  const tableRows = [columns, ...notes.map(note => columns.map(column => METRICS.includes(column) ? note.metrics[column] : note[column]))];
  fs.writeFileSync(path.join(exportDirectory, 'notes.csv'), tableRows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'utf8');
  createXlsx(path.join(exportDirectory, 'notes.xlsx'), tableRows);
  const manifest = {
    schema_version: 'content-operator-connector-export-v1', generated_at: generatedAt, account_id: accountId,
    note_count: notes.length, public_skill_schema_version: 'public-v1',
    files: ['account_profile_input.json', 'notes.json', 'latest_snapshot.json', 'notes.csv', 'notes.xlsx'].map(name => {
      const data = fs.readFileSync(path.join(exportDirectory, name)); return { name, bytes: data.length, sha256: sha256(data) };
    }),
  };
  jsonFile(path.join(exportDirectory, 'publication_manifest_input.json'), manifest);
  const zipPath = path.join(exportDirectory, 'content_operator_bundle.zip');
  createZip(zipPath, EXPORT_FILES.map(name => ({ name, data: fs.readFileSync(path.join(exportDirectory, name)) })));
  return { directory: exportDirectory, zip_path: zipPath, files: [...EXPORT_FILES, 'content_operator_bundle.zip'], note_count: notes.length };
}

module.exports = { EXPORT_FILES, METRICS, exportPublicV1 };
