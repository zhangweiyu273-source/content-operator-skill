const { extractNotePayload } = require('./note_payload_parser');

function allowedResponse(response) {
  try {
    const url = new URL(response?.url);
    return url.protocol === 'https:' && (url.hostname === 'xiaohongshu.com' || url.hostname.endsWith('.xiaohongshu.com'))
      && ['Fetch', 'XHR'].includes(response?.resourceType || response?.type);
  } catch { return false; }
}

function decodeBody(result) {
  if (!result || typeof result.body !== 'string') return null;
  const text = result.base64Encoded ? Buffer.from(result.body, 'base64').toString('utf8') : result.body;
  if (Buffer.byteLength(text, 'utf8') > 12 * 1024 * 1024) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function captureNoteListNetwork(page, drive, {
  initialWaitMs = 800, settleMs = 500, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), reload = true,
} = {}) {
  if (typeof page?.send !== 'function' || typeof page?.on !== 'function' || typeof page?.off !== 'function') {
    return { notes: [], pagination: [], response_count: 0, unavailable: true, driven: await drive() };
  }
  const responses = new Map();
  const notes = new Map();
  const pagination = [];
  const bodyTasks = new Set();
  let responseCount = 0;
  let activityVersion = 0;
  let lastObservedActivity = 0;
  const onResponse = event => {
    const response = { ...event.response, resourceType: event.type };
    if (allowedResponse(response)) { responses.set(event.requestId, response); activityVersion += 1; }
  };
  const onFinished = event => {
    if (!responses.has(event.requestId)) return;
    responses.delete(event.requestId);
    const task = page.send('Network.getResponseBody', { requestId: event.requestId }).then(decodeBody).then(payload => {
      if (!payload) return;
      responseCount += 1;
      const parsed = extractNotePayload(payload);
      for (const note of parsed.notes) notes.set(note.note_id, { ...(notes.get(note.note_id) || {}), ...note });
      pagination.push(...parsed.pagination);
    }).catch(() => {}).finally(() => bodyTasks.delete(task));
    bodyTasks.add(task);
  };
  page.on('Network.responseReceived', onResponse);
  page.on('Network.loadingFinished', onFinished);
  try {
    await page.send('Network.enable', { maxTotalBufferSize: 50 * 1024 * 1024, maxResourceBufferSize: 12 * 1024 * 1024 });
    await page.send('Page.enable');
    if (reload) await page.send('Page.reload', { ignoreCache: false });
    await wait(initialWaitMs);
    const driven = await drive({
      networkActivitySinceLastCheck() {
        const active = activityVersion !== lastObservedActivity;
        lastObservedActivity = activityVersion;
        return active;
      },
    });
    await wait(settleMs);
    if (bodyTasks.size) await Promise.allSettled([...bodyTasks]);
    return { notes: [...notes.values()], pagination, response_count: responseCount, unavailable: false, driven };
  } finally {
    page.off('Network.responseReceived', onResponse);
    page.off('Network.loadingFinished', onFinished);
    try { await page.send('Network.disable'); } catch {}
  }
}

module.exports = { allowedResponse, captureNoteListNetwork, decodeBody };
