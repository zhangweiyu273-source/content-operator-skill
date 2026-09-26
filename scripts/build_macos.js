const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createZip } = require('../exporters/zip');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const version = '1.0.0';
const packageName = `content-operator-local-data-connector-macos-arm64-v${version}`;
const packageRoot = path.join(distRoot, packageName);
const sourceDirectories = ['app', 'browser', 'collectors', 'exporters', 'parsers', 'storage', 'schemas', 'docs'];
const sourceFiles = ['README.md', 'VERSION', 'package.json'];

function sha256(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }

function isDarwinArm64Runtime(filename) {
  try {
    const header = Buffer.alloc(8);
    const descriptor = fs.openSync(filename, 'r');
    try { if (fs.readSync(descriptor, header, 0, header.length, 0) !== header.length) return false; }
    finally { fs.closeSync(descriptor); }
    return header.readUInt32LE(0) === 0xfeedfacf && header.readUInt32LE(4) === 0x0100000c;
  } catch { return false; }
}

function relativeFiles(directory) {
  const output = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name !== '.gitkeep' && !/^PHASE_\d+_REPORT\.md$/i.test(entry.name)) output.push(path.relative(root, absolute));
    }
  }
  walk(path.join(root, directory));
  return output;
}

function copy(relative) {
  const destination = path.join(packageRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, relative), destination);
}

function resolveRuntime() {
  const configured = process.env.MAC_NODE_RUNTIME && path.resolve(process.env.MAC_NODE_RUNTIME);
  if (configured) return configured;
  if (process.platform === 'darwin' && process.arch === 'arm64') return process.execPath;
  throw new Error('DARWIN_ARM64_NODE_RUNTIME_REQUIRED');
}

function main() {
  if (path.dirname(packageRoot) !== distRoot || !packageRoot.startsWith(`${root}${path.sep}`)) throw new Error('DIST_PATH_INVALID');
  const runtimeSource = resolveRuntime();
  if (!isDarwinArm64Runtime(runtimeSource)) throw new Error('RUNTIME_NOT_DARWIN_ARM64');
  if (fs.existsSync(path.join(packageRoot, 'workspace'))) throw new Error('PACKAGE_HAS_USER_WORKSPACE');
  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(packageRoot, { recursive: true });
  for (const relative of sourceDirectories.flatMap(relativeFiles).concat(sourceFiles)) copy(relative);

  const runtimePath = path.join(packageRoot, 'runtime', 'node');
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.copyFileSync(runtimeSource, runtimePath); fs.chmodSync(runtimePath, 0o755);
  const launcherName = '启动内容运营数据同步工具.command';
  const launcherPath = path.join(packageRoot, launcherName);
  fs.writeFileSync(launcherPath, [
    '#!/bin/zsh', 'set -u', 'SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"', 'cd "$SCRIPT_DIR" || exit 1',
    'export CONTENT_OPERATOR_WORKSPACE="$SCRIPT_DIR/workspace"', 'export CONNECTOR_OPEN_UI=1',
    '"$SCRIPT_DIR/runtime/node" "$SCRIPT_DIR/app/server.js"', 'STATUS=$?',
    'if [ "$STATUS" -ne 0 ]; then', '  echo "工具启动失败，错误代码：$STATUS"', '  read -r "?按回车键关闭…"', 'fi', 'exit "$STATUS"', '',
  ].join('\n'), 'utf8');
  fs.chmodSync(launcherPath, 0o755);
  fs.writeFileSync(path.join(packageRoot, 'Mac使用说明.txt'), [
    `内容运营本地数据同步工具 Mac v${version}`, '', '适用于 Apple Silicon M1 / M2 / M3 / M4。',
    '完整解压 ZIP 后，双击“启动内容运营数据同步工具.command”。',
    '若 macOS 提示无法验证开发者，请右键该文件选择“打开”，或前往“系统设置 → 隐私与安全 → 仍要打开”。',
    '不要关闭整个系统安全机制。', '', '数据只保存在本目录 workspace。请勿分享 workspace/browser_profile。',
    '支持 Microsoft Edge，未安装 Edge 时使用 Google Chrome。', '',
  ].join('\n'), 'utf8');

  const allFiles = [];
  function walkPackage(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walkPackage(absolute); else allFiles.push(path.relative(packageRoot, absolute));
    }
  }
  walkPackage(packageRoot);
  if (allFiles.some(name => /(^|[\\/])(workspace|browser_profile|exports|logs|backups)([\\/]|$)|cookies?|tokens?|\.env|\.db$/i.test(name))) throw new Error('PRIVATE_FILE_IN_PACKAGE');
  const buildInfo = {
    version, platform: 'darwin-arm64', runtime: 'node', node: process.version, built_at: new Date().toISOString(),
    files: allFiles.map(name => ({ name: name.replace(/\\/g, '/'), bytes: fs.statSync(path.join(packageRoot, name)).size, sha256: sha256(path.join(packageRoot, name)) })),
  };
  fs.writeFileSync(path.join(packageRoot, 'BUILD_INFO.json'), `${JSON.stringify(buildInfo, null, 2)}\n`, 'utf8');
  allFiles.push('BUILD_INFO.json');
  const zipPath = path.join(distRoot, `${packageName}.zip`);
  createZip(zipPath, allFiles.map(name => {
    const normalized = name.replace(/\\/g, '/');
    const executable = normalized === launcherName || normalized === 'runtime/node';
    return { name: `${packageName}/${normalized}`, data: fs.readFileSync(path.join(packageRoot, name)), mode: executable ? 0o100755 : 0o100644 };
  }));
  console.log(JSON.stringify({ packageRoot, zipPath, bytes: fs.statSync(zipPath).size, sha256: sha256(zipPath), files: allFiles.length, platform: buildInfo.platform }, null, 2));
}

if (require.main === module) main();

module.exports = { isDarwinArm64Runtime, main, packageName, packageRoot, resolveRuntime };
