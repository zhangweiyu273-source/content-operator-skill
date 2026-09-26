const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { reservePort } = require('../browser/chromium');
const { findMacBrowser } = require('../browser/mac_browser');
const { isDarwinArm64Runtime, packageName, packageRoot } = require('./build_macos');

const root = path.resolve(__dirname, '..');
const zipPath = path.join(root, 'dist', `${packageName}.zip`);

function sha256(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }

function zipEntryRecords(buffer) {
  const records = [];
  const endSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const end = buffer.lastIndexOf(endSignature);
  if (end < 0 || end + 22 > buffer.length) throw new Error('ZIP_END_RECORD_MISSING');
  const count = buffer.readUInt16LE(end + 10);
  let index = buffer.readUInt32LE(end + 16);
  for (let entry = 0; entry < count; entry += 1) {
    if (index + 46 > buffer.length || buffer.readUInt32LE(index) !== 0x02014b50) throw new Error('ZIP_CENTRAL_RECORD_INVALID');
    const nameLength = buffer.readUInt16LE(index + 28); const extraLength = buffer.readUInt16LE(index + 30); const commentLength = buffer.readUInt16LE(index + 32);
    const name = buffer.subarray(index + 46, index + 46 + nameLength).toString('utf8');
    const externalAttributes = buffer.readUInt32LE(index + 38);
    records.push({ name, mode: (externalAttributes >>> 16) & 0xffff });
    index += 46 + nameLength + extraLength + commentLength;
  }
  return records;
}

async function waitForStatus(port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/api/status`); if (response.ok) return response.json(); } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('PACKAGED_SERVER_NOT_READY');
}

async function main() {
  const results = {};
  results.platform = process.platform === 'darwin' && process.arch === 'arm64' ? 'PASS' : 'FAIL';
  results.package_files_exist = fs.existsSync(packageRoot) && fs.existsSync(zipPath) ? 'PASS' : 'FAIL';
  results.package_starts_without_workspace = !fs.existsSync(path.join(packageRoot, 'workspace')) ? 'PASS' : 'FAIL';
  const records = zipEntryRecords(fs.readFileSync(zipPath));
  const privateEntry = records.find(({ name }) => /(^|\/)(workspace|browser_profile|exports|logs|backups)(\/|$)|cookies?|tokens?|\.env|\.db$/i.test(name));
  results.zip_private_path_scan = privateEntry ? `FAIL:${privateEntry.name}` : 'PASS';
  const launcherSuffix = '/启动内容运营数据同步工具.command';
  const launcher = records.find(record => record.name.endsWith(launcherSuffix));
  const runtime = records.find(record => record.name.endsWith('/runtime/node'));
  results.start_command_exists = launcher ? 'PASS' : 'FAIL';
  results.start_command_executable = launcher && (launcher.mode & 0o111) ? 'PASS' : 'FAIL';
  results.runtime_executable = runtime && (runtime.mode & 0o111) ? 'PASS' : 'FAIL';
  results.runtime_darwin_arm64 = isDarwinArm64Runtime(path.join(packageRoot, 'runtime', 'node')) ? 'PASS' : 'FAIL';
  const buildInfo = JSON.parse(fs.readFileSync(path.join(packageRoot, 'BUILD_INFO.json'), 'utf8'));
  results.build_info_platform = buildInfo.platform === 'darwin-arm64' ? 'PASS' : 'FAIL';
  results.zip_sha256 = sha256(zipPath); results.zip_entries = records.length;

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-mac-acceptance-'));
  let child;
  try {
    const runtimePath = path.join(packageRoot, 'runtime', 'node');
    const launcherPath = path.join(packageRoot, '启动内容运营数据同步工具.command');
    results.start_command_syntax = spawnSync('zsh', ['-n', launcherPath], { encoding: 'utf8' }).status === 0 ? 'PASS' : 'FAIL';
    const environment = { ...process.env, CONTENT_OPERATOR_WORKSPACE: path.join(tempRoot, 'workspace'), CONNECTOR_OPEN_UI: '0' };
    const health = spawnSync(runtimePath, [path.join(packageRoot, 'app', 'cli.js'), 'health'], { env: environment, encoding: 'utf8', timeout: 10000 });
    results.packaged_runtime_health = health.status === 0 && JSON.parse(health.stdout).database.healthy ? 'PASS' : `FAIL:${health.stderr || health.stdout}`;
    const port = await reservePort(); environment.CONNECTOR_PORT = String(port);
    child = spawn(runtimePath, [path.join(packageRoot, 'app', 'server.js')], { env: environment, stdio: 'ignore' });
    const status = await waitForStatus(port);
    results.packaged_local_server = status.database?.healthy && status.browser?.connected === false ? 'PASS' : 'FAIL';
    results.edge_or_chrome_detected = findMacBrowser() ? 'PASS' : 'FAIL';
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  const failed = Object.values(results).some(value => String(value).startsWith('FAIL'));
  console.log(JSON.stringify({ status: failed ? 'FAIL' : 'PASS', validation: {
    MAC_BUILD: results.package_files_exist,
    MAC_PACKAGE_START: results.packaged_local_server,
    MAC_DATABASE: results.packaged_runtime_health,
    MAC_NO_PRIVATE_DATA: results.zip_private_path_scan,
  }, results }, null, 2));
  if (failed) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });

module.exports = { main, zipEntryRecords };
