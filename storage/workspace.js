const fs = require('node:fs');
const path = require('node:path');

const PRIVATE_DIRS = ['browser_profile', 'imports', 'exports', 'snapshots', 'logs', 'backups'];

function ensureWorkspace(root) {
  fs.mkdirSync(root, { recursive: true });
  for (const name of PRIVATE_DIRS) fs.mkdirSync(path.join(root, name), { recursive: true });
  return {
    root,
    database: path.join(root, 'content_operator.db'),
    identity: path.join(root, 'account_identity.json'),
    browserProfile: path.join(root, 'browser_profile'),
    imports: path.join(root, 'imports'),
    exports: path.join(root, 'exports'),
    snapshots: path.join(root, 'snapshots'),
    logs: path.join(root, 'logs'),
    backups: path.join(root, 'backups'),
  };
}

module.exports = { PRIVATE_DIRS, ensureWorkspace };
