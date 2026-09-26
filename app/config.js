const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function workspacePath() {
  return path.resolve(process.env.CONTENT_OPERATOR_WORKSPACE || path.join(PROJECT_ROOT, 'workspace'));
}

module.exports = {
  APP_NAME: '内容运营本地数据同步工具',
  APP_VERSION: fs.readFileSync(path.join(PROJECT_ROOT, 'VERSION'), 'utf8').trim(),
  PROJECT_ROOT,
  workspacePath,
};
