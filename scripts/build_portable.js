const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createZip } = require('../exporters/zip');

const root = path.resolve(__dirname, '..');
const distRoot = path.join(root, 'dist');
const version = '1.0.0-rc.3';
const packageName = `content-operator-local-data-connector-windows-x64-v${version}`;
const packageRoot = path.join(distRoot, packageName);
const sourceDirectories = ['app', 'browser', 'collectors', 'exporters', 'parsers', 'storage', 'schemas', 'docs'];
const sourceFiles = ['README.md', 'VERSION', 'package.json'];

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

function sha256(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }

function main() {
  if (path.dirname(packageRoot) !== distRoot || !packageRoot.startsWith(`${root}${path.sep}`)) throw new Error('DIST_PATH_INVALID');
  if (fs.existsSync(path.join(packageRoot, 'workspace'))) throw new Error('PACKAGE_HAS_USER_WORKSPACE');
  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(packageRoot, { recursive: true });
  const runtimeFiles = sourceDirectories.flatMap(relativeFiles).concat(sourceFiles);
  for (const relative of runtimeFiles) copy(relative);
  fs.mkdirSync(path.join(packageRoot, 'runtime'), { recursive: true });
  fs.copyFileSync(process.execPath, path.join(packageRoot, 'runtime', 'node.exe'));
  fs.writeFileSync(path.join(packageRoot, '启动内容运营数据同步工具.cmd'), [
    '@echo off', 'chcp 65001 >nul', 'cd /d "%~dp0"', 'set "CONTENT_OPERATOR_WORKSPACE=%~dp0workspace"',
    'set "CONNECTOR_OPEN_UI=1"', '"%~dp0runtime\\node.exe" "%~dp0app\\server.js"',
    'if errorlevel 1 pause', '',
  ].join('\r\n'), 'utf8');
  fs.writeFileSync(path.join(packageRoot, '便携包说明.txt'), [
    `内容运营本地数据同步工具 ${version}`, '', '1. 请先解压整个 ZIP。', '2. 双击“启动内容运营数据同步工具.cmd”。',
    '3. 按页面步骤启动专属浏览器并由本人登录。', '', '数据只保存在本目录 workspace。请勿分享 workspace/browser_profile。',
    '需要 Microsoft Edge，支持 Windows 11 x64。', '',
  ].join('\r\n'), 'utf8');
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
    version, platform: 'win32-x64', node: process.version, built_at: new Date().toISOString(),
    files: allFiles.map(name => ({ name: name.replace(/\\/g, '/'), bytes: fs.statSync(path.join(packageRoot, name)).size, sha256: sha256(path.join(packageRoot, name)) })),
  };
  fs.writeFileSync(path.join(packageRoot, 'BUILD_INFO.json'), `${JSON.stringify(buildInfo, null, 2)}\n`, 'utf8');
  allFiles.push('BUILD_INFO.json');
  const zipPath = path.join(distRoot, `${packageName}.zip`);
  createZip(zipPath, allFiles.map(name => ({ name: `${packageName}/${name.replace(/\\/g, '/')}`, data: fs.readFileSync(path.join(packageRoot, name)) })));
  console.log(JSON.stringify({ packageRoot, zipPath, bytes: fs.statSync(zipPath).size, sha256: sha256(zipPath), files: allFiles.length }, null, 2));
}

if (require.main === module) main();

module.exports = { main };
