const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { ConnectorService } = require('../app/service');

function fakePage() {
  return {
    async evaluate(expression) {
      if (expression.includes('const checks =')) return { checks: {}, structureVisible: true, title: '创作中心', url: 'https://creator.xiaohongshu.com/home' };
      if (expression.includes('page_title:')) return { nickname: '测试作者', account_id: 'author_1', profile_url: 'https://creator.xiaohongshu.com/profile?token=drop' };
      if (expression.includes('const fields = {}')) return { note_id: 'note_001', note_url: 'https://creator.xiaohongshu.com/note/note_001?token=drop', title: '测试笔记', publish_time: '2026-09-01', body: '正文', metrics: { impressions: '100', views: '50', likes: '5' } };
      if (expression.includes('const selectors =') && expression.includes('cards = []')) return [{ note_id: 'note_001', note_url: 'https://creator.xiaohongshu.com/note/note_001', title: '测试笔记', publish_time: '2026-09-01', likes: '5' }];
      if (expression.includes('window.scrollTo')) return { height: 1000, y: 1000 };
      if (expression.includes('metricLabels')) return { nickname: '测试作者', account_id: 'author_1', bio: '简介', followers: '100', following: '20', total_likes_and_saves: '500', note_count: '1' };
      throw new Error('UNEXPECTED_EXPRESSION');
    },
    close() {},
  };
}

test('runs identity, account, notes, snapshots, audit and export as one local workflow', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-e2e-'));
  const service = new ConnectorService(path.join(root, 'workspace'));
  t.after(() => { service.close(); fs.rmSync(root, { recursive: true, force: true }); });
  service.withPage = async operation => operation(fakePage(), { url: 'https://creator.xiaohongshu.com/home?token=drop' });
  const inspected = await service.inspectIdentity();
  await service.confirmIdentity(inspected.candidate.account_id);
  const account = await service.sync('account');
  const notes = await service.sync('notes');
  const output = service.exportBundle();
  assert.equal(account.status, 'PASS');
  assert.equal(notes.status, 'PASS');
  assert.equal(output.note_count, 1);
  assert.equal((await service.status()).note_count, 1);
  assert.equal(service.database.db.prepare('SELECT COUNT(*) AS n FROM sync_runs WHERE result=?').get('PASS').n, 2);
  assert.ok(fs.readdirSync(path.join(root, 'workspace', 'snapshots')).length >= 2);
  assert.ok(fs.statSync(output.zip_path).size > 0);
  const allAudit = JSON.stringify(service.database.db.prepare('SELECT page_url, details_json FROM sync_runs').all());
  assert.equal(allAudit.includes('token=drop'), false);
});
