const selectors = require('./selectors/xiaohongshu').noteDetail;
const { cleanText, extractionPrelude, sanitizePageUrl } = require('./page_helpers');
const { parseOptionalCount } = require('../parsers/numbers');
const { normalizeDate } = require('../parsers/dates');

function singleNoteExpression() {
  return `(() => {
    ${extractionPrelude(selectors)}
    const labelValue = (labels) => {
      for (const node of document.querySelectorAll('body *')) {
        if (node.children.length > 4) continue;
        const text = (node.innerText || '').replace(/\\s+/g, ' ').trim();
        if (!text || text.length > 100) continue;
        for (const label of labels) {
          const value = text.match(new RegExp(label + '[：:\\s]*([0-9.,]+(?:万|亿|[kKmM])?)'))?.[1];
          if (value) return value;
        }
      }
      return null;
    };
    const url = new URL(location.href);
    const fromPath = url.pathname.match(/(?:explore|note|publish)\\/([A-Za-z0-9_-]{6,})/)?.[1];
    const fields = {};
    for (const [key, labels] of Object.entries(SELECTORS.metricLabels)) fields[key] = labelValue(labels);
    return {
      note_id: firstAttr(SELECTORS.id, ['data-note-id', 'data-id']) || url.searchParams.get('noteId') || fromPath || null,
      note_url: safeUrl(location.href), title: firstText(SELECTORS.title), publish_time: firstText(SELECTORS.publishTime),
      body: firstText(SELECTORS.body), metrics: fields
    };
  })()`;
}

async function collectSingleNote(page) {
  const raw = await page.evaluate(singleNoteExpression());
  const errors = [];
  const noteId = cleanText(raw?.note_id, 200);
  const title = cleanText(raw?.title, 500);
  if (!noteId) errors.push({ field: 'note_id', code: 'NOTE_ID_MISSING' });
  if (!title) errors.push({ field: 'title', code: 'TITLE_MISSING', note_id: noteId });
  let publishTime = null;
  if (raw?.publish_time) {
    try { publishTime = normalizeDate(raw.publish_time); }
    catch { errors.push({ field: 'publish_time', code: 'DATE_PARSE_FAILED', note_id: noteId, raw: cleanText(raw.publish_time, 40) }); }
  }
  const metricFields = ['impressions', 'views', 'clicks', 'likes', 'saves', 'comments', 'follows', 'profile_visits', 'dms', 'leads'];
  const metrics = Object.fromEntries(metricFields.map(field => [field, parseOptionalCount(raw?.metrics?.[field], field, errors)]));
  return {
    data: {
      note_id: noteId, note_url: sanitizePageUrl(raw?.note_url), title, publish_time: publishTime,
      body: cleanText(raw?.body, 20000), metrics, snapshot_time: new Date().toISOString(),
    },
    status: errors.length ? 'ATTENTION' : 'PASS', errors,
  };
}

module.exports = { collectSingleNote, singleNoteExpression };
