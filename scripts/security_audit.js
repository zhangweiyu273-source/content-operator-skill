const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'browser', 'collectors', 'exporters', 'parsers', 'storage'];
const forbidden = [
  ['cookie export API', /Network\.(?:getAllCookies|getCookies)|Storage\.getCookies/],
  ['browser storage export', /DOMStorage\.getDOMStorageItems/],
  ['stealth capability', /playwright-extra|puppeteer-extra-plugin-stealth/],
  ['proxy rotation', /proxy[_-]?(?:pool|rotation)/i],
];
const findings = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (entry.name.endsWith('.js')) {
      const content = fs.readFileSync(filename, 'utf8');
      for (const [label, pattern] of forbidden) if (pattern.test(content)) findings.push({ file: path.relative(root, filename), label });
      if (/while\s*\(\s*true\s*\)/.test(content)) findings.push({ file: path.relative(root, filename), label: 'unbounded loop' });
    }
  }
}
for (const directory of sourceRoots) walk(path.join(root, directory));
if (findings.length) { console.error(JSON.stringify(findings, null, 2)); process.exitCode = 1; }
else console.log('Security source audit: PASS');
