const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { buildEdgeArgs, findEdge, reservePort } = require('../browser/edge');

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
