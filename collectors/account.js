const selectors = require('./selectors/xiaohongshu');
const { cleanText, extractionPrelude } = require('./page_helpers');
const { parseOptionalCount } = require('../parsers/numbers');
const { normalizeAccountId } = require('../parsers/identity');

function accountExpression() {
  return `(() => {
    ${extractionPrelude(selectors.account)}
    const labelValue = (labels) => {
      const metricRoot = SELECTORS.metricsRoot.map(selector => document.querySelector(selector)).find(Boolean);
      const nodes = Array.from((metricRoot || document.body).querySelectorAll('*'));
      if (metricRoot) nodes.unshift(metricRoot);
      for (const node of nodes) {
        if (node.children.length > 4) continue;
        const text = (node.innerText || '').replace(/\\s+/g, ' ').trim();
        if (!text || text.length > 80) continue;
        for (const label of labels) {
          const index = text.indexOf(label);
          if (index < 0) continue;
          const before = text.slice(0, index).trim().match(/([0-9.,]+(?:万|亿|[kKmM])?)$/);
          const after = text.slice(index + label.length).trim().replace(/^[:：]/, '').trim().match(/^([0-9.,]+(?:万|亿|[kKmM])?)/);
          if (before || after) return (before || after)[1];
        }
      }
      return null;
    };
    const bodyText = document.body?.innerText || '';
    return {
      nickname: firstText(SELECTORS.nickname),
      account_id: firstAttr(SELECTORS.accountId, ['data-user-id', 'data-account-id']) || firstText(SELECTORS.accountId) || bodyText.match(/(?:小红书号|账号(?:ID)?|帐号(?:ID)?)[：:\\s]+([A-Za-z0-9_-]{3,40})/i)?.[1] || null,
      bio: firstText(SELECTORS.bio),
      followers: labelValue(SELECTORS.metricLabels.followers),
      following: labelValue(SELECTORS.metricLabels.following),
      total_likes_and_saves: labelValue(SELECTORS.metricLabels.total_likes_and_saves),
      note_count: labelValue(SELECTORS.metricLabels.note_count)
    };
  })()`;
}

async function collectAccount(page) {
  const raw = await page.evaluate(accountExpression());
  const errors = [];
  const result = {
    nickname: cleanText(raw?.nickname, 100),
    account_id: normalizeAccountId(raw?.account_id),
    bio: cleanText(raw?.bio, 1000),
    followers: parseOptionalCount(raw?.followers, 'followers', errors),
    following: parseOptionalCount(raw?.following, 'following', errors),
    total_likes_and_saves: parseOptionalCount(raw?.total_likes_and_saves, 'total_likes_and_saves', errors),
    note_count: parseOptionalCount(raw?.note_count, 'note_count', errors),
    snapshot_time: new Date().toISOString(),
  };
  return { data: result, status: errors.length ? 'ATTENTION' : 'PASS', errors };
}

module.exports = { accountExpression, collectAccount };
