const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { createAppServer } = require('../app/server');

test('serves usable local UI and protects state-changing actions', async t => {
  const fake = {
    status: async () => ({ browser: { connected: false }, account: null, note_count: 0, last_sync: null, database: { healthy: true } }),
    recentData: () => ({ account: null, notes: [], sync_runs: [] }), browser: { start: async () => ({ connected: true }) },
  };
  const { server, token } = createAppServer(fake, path.join(__dirname, '..', 'app', 'ui'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(base)).text();
  assert.match(html, /启动专属浏览器/);
  assert.equal(html.includes(token), true);
  assert.equal((await fetch(`${base}/api/status`)).status, 200);
  assert.equal((await fetch(`${base}/api/browser/start`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${base}/api/browser/start`, { method: 'POST', headers: { 'X-Connector-Token': token } })).status, 200);
  assert.equal((await fetch(`${base}/..%2fpackage.json`)).status, 404);
});
