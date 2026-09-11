const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { ConnectorService } = require('./service');
const { APP_NAME, workspacePath } = require('./config');

const STATIC = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };

function send(response, status, value, contentType = 'application/json; charset=utf-8') {
  const body = contentType.startsWith('application/json') ? JSON.stringify(value) : value;
  response.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
  response.end(body);
}

async function readJson(request) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 65536) throw new Error('REQUEST_TOO_LARGE'); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function createAppServer(service, uiRoot = path.join(__dirname, 'ui')) {
  const token = crypto.randomBytes(24).toString('hex');
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && STATIC[url.pathname]) {
        const [file, type] = STATIC[url.pathname];
        let data = fs.readFileSync(path.join(uiRoot, file), 'utf8');
        if (file === 'index.html') data = data.replace('__CONNECTOR_TOKEN__', token);
        return send(response, 200, data, type);
      }
      if (url.pathname.startsWith('/api/') && request.method !== 'GET' && request.headers['x-connector-token'] !== token) return send(response, 403, { error: 'LOCAL_ACTION_TOKEN_REQUIRED' });
      if (request.method === 'GET' && url.pathname === '/api/status') return send(response, 200, await service.status());
      if (request.method === 'GET' && url.pathname === '/api/data') return send(response, 200, service.recentData());
      if (request.method === 'POST' && url.pathname === '/api/browser/start') return send(response, 200, await service.browser.start());
      if (request.method === 'POST' && url.pathname === '/api/identity/inspect') return send(response, 200, await service.inspectIdentity());
      if (request.method === 'POST' && url.pathname === '/api/identity/confirm') return send(response, 200, await service.confirmIdentity((await readJson(request)).account_id));
      if (request.method === 'POST' && url.pathname.startsWith('/api/sync/')) return send(response, 200, await service.sync(url.pathname.slice('/api/sync/'.length)));
      if (request.method === 'POST' && url.pathname === '/api/export') return send(response, 200, service.exportBundle());
      return send(response, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      return send(response, 400, { error: error.code || error.message, message: error.message, details: error.details || null });
    }
  });
  return { server, token };
}

if (require.main === module) {
  const service = new ConnectorService(workspacePath());
  const { server } = createAppServer(service);
  server.listen(31876, '127.0.0.1', () => console.log(`${APP_NAME} 已启动：http://127.0.0.1:31876`));
  const shutdown = () => server.close(() => { service.close(); process.exit(0); });
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

module.exports = { createAppServer };
