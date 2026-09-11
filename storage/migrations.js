const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE accounts (
        account_id TEXT PRIMARY KEY,
        nickname TEXT,
        profile_url TEXT,
        avatar_url TEXT,
        bio TEXT,
        followers INTEGER CHECK (followers IS NULL OR followers >= 0),
        following INTEGER CHECK (following IS NULL OR following >= 0),
        total_likes_and_saves INTEGER CHECK (total_likes_and_saves IS NULL OR total_likes_and_saves >= 0),
        note_count INTEGER CHECK (note_count IS NULL OR note_count >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
        note_id TEXT NOT NULL,
        note_url TEXT,
        title TEXT,
        publish_time TEXT,
        cover_url TEXT,
        status TEXT,
        body TEXT,
        first_seen_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(account_id, note_id)
      );

      CREATE TABLE note_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        note_id TEXT NOT NULL,
        snapshot_time TEXT NOT NULL,
        impressions INTEGER, views INTEGER, clicks INTEGER, likes INTEGER,
        saves INTEGER, comments INTEGER, follows INTEGER, profile_visits INTEGER,
        dms INTEGER, leads INTEGER,
        source_page_id INTEGER,
        created_at TEXT NOT NULL,
        UNIQUE(account_id, note_id, snapshot_time),
        FOREIGN KEY(account_id, note_id) REFERENCES notes(account_id, note_id) ON DELETE CASCADE
      );

      CREATE TABLE account_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
        snapshot_time TEXT NOT NULL,
        period TEXT,
        followers INTEGER, following INTEGER, total_likes_and_saves INTEGER, note_count INTEGER,
        views INTEGER, impressions INTEGER, profile_visits INTEGER, followers_gain INTEGER,
        data_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(account_id, snapshot_time, period)
      );

      CREATE TABLE sync_runs (
        sync_run_id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        account_id TEXT,
        collector TEXT NOT NULL,
        page_url TEXT,
        result TEXT NOT NULL CHECK(result IN ('RUNNING','PASS','ATTENTION','FAIL','ABORTED')),
        item_count INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        details_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE source_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_run_id TEXT NOT NULL REFERENCES sync_runs(sync_run_id) ON DELETE CASCADE,
        page_url TEXT,
        page_kind TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        structure_fingerprint TEXT,
        evidence_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX idx_notes_account_publish ON notes(account_id, publish_time);
      CREATE INDEX idx_note_snapshots_lookup ON note_snapshots(account_id, note_id, snapshot_time);
      CREATE INDEX idx_account_snapshots_lookup ON account_snapshots(account_id, snapshot_time);
      CREATE INDEX idx_sync_runs_started ON sync_runs(start_time);
    `,
  },
];

module.exports = { MIGRATIONS };
