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
}

module.exports = { Repository };
