const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

function buildChromiumArgs({ profilePath, port, startUrl = 'https://creator.xiaohongshu.com/' }) {
  return [
    `--user-data-dir=${path.resolve(profilePath)}`,
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check', '--disable-sync', '--new-window', startUrl,
  ];
}

function readStoredPort(profilePath) {
  const statePath = path.join(path.dirname(profilePath), 'browser_connection.json');
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return state.cdp_host === '127.0.0.1' && Number.isInteger(state.cdp_port) && state.cdp_port > 0 && state.cdp_port < 65536 ? state.cdp_port : null;
  } catch { return null; }
}

function writeStoredPort(profilePath, port) {
  const statePath = path.join(path.dirname(profilePath), 'browser_connection.json');
  fs.writeFileSync(statePath, `${JSON.stringify({ cdp_host: '127.0.0.1', cdp_port: port }, null, 2)}\n`, 'utf8');
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.unref(); server.on('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}

class ChromiumBrowser {
  constructor({ profilePath, executablePath = null, browserName = 'Chromium', startUrl } = {}) {
    this.profilePath = profilePath; this.executablePath = executablePath; this.browserName = browserName;
    this.startUrl = startUrl; this.port = readStoredPort(profilePath); this.child = null;
  }

  async start() {
    if (!this.executablePath) throw new Error('SUPPORTED_BROWSER_NOT_FOUND');
    if (await this.isConnected()) return this.status();
    fs.mkdirSync(this.profilePath, { recursive: true });
    this.port = await reservePort();
    const args = buildChromiumArgs({ profilePath: this.profilePath, port: this.port, startUrl: this.startUrl });
    this.child = spawn(this.executablePath, args, { detached: false, stdio: 'ignore', windowsHide: process.platform === 'win32' ? false : undefined });
    this.child.once('exit', () => { this.child = null; });
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (await this.isConnected()) { writeStoredPort(this.profilePath, this.port); return this.status(); }
    }
    throw new Error('BROWSER_CDP_NOT_READY');
  }

  async isConnected() {
    if (!this.port) return false;
    try { const response = await fetch(`http://127.0.0.1:${this.port}/json/version`, { signal: AbortSignal.timeout(500) }); return response.ok; }
    catch { return false; }
  }

  async status() {
    return { connected: await this.isConnected(), browser: this.browserName, profile_path: path.resolve(this.profilePath), cdp_host: '127.0.0.1', cdp_port: this.port, user_manual_login_required: true };
  }

  async listPages() {
    if (!(await this.isConnected())) throw new Error('BROWSER_NOT_CONNECTED');
    const response = await fetch(`http://127.0.0.1:${this.port}/json/list`, { signal: AbortSignal.timeout(1500) });
    const targets = await response.json();
    return targets.filter(target => target.type === 'page').map(({ id, title, url, webSocketDebuggerUrl }) => ({ id, title, url, webSocketDebuggerUrl }));
  }
}

module.exports = { ChromiumBrowser, buildChromiumArgs, readStoredPort, reservePort, writeStoredPort };
