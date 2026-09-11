const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packageName = 'content-operator-local-data-connector-windows-x64-v1.0.0-rc.2';
const packageRoot = path.join(root, 'dist', packageName);
const zipPath = `${packageRoot}.zip`;

function sha256(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }
function zipEntryNames(buffer) {
  const names = [];
  for (let index = 0; index < buffer.length - 30;) {
    if (buffer.readUInt32LE(index) !== 0x04034b50) break;
    const size = buffer.readUInt32LE(index + 18); const nameLength = buffer.readUInt16LE(index + 26); const extraLength = buffer.readUInt16LE(index + 28);
    names.push(buffer.subarray(index + 30, index + 30 + nameLength).toString('utf8'));
    index += 30 + nameLength + extraLength + size;
  }
  return names;
}

async function waitForStatus() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { const response = await fetch('http://127.0.0.1:31876/api/status'); if (response.ok) return response.json(); } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('PACKAGED_SERVER_NOT_READY');
}

async function main() {
  const results = {};
  results.platform = process.platform === 'win32' && process.arch === 'x64' ? 'PASS' : 'FAIL';
  results.package_files_exist = fs.existsSync(packageRoot) && fs.existsSync(zipPath) ? 'PASS' : 'FAIL';
  results.package_starts_without_workspace = !fs.existsSync(path.join(packageRoot, 'workspace')) ? 'PASS' : 'FAIL';
  const entries = zipEntryNames(fs.readFileSync(zipPath));
  const privateEntry = entries.find(name => /(^|\/)(workspace|browser_profile|exports|logs|backups)(\/|$)|cookies?|tokens?|\.env|\.db$/i.test(name));
  results.zip_private_path_scan = privateEntry ? `FAIL:${privateEntry}` : 'PASS';
  results.zip_sha256 = sha256(zipPath);
  results.zip_entries = entries.length;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-acceptance-'));
  const environment = { ...process.env, CONTENT_OPERATOR_WORKSPACE: path.join(tempRoot, 'workspace'), CONNECTOR_OPEN_UI: '0' };
  let child;
  try {
    const runtime = path.join(packageRoot, 'runtime', 'node.exe');
    const health = spawnSync(runtime, [path.join(packageRoot, 'app', 'cli.js'), 'health'], { env: environment, encoding: 'utf8', timeout: 10000 });
    results.packaged_runtime_health = health.status === 0 && JSON.parse(health.stdout).database.healthy ? 'PASS' : `FAIL:${health.stderr || health.stdout}`;
    child = spawn(runtime, [path.join(packageRoot, 'app', 'server.js')], { env: environment, stdio: 'ignore', windowsHide: true });
    const status = await waitForStatus();
    results.packaged_local_server = status.database?.healthy && status.browser?.connected === false ? 'PASS' : 'FAIL';
    const { findEdge } = require(path.join(packageRoot, 'browser', 'edge.js'));
    results.edge_detected = findEdge() ? 'PASS' : 'FAIL';
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  const failed = Object.values(results).some(value => String(value).startsWith('FAIL'));
  console.log(JSON.stringify({ status: failed ? 'FAIL' : 'PASS', results }, null, 2));
  if (failed) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });

module.exports = { main, zipEntryNames };
