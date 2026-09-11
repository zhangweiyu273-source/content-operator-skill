const selectors = require('./selectors/xiaohongshu');
const { cleanText, sanitizePageUrl } = require('./page_helpers');
const { parseOptionalCount } = require('../parsers/numbers');
const { normalizeDate } = require('../parsers/dates');

function notesExpression() {
  return `(() => {
    const selectors = ${JSON.stringify(selectors.notes.cards)};
    const unique = new Set();
    const cards = [];
    for (const selector of selectors) for (const node of document.querySelectorAll(selector)) {
      if (unique.has(node)) continue;
      unique.add(node);
      const anchor = node.matches('a[href]') ? node : node.querySelector('a[href]');
      const href = anchor?.href || null;
      const idFromUrl = href?.match(/(?:explore|note|publish)\\/([A-Za-z0-9_-]{6,})/)?.[1] || new URL(href || location.href).searchParams.get('noteId');
      const titleNode = node.querySelector('[data-testid="title"], [class*="title"]');
      const timeNode = node.querySelector('time, [data-testid="publish-time"], [class*="time"]');
      const cover = node.querySelector('img');
      const text = (node.innerText || '').trim();
      const metric = (label) => text.match(new RegExp('(?:' + label + ')[：:\\s]*([0-9.,]+(?:万|亿|[kKmM])?)'))?.[1] || null;
      cards.push({
        note_id: node.getAttribute('data-note-id') || node.getAttribute('data-id') || idFromUrl || null,
        note_url: href,
        title: titleNode?.textContent?.trim() || anchor?.getAttribute('title') || null,
        publish_time: timeNode?.getAttribute('datetime') || timeNode?.textContent?.trim() || null,
        cover: cover?.src || null,
        status: node.querySelector('[class*="status"]')?.textContent?.trim() || null,
        views: metric('浏览|观看'), likes: metric('点赞|赞'), saves: metric('收藏'), comments: metric('评论')
      });
    }
    return cards;
  })()`;
}

const SCROLL_EXPRESSION = `(() => {
  const before = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0);
  window.scrollTo({ top: before, behavior: 'instant' });
  return { height: before, y: window.scrollY };
})()`;

function normalizeNote(raw, errors) {
  const noteId = cleanText(raw?.note_id, 200);
  const title = cleanText(raw?.title, 500);
  if (!noteId) errors.push({ field: 'note_id', code: 'NOTE_ID_MISSING' });
  if (!title) errors.push({ field: 'title', code: 'TITLE_MISSING', note_id: noteId });
  let publishTime = null;
  if (raw?.publish_time) {
    try { publishTime = normalizeDate(raw.publish_time); }
    catch { errors.push({ field: 'publish_time', code: 'DATE_PARSE_FAILED', note_id: noteId, raw: cleanText(raw.publish_time, 40) }); }
  }
  return {
    note_id: noteId,
    note_url: sanitizePageUrl(raw?.note_url),
    title,
    publish_time: publishTime,
    cover: sanitizePageUrl(raw?.cover),
    status: cleanText(raw?.status, 100),
    metrics: {
      views: parseOptionalCount(raw?.views, 'views', errors),
      likes: parseOptionalCount(raw?.likes, 'likes', errors),
      saves: parseOptionalCount(raw?.saves, 'saves', errors),
      comments: parseOptionalCount(raw?.comments, 'comments', errors),
    },
  };
}

async function collectNotes(page, { maxRounds = 20, maxItems = 200, stableRounds = 2, delayMs = 600, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const byId = new Map();
  const errors = [];
  let unchanged = 0;
  for (let round = 0; round < maxRounds && byId.size < maxItems && unchanged < stableRounds; round += 1) {
    const rows = await page.evaluate(notesExpression());
    const before = byId.size;
    for (const row of rows || []) {
      const normalized = normalizeNote(row, errors);
      if (!normalized.note_id) continue;
      byId.set(normalized.note_id, { ...byId.get(normalized.note_id), ...normalized });
      if (byId.size >= maxItems) break;
    }
    unchanged = byId.size === before ? unchanged + 1 : 0;
    if (unchanged < stableRounds && byId.size < maxItems) {
      await page.evaluate(SCROLL_EXPRESSION);
      await wait(delayMs);
    }
  }
  return {
    data: [...byId.values()].slice(0, maxItems),
    status: errors.length ? 'ATTENTION' : 'PASS',
    errors: [...new Map(errors.map(error => [JSON.stringify(error), error])).values()],
    limit_reached: byId.size >= maxItems,
  };
}

module.exports = { SCROLL_EXPRESSION, collectNotes, normalizeNote, notesExpression };
