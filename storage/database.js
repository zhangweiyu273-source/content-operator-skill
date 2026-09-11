const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');
const { MIGRATIONS } = require('./migrations');

class LocalDatabase {
  constructor(filename) {
    this.filename = filename;
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    this.migrate();
  }

  migrate() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
    const applied = new Set(this.db.prepare('SELECT version FROM schema_migrations').all().map(row => row.version));
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      this.transaction(() => {
        this.db.exec(migration.sql);
        this.db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)')
          .run(migration.version, new Date().toISOString());
      });
    }
  }

  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn(this.db);
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  schemaVersion() {
    return this.db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version;
  }

  healthCheck() {
    const quickCheck = this.db.prepare('PRAGMA quick_check').all().map(row => Object.values(row)[0]);
    const foreignKeyErrors = this.db.prepare('PRAGMA foreign_key_check').all();
    return {
      healthy: quickCheck.length === 1 && quickCheck[0] === 'ok' && foreignKeyErrors.length === 0,
      quick_check: quickCheck,
      foreign_key_errors: foreignKeyErrors,
      schema_version: this.schemaVersion(),
    };
  }

  async createBackup(directory) {
    fs.mkdirSync(directory, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(directory, `content_operator-${stamp}.db`);
    await backup(this.db, destination);
    return destination;
  }

  close() {
    this.db.close();
  }
}

module.exports = { LocalDatabase };
