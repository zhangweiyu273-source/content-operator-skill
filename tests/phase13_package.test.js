const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('portable builder has an explicit source list and rejects private paths', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build_portable.js'), 'utf8');
  assert.match(source, /sourceDirectories = \[/);
  assert.match(source, /PRIVATE_FILE_IN_PACKAGE/);
  assert.match(source, /PACKAGE_HAS_USER_WORKSPACE/);
  assert.doesNotMatch(source, /sourceDirectories.*workspace/);
  assert.match(source, /process\.execPath/);
});

test('portable launcher pins workspace to the extracted package', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build_portable.js'), 'utf8');
  assert.match(source, /CONTENT_OPERATOR_WORKSPACE=%~dp0workspace/);
  assert.match(source, /runtime\\\\node\.exe/);
});
