const { spawn } = require('node:child_process');

function openCommand(url, platform = process.platform) {
  if (platform === 'win32') return { command: 'explorer.exe', args: [url], windowsHide: true };
  if (platform === 'darwin') return { command: 'open', args: [url], windowsHide: undefined };
  return { command: 'xdg-open', args: [url], windowsHide: undefined };
}

function openLocalUrl(url, { platform = process.platform, spawnImpl = spawn } = {}) {
  const target = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('OPEN_URL_NOT_LOCAL');
  const spec = openCommand(url, platform);
  const child = spawnImpl(spec.command, spec.args, { detached: true, stdio: 'ignore', windowsHide: spec.windowsHide });
  child.unref();
  return spec;
}

module.exports = { openCommand, openLocalUrl };
