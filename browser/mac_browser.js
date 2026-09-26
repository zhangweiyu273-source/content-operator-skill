const fs = require('node:fs');
const path = require('node:path');

const MAC_SYSTEM_BROWSERS = [
  { path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', name: 'Microsoft Edge' },
  { path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', name: 'Google Chrome' },
];

function macBrowserCandidates(env = process.env) {
  const home = env.HOME;
  const userBrowsers = home ? [
    { path: path.join(home, 'Applications', 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'), name: 'Microsoft Edge' },
    { path: path.join(home, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'), name: 'Google Chrome' },
  ] : [];
  return [...MAC_SYSTEM_BROWSERS, ...userBrowsers];
}

function findMacBrowser(env = process.env, exists = fs.existsSync) {
  return macBrowserCandidates(env).find(candidate => exists(candidate.path)) || null;
}

module.exports = { MAC_SYSTEM_BROWSERS, findMacBrowser, macBrowserCandidates };
