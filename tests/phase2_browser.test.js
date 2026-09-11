const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DedicatedBrowser, buildEdgeArgs, findEdge, readStoredPort, reservePort } = require('../browser/edge');

test('finds Edge without looking at daily browser profiles', () => {
  const existing = new Set(['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe']);
  assert.equal(findEdge({}, candidate => existing.has(candidate)), [...existing][0]);
});

test('launch args bind CDP to loopback and reuse only dedicated profile', () => {
  const profile = path.resolve('fixture-workspace', 'browser_profile');
  const args = buildEdgeArgs({ profilePath: profile, port: 32123, startUrl: 'https://example.test/' });
  assert.ok(args.includes(`--user-data-dir=${profile}`));
  assert.ok(args.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(args.includes('--remote-debugging-port=32123'));
  assert.ok(!args.some(arg => /stealth|proxy|fingerprint/i.test(arg)));
  assert.equal(args.at(-1), 'https://example.test/');
});

test('reserves an available local port', async () => {
  const port = await reservePort();
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
});

test('restores only a validated loopback browser port', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-browser-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const profile = path.join(root, 'browser_profile');
  fs.writeFileSync(path.join(root, 'browser_connection.json'), JSON.stringify({ cdp_host: '127.0.0.1', cdp_port: 43210 }));
  assert.equal(readStoredPort(profile), 43210);
  assert.equal(new DedicatedBrowser({ profilePath: profile, executablePath: 'edge.exe' }).port, 43210);
  fs.writeFileSync(path.join(root, 'browser_connection.json'), JSON.stringify({ cdp_host: 'example.com', cdp_port: 43210 }));
  assert.equal(readStoredPort(profile), null);
});
