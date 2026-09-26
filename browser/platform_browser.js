const fs = require('node:fs');
const { ChromiumBrowser } = require('./chromium');
const { findMacBrowser } = require('./mac_browser');
const { findWindowsBrowser } = require('./windows_browser');

function findPlatformBrowser({ platform = process.platform, env = process.env, exists = fs.existsSync } = {}) {
  if (platform === 'win32') return findWindowsBrowser(env, exists);
  if (platform === 'darwin') return findMacBrowser(env, exists);
  return null;
}

class DedicatedBrowser extends ChromiumBrowser {
  constructor(options = {}) {
    const detected = options.executablePath
      ? { path: options.executablePath, name: options.browserName || 'Chromium' }
      : findPlatformBrowser(options);
    super({ ...options, executablePath: detected?.path || null, browserName: detected?.name || 'Chromium' });
  }
}

module.exports = { DedicatedBrowser, findPlatformBrowser };
