const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { CdpSession } = require('../browser/cdp');
const { buildChromiumArgs } = require('../browser/chromium');
const { findMacBrowser } = require('../browser/mac_browser');
const { findPlatformBrowser } = require('../browser/platform_browser');
const { findWindowsBrowser } = require('../browser/windows_browser');
const { openCommand } = require('../app/platform_open');
const { workspacePath } = require('../app/config');
const { isDarwinArm64Runtime } = require('../scripts/build_macos');
const { zipEntryRecords } = require('../scripts/acceptance_macos');
const { createZip } = require('../exporters/zip');

test('routes darwin to Edge first and Chrome as fallback', () => {
  const edge = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  assert.deepEqual(findPlatformBrowser({ platform: 'darwin', env: {}, exists: candidate => candidate === edge }), { path: edge, name: 'Microsoft Edge' });
  assert.deepEqual(findMacBrowser({}, candidate => candidate === chrome), { path: chrome, name: 'Google Chrome' });
});

test('keeps Windows Edge routing intact', () => {
  const expected = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.deepEqual(findWindowsBrowser({}, candidate => candidate === expected), { path: expected, name: 'Microsoft Edge' });
  assert.deepEqual(findPlatformBrowser({ platform: 'win32', env: {}, exists: candidate => candidate === expected }), { path: expected, name: 'Microsoft Edge' });
});

test('uses identical isolated Chromium arguments on macOS', () => {
  const profile = path.resolve('workspace', 'browser_profile');
  const args = buildChromiumArgs({ profilePath: profile, port: 45678 });
  assert.ok(args.includes(`--user-data-dir=${profile}`));
  assert.ok(args.includes('--remote-debugging-address=127.0.0.1'));
  assert.ok(args.includes('--remote-debugging-port=45678'));
  assert.ok(args.includes('--disable-sync'));
  assert.equal(args.some(arg => /stealth|proxy|fingerprint/i.test(arg)), false);
  assert.deepEqual(openCommand('http://127.0.0.1:31876', 'darwin'), { command: 'open', args: ['http://127.0.0.1:31876'], windowsHide: undefined });
});

test('resolves workspace and all child paths without platform literals', () => {
  const previous = process.env.CONTENT_OPERATOR_WORKSPACE;
  const configured = path.join(os.tmpdir(), '内容运营', 'workspace');
  process.env.CONTENT_OPERATOR_WORKSPACE = configured;
  try { assert.equal(workspacePath(), path.resolve(configured)); }
  finally {
    if (previous === undefined) delete process.env.CONTENT_OPERATOR_WORKSPACE;
    else process.env.CONTENT_OPERATOR_WORKSPACE = previous;
  }
});

test('CDP remains loopback-only on every platform', () => {
  assert.doesNotThrow(() => new CdpSession('ws://127.0.0.1:9222/devtools/page/1'));
  assert.doesNotThrow(() => new CdpSession('ws://localhost:9222/devtools/page/1'));
  assert.throws(() => new CdpSession('ws://192.0.2.1:9222/devtools/page/1'), /CDP_REMOTE_HOST_FORBIDDEN/);
});

test('recognizes only a real thin Darwin arm64 Mach-O runtime', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-mach-o-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const arm = path.join(root, 'node-arm64'); const wrong = path.join(root, 'node-wrong');
  const armHeader = Buffer.alloc(8); armHeader.writeUInt32LE(0xfeedfacf, 0); armHeader.writeUInt32LE(0x0100000c, 4);
  const wrongHeader = Buffer.alloc(8); wrongHeader.writeUInt32LE(0x5a4d, 0);
  fs.writeFileSync(arm, armHeader); fs.writeFileSync(wrong, wrongHeader);
  assert.equal(isDarwinArm64Runtime(arm), true);
  assert.equal(isDarwinArm64Runtime(wrong), false);
});

test('Mac ZIP records executable launcher/runtime and no private paths', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-mac-zip-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const zip = path.join(root, 'test.zip');
  createZip(zip, [
    { name: 'package/启动内容运营数据同步工具.command', data: '#!/bin/zsh\n', mode: 0o100755 },
    { name: 'package/runtime/node', data: 'runtime', mode: 0o100755 },
    { name: 'package/BUILD_INFO.json', data: '{"platform":"darwin-arm64"}', mode: 0o100644 },
  ]);
  const records = zipEntryRecords(fs.readFileSync(zip));
  assert.ok(records.find(record => record.name.endsWith('.command') && (record.mode & 0o111)));
  assert.ok(records.find(record => record.name.endsWith('/runtime/node') && (record.mode & 0o111)));
  assert.equal(records.some(record => /workspace|browser_profile|cookies?|tokens?|\.db$/i.test(record.name)), false);
});

test('Mac builder and workflow target only darwin-arm64 portable output', () => {
  const root = path.resolve(__dirname, '..');
  const builder = fs.readFileSync(path.join(root, 'scripts', 'build_macos.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'build-macos.yml'), 'utf8');
  assert.match(builder, /content-operator-local-data-connector-macos-arm64-v/);
  assert.match(builder, /启动内容运营数据同步工具\.command/);
  assert.match(builder, /PRIVATE_FILE_IN_PACKAGE/);
  assert.match(builder, /platform: 'darwin-arm64'/);
  assert.doesNotMatch(builder, /node\.exe/);
  assert.match(workflow, /runs-on: macos-latest/);
  assert.match(workflow, /test "\$\(uname -m\)" = "arm64"/);
  assert.match(workflow, /npm run accept:mac/);
});

test('common runtime files contain no Windows launch or path literals', () => {
  const root = path.resolve(__dirname, '..');
  for (const relative of ['browser/chromium.js', 'browser/platform_browser.js', 'app/service.js', 'app/platform_open.js']) {
    const content = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.doesNotMatch(content, /C:\\\\|Program Files|node\.exe|\.cmd/);
  }
});
