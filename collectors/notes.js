const selectors = require('./selectors/xiaohongshu');
const { captureNoteListNetwork } = require('./note_list_api');
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
      const idFromUrl = href?.match(/(?:explore|note|publish)\/([A-Za-z0-9_-]{6,})/)?.[1] || new URL(href || location.href).searchParams.get('noteId');
      const titleNode = node.querySelector('[data-testid="title"], [class*="title"]');
      const timeNode = node.querySelector('time, [data-testid="publish-time"], [class*="time"]');
      const cover = node.querySelector('img');
      const text = (node.innerText || '').trim();
      const metric = (label) => text.match(new RegExp('(?:' + label + ')[：:\\s]*([0-9.,]+(?:万|亿|[kKmM])?)'))?.[1] || null;
      cards.push({
        note_id: node.getAttribute('data-note-id') || node.getAttribute('data-id') || idFromUrl || null,
        note_url: href, title: titleNode?.textContent?.trim() || anchor?.getAttribute('title') || null,
        publish_time: timeNode?.getAttribute('datetime') || timeNode?.textContent?.trim() || null,
        cover: cover?.src || null, status: node.querySelector('[class*="status"]')?.textContent?.trim() || null,
        views: metric('浏览|观看'), likes: metric('点赞|赞'), saves: metric('收藏'), comments: metric('评论')
      });
    }
    return cards;
  })()`;
}

const SCROLL_EXPRESSION = `(() => {
  const root = document.scrollingElement || document.documentElement;
  const candidates = [...document.querySelectorAll('body *')].filter(node => {
    const style = getComputedStyle(node);
    return /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 64;
  });
  const container = candidates.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0] || null;
  const before = Math.max(root?.scrollHeight || 0, document.body?.scrollHeight || 0, container?.scrollHeight || 0);
  if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
  window.scrollTo({ top: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0), behavior: 'instant' });
  const loading = [...document.querySelectorAll('[class*="loading"], [class*="spinner"], [aria-busy="true"]')]
    .some(node => { const box = node.getBoundingClientRect(); const style = getComputedStyle(node); return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; });
  return { height: before, y: window.scrollY, container: Boolean(container), containerY: container?.scrollTop || 0, loading };
})()`;

function normalizePublishTime(value, errors, noteId) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    const number = Number(value); const date = new Date(number < 1e12 ? number * 1000 : number);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  try { return normalizeDate(value); }
  catch { errors.push({ field: 'publish_time', code: 'DATE_PARSE_FAILED', note_id: noteId, raw: cleanText(String(value), 40) }); return null; }
}

function normalizeNote(raw, errors = []) {
  const noteId = cleanText(raw?.note_id === undefined || raw?.note_id === null ? null : String(raw.note_id), 200);
  const title = cleanText(raw?.title === undefined || raw?.title === null ? null : String(raw.title), 500);
  if (!noteId) errors.push({ field: 'note_id', code: 'NOTE_ID_MISSING' });
  if (!title) errors.push({ field: 'title', code: 'TITLE_MISSING', note_id: noteId });
  return {
    note_id: noteId, note_url: sanitizePageUrl(raw?.note_url), title,
    publish_time: normalizePublishTime(raw?.publish_time, errors, noteId), cover: sanitizePageUrl(raw?.cover),
    status: cleanText(raw?.status === undefined || raw?.status === null ? null : String(raw.status), 100),
    metrics: {
      views: parseOptionalCount(raw?.views, 'views', errors), likes: parseOptionalCount(raw?.likes, 'likes', errors),
      saves: parseOptionalCount(raw?.saves, 'saves', errors), comments: parseOptionalCount(raw?.comments, 'comments', errors),
    },
  };
}

function nonNullMerge(base, incoming) {
  const output = { ...(base || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (key === 'metrics') {
      output.metrics = { ...(output.metrics || {}) };
      for (const [metric, count] of Object.entries(value || {})) if (count !== null && count !== undefined) output.metrics[metric] = count;
    } else if (value !== null && value !== undefined && value !== '') output[key] = value;
  }
  return output;
}

function mergeNotes(apiNotes = [], domNotes = [], maxItems = 2000) {
  const byId = new Map();
  for (const note of domNotes) if (note?.note_id) byId.set(note.note_id, nonNullMerge(byId.get(note.note_id), note));
  for (const note of apiNotes) if (note?.note_id) byId.set(note.note_id, nonNullMerge(byId.get(note.note_id), note));
  return [...byId.values()].slice(0, maxItems);
}

async function collectDomNotes(page, {
  maxRounds = 120, maxItems = 2000, stableRounds = 4, delayMs = 600,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)), activity = () => false,
} = {}) {
  const byId = new Map(); const errors = []; let stagnant = 0; let lastHeight = -1;
  for (let round = 0; round < maxRounds && byId.size < maxItems && stagnant < stableRounds; round += 1) {
    const rows = await page.evaluate(notesExpression()); const before = byId.size;
    for (const row of rows || []) {
      const normalized = normalizeNote(row, errors);
      if (!normalized.note_id) continue;
      byId.set(normalized.note_id, nonNullMerge(byId.get(normalized.note_id), normalized));
      if (byId.size >= maxItems) break;
    }
    if (byId.size >= maxItems) break;
    const scroll = await page.evaluate(SCROLL_EXPRESSION);
    const grew = Number(scroll?.height || 0) > lastHeight; lastHeight = Math.max(lastHeight, Number(scroll?.height || 0));
    const active = Boolean(activity()) || Boolean(scroll?.loading);
    stagnant = byId.size === before && !grew && !active ? stagnant + 1 : 0;
    if (stagnant < stableRounds) await wait(delayMs);
  }
  return { data: [...byId.values()].slice(0, maxItems), errors, status: errors.length ? 'ATTENTION' : 'PASS', limit_reached: byId.size >= maxItems };
}

async function collectNotes(page, options = {}) {
  const maxItems = options.maxItems || 2000; let captured;
  try {
    captured = await captureNoteListNetwork(page, context => collectDomNotes(page, {
      ...options, activity: options.activity || (() => context?.networkActivitySinceLastCheck?.() || false),
    }), options.network || {});
  }
  catch (error) {
    captured = { notes: [], pagination: [], response_count: 0, unavailable: true, network_error: error.code || error.message, driven: await collectDomNotes(page, options) };
  }
  const apiErrors = [];
  const apiNotes = captured.notes.map(note => normalizeNote(note, apiErrors)).filter(note => note.note_id);
  const dom = captured.driven; const data = mergeNotes(apiNotes, dom.data, maxItems);
  const byId = new Map(data.map(note => [note.note_id, note]));
  const finalErrors = [...dom.errors, ...apiErrors].filter(error => {
    const note = byId.get(error.note_id);
    if (error.code === 'TITLE_MISSING' && note?.title) return false;
    if (error.code === 'DATE_PARSE_FAILED' && note?.publish_time) return false;
    if (error.code === 'NUMBER_FORMAT_INVALID' && note?.metrics?.[error.field] !== null && note?.metrics?.[error.field] !== undefined) return false;
    return true;
  });
  const errors = [...new Map(finalErrors.map(error => [JSON.stringify(error), error])).values()];
  return {
    data, status: errors.length ? 'ATTENTION' : 'PASS', errors, limit_reached: data.length >= maxItems,
    sources: { api_network: apiNotes.length, dom_fallback: dom.data.length, network_responses: captured.response_count },
    pagination: captured.pagination, network_unavailable: captured.unavailable,
  };
}

module.exports = { SCROLL_EXPRESSION, collectDomNotes, collectNotes, mergeNotes, normalizeNote, notesExpression };
