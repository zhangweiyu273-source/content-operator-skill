const crypto = require('node:crypto');
const path = require('node:path');
const { CdpSession } = require('../browser/cdp');
const { DedicatedBrowser } = require('../browser/edge');
const { collectIdentity } = require('../collectors/identity');
const { collectAccount } = require('../collectors/account');
const { collectNotes } = require('../collectors/notes');
const { collectSingleNote } = require('../collectors/single_note');
const { collectStageSnapshot } = require('../collectors/stage_snapshot');
const { sanitizePageUrl } = require('../collectors/page_helpers');
const { assertPageSafe } = require('../collectors/page_guard');
const { exportPublicV1 } = require('../exporters/public_v1');
const { LocalDatabase } = require('../storage/database');
const { bindIdentity, readIdentity, verifyIdentity } = require('../storage/identity_store');
const { Repository } = require('../storage/repository');
const { writeSnapshot } = require('../storage/snapshots');
const { ensureWorkspace } = require('../storage/workspace');
const { recordedSync } = require('./sync_run');

class ConnectorService {
  constructor(workspaceRoot) {
    this.workspace = ensureWorkspace(workspaceRoot);
    this.database = new LocalDatabase(this.workspace.database);
    this.repository = new Repository(this.database);
    this.browser = new DedicatedBrowser({ profilePath: this.workspace.browserProfile });
  }

  async withPage(operation) {
    const pages = await this.browser.listPages();
    const target = [...pages].reverse().find(page => /^https?:\/\/([^/]+\.)?xiaohongshu\.com\//i.test(page.url));
    if (!target) throw Object.assign(new Error('请在专属浏览器中打开小红书创作者后台页面。'), { code: 'PLATFORM_PAGE_NOT_OPEN' });
    const page = new CdpSession(target.webSocketDebuggerUrl);
    try { return await operation(page, target); } finally { page.close(); }
  }

  async inspectIdentity() {
    return this.withPage(async (page, target) => {
      await assertPageSafe(page, 'identity');
      const candidate = await collectIdentity(page);
      const verification = verifyIdentity(this.workspace.identity, candidate);
      if (!candidate.account_id && verification.ACCOUNT_IDENTITY_VERIFIED === 'YES') candidate.account_id = verification.account.account_id;
      return { candidate, verification, page_url: sanitizePageUrl(target.url) };
    });
  }

  async confirmIdentity(expectedAccountId) {
    const inspected = await this.inspectIdentity();
    if (!expectedAccountId || inspected.candidate.account_id !== expectedAccountId) throw Object.assign(new Error('页面账号已变化，请重新检查。'), { code: 'IDENTITY_CANDIDATE_CHANGED' });
    return bindIdentity(this.workspace.identity, inspected.candidate);
  }

  async verifiedPage(operation) {
    return this.withPage(async (page, target) => {
      const current = await collectIdentity(page);
      const verification = verifyIdentity(this.workspace.identity, current);
      if (verification.ACCOUNT_IDENTITY_VERIFIED !== 'YES') {
        const error = new Error(verification.reason === 'ACCOUNT_MISMATCH' ? '当前登录账号与本地账号档案不一致，请确认后再同步。' : '请先检查并确认当前账号。');
        error.code = verification.reason;
        error.details = verification;
        error.syncResult = 'ABORTED';
        throw error;
      }
      return operation(page, target, verification.account);
    });
  }

  async sync(kind) {
    const collectors = {
      account: collectAccount, notes: collectNotes, 'single-note': collectSingleNote, stage: collectStageSnapshot,
    };
    if (!collectors[kind]) throw Object.assign(new Error('未知同步类型。'), { code: 'COLLECTOR_UNKNOWN' });
    const bound = readIdentity(this.workspace.identity);
    return recordedSync(this.repository, { accountId: bound?.account_id || null, collector: kind }, async syncRunId => this.verifiedPage(async (page, target, account) => {
      await assertPageSafe(page, kind);
      const collected = await collectors[kind](page);
      if (kind === 'account') {
        collected.data.account_id = account.account_id;
        collected.data.nickname ||= account.nickname;
        this.repository.saveAccountSnapshot(collected.data);
      } else if (kind === 'notes') {
        collected.summary = this.repository.saveNotes(account.account_id, collected.data);
      } else if (kind === 'single-note') {
        if (!collected.data.note_id) throw Object.assign(new Error('当前页面无法识别笔记 ID。'), { code: 'NOTE_ID_MISSING' });
        this.repository.saveSingleNote(account.account_id, collected.data);
      } else if (kind === 'stage') {
        this.repository.saveStageSnapshot(account.account_id, collected.data);
      }
      const pageUrl = sanitizePageUrl(target.url);
      this.repository.addSourcePage({ syncRunId, pageUrl, pageKind: kind, structureFingerprint: crypto.createHash('sha256').update(kind).digest('hex'), evidence: { fields: Object.keys(collected.data || {}) } });
      const snapshotPath = writeSnapshot(this.workspace.snapshots, {
        kind: kind === 'notes' ? 'note-list' : kind, account_id: account.account_id,
        snapshot_time: collected.data?.snapshot_time || new Date().toISOString(), sync_run_id: syncRunId, data: collected.data,
      });
      return {
        status: collected.status, errors: collected.errors, item_count: Array.isArray(collected.data) ? collected.data.length : 1,
        details: { summary: collected.summary || null, snapshot_file: path.basename(snapshotPath), page: pageUrl },
      };
    }));
  }

  exportBundle() {
    const identity = readIdentity(this.workspace.identity);
    if (!identity) throw Object.assign(new Error('请先确认账号并同步数据。'), { code: 'IDENTITY_NOT_BOUND' });
    return exportPublicV1(this.database, this.workspace.exports, identity.account_id);
  }

  async status() {
    const identity = readIdentity(this.workspace.identity);
    const noteCount = identity ? this.database.db.prepare('SELECT COUNT(*) AS count FROM notes WHERE account_id=?').get(identity.account_id).count : 0;
    const lastSync = this.database.db.prepare(`SELECT sync_run_id, start_time, end_time, collector, result, item_count, error_count
      FROM sync_runs ORDER BY start_time DESC LIMIT 1`).get() || null;
    return { browser: await this.browser.status(), account: identity, note_count: noteCount, last_sync: lastSync, database: this.database.healthCheck() };
  }

  recentData() {
    const identity = readIdentity(this.workspace.identity);
    if (!identity) return { account: null, notes: [], sync_runs: [] };
    return {
      account: this.database.db.prepare('SELECT * FROM accounts WHERE account_id=?').get(identity.account_id) || null,
      notes: this.database.db.prepare('SELECT note_id, title, publish_time, status, updated_at FROM notes WHERE account_id=? ORDER BY updated_at DESC LIMIT 100').all(identity.account_id),
      sync_runs: this.database.db.prepare('SELECT start_time, end_time, collector, result, item_count, error_count FROM sync_runs ORDER BY start_time DESC LIMIT 20').all(),
    };
  }

  close() { this.database.close(); }
}

module.exports = { ConnectorService };
