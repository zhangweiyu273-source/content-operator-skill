// Backward-compatible Windows entrypoint. Shared browser behavior lives in chromium.js.
const { DedicatedBrowser } = require('./platform_browser');
const { buildChromiumArgs, readStoredPort, reservePort } = require('./chromium');
const { WINDOWS_EDGE_CANDIDATES, findEdge } = require('./windows_browser');

module.exports = {
  DedicatedBrowser,
  EDGE_CANDIDATES: WINDOWS_EDGE_CANDIDATES,
  buildEdgeArgs: buildChromiumArgs,
  findEdge,
  readStoredPort,
  reservePort,
};
