const { parseOptionalCount } = require('../parsers/numbers');
const { cleanText } = require('./page_helpers');

const LABELS = {
  views: ['观看', '浏览', '播放'], impressions: ['曝光', '曝光量'], profile_visits: ['主页访问', '主页访客'],
  followers_gain: ['涨粉', '新增粉丝'], followers: ['粉丝', '粉丝数'], note_count: ['笔记', '作品'],
};

function stageSnapshotExpression() {
  return `(() => {
    const labels = ${JSON.stringify(LABELS)};
    const body = document.body?.innerText || '';
    const period = /近\\s*7\\s*天/.test(body) ? '7d' : /近\\s*30\\s*天/.test(body) ? '30d' : null;
    const result = { period };
    for (const [field, names] of Object.entries(labels)) {
      result[field] = null;
      for (const name of names) {
        const match = body.match(new RegExp(name + '[：:\\s]*([0-9.,]+(?:万|亿|[kKmM])?)'));
        if (match) { result[field] = match[1]; break; }
      }
    }
    return result;
  })()`;
}

async function collectStageSnapshot(page) {
  const raw = await page.evaluate(stageSnapshotExpression());
  const errors = [];
  const data = { period: cleanText(raw?.period, 20), snapshot_time: new Date().toISOString() };
  for (const field of Object.keys(LABELS)) data[field] = parseOptionalCount(raw?.[field], field, errors);
  if (!data.period) errors.push({ field: 'period', code: 'PERIOD_NOT_VISIBLE' });
  return { data, status: errors.length ? 'ATTENTION' : 'PASS', errors };
}

module.exports = { LABELS, collectStageSnapshot, stageSnapshotExpression };
