class Repository {
  constructor(database) {
    this.database = database;
  }

  saveAccountSnapshot(account) {
    if (!account.account_id) throw new Error('ACCOUNT_ID_REQUIRED');
    const now = account.snapshot_time || new Date().toISOString();
    return this.database.transaction(db => {
      db.prepare(`INSERT INTO accounts(
        account_id, nickname, bio, followers, following, total_likes_and_saves, note_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET
        nickname=COALESCE(excluded.nickname, accounts.nickname),
        bio=COALESCE(excluded.bio, accounts.bio),
        followers=COALESCE(excluded.followers, accounts.followers),
        following=COALESCE(excluded.following, accounts.following),
        total_likes_and_saves=COALESCE(excluded.total_likes_and_saves, accounts.total_likes_and_saves),
        note_count=COALESCE(excluded.note_count, accounts.note_count),
        updated_at=excluded.updated_at`)
        .run(account.account_id, account.nickname ?? null, account.bio ?? null, account.followers ?? null, account.following ?? null,
          account.total_likes_and_saves ?? null, account.note_count ?? null, now, now);
      db.prepare(`INSERT INTO account_snapshots(
        account_id, snapshot_time, period, followers, following, total_likes_and_saves, note_count, data_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(account.account_id, now, 'current', account.followers ?? null, account.following ?? null,
          account.total_likes_and_saves ?? null, account.note_count ?? null, JSON.stringify(account), now);
      return { account_id: account.account_id, snapshot_time: now };
    });
  }

  saveNotes(accountId, notes, snapshotTime = new Date().toISOString()) {
    if (!accountId) throw new Error('ACCOUNT_ID_REQUIRED');
    return this.database.transaction(db => {
      const exists = db.prepare('SELECT 1 FROM notes WHERE account_id=? AND note_id=?');
      const upsert = db.prepare(`INSERT INTO notes(
        account_id, note_id, note_url, title, publish_time, cover_url, status, first_seen_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, note_id) DO UPDATE SET
        note_url=COALESCE(excluded.note_url, notes.note_url), title=COALESCE(excluded.title, notes.title),
        publish_time=COALESCE(excluded.publish_time, notes.publish_time), cover_url=COALESCE(excluded.cover_url, notes.cover_url),
        status=COALESCE(excluded.status, notes.status), updated_at=excluded.updated_at`);
      const snapshot = db.prepare(`INSERT OR IGNORE INTO note_snapshots(
        account_id, note_id, snapshot_time, views, likes, saves, comments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      let added = 0;
      let updated = 0;
      for (const note of notes) {
        if (!note.note_id) continue;
        const wasPresent = Boolean(exists.get(accountId, note.note_id));
        upsert.run(accountId, note.note_id, note.note_url ?? null, note.title ?? null, note.publish_time ?? null,
          note.cover ?? null, note.status ?? null, snapshotTime, snapshotTime);
        if (wasPresent) updated += 1; else added += 1;
        const metrics = note.metrics || {};
        if (Object.values(metrics).some(value => value !== null && value !== undefined)) {
          snapshot.run(accountId, note.note_id, snapshotTime, metrics.views ?? null, metrics.likes ?? null,
            metrics.saves ?? null, metrics.comments ?? null, snapshotTime);
        }
      }
      return { found: notes.length, added, updated };
    });
  }
}

module.exports = { Repository };
