const fs = require('node:fs');
const path = require('node:path');

const WINDOWS_EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function windowsBrowserCandidates(env = process.env) {
  const local = env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe');
  return [...WINDOWS_EDGE_CANDIDATES, local].filter(Boolean);
}

function findWindowsBrowser(env = process.env, exists = fs.existsSync) {
  const browserPath = windowsBrowserCandidates(env).find(candidate => exists(candidate));
  return browserPath ? { path: browserPath, name: 'Microsoft Edge' } : null;
}

function findEdge(env = process.env, exists = fs.existsSync) {
  return findWindowsBrowser(env, exists)?.path || null;
}

module.exports = { WINDOWS_EDGE_CANDIDATES, findEdge, findWindowsBrowser, windowsBrowserCandidates };
