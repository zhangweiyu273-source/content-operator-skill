const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { zipEntryNames } = require('../scripts/acceptance_windows');

test('final portable archive contains launcher and no private workspace paths', t => {
  const zip = path.join(__dirname, '..', 'dist', 'content-operator-local-data-connector-windows-x64-v1.1.0.zip');
  if (!fs.existsSync(zip)) return t.skip('portable artifact must be built first');
  const names = zipEntryNames(fs.readFileSync(zip));
  assert.ok(names.some(name => name.endsWith('/启动内容运营数据同步工具.cmd')));
  assert.ok(names.some(name => name.endsWith('/runtime/node.exe')));
  assert.equal(names.some(name => /(^|\/)(workspace|browser_profile)(\/|$)/i.test(name)), false);
});
