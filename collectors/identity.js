const selectors = require('./selectors/xiaohongshu');
const { cleanText, extractionPrelude, sanitizePageUrl } = require('./page_helpers');

function identityExpression() {
  return `(() => {
    ${extractionPrelude(selectors.identity)}
    const bodyText = document.body?.innerText || '';
    const labeledId = bodyText.match(/(?:小红书号|账号(?:ID)?|帐号(?:ID)?)[：:\\s]+([A-Za-z0-9_-]{3,40})/i)?.[1] || null;
    return {
      nickname: firstText(SELECTORS.nickname),
      account_id: firstAttr(SELECTORS.accountId, ['data-user-id', 'data-account-id']) || firstText(SELECTORS.accountId) || labeledId,
      profile_url: safeUrl(location.href),
      avatar_url: safeUrl(firstAttr(SELECTORS.avatar, ['src'])),
      page_title: document.title || null
    };
  })()`;
}

async function collectIdentity(page) {
  const raw = await page.evaluate(identityExpression());
  return {
    nickname: cleanText(raw?.nickname, 100),
    account_id: cleanText(raw?.account_id, 100),
    profile_url: sanitizePageUrl(raw?.profile_url),
    avatar_url: sanitizePageUrl(raw?.avatar_url),
    checked_at: new Date().toISOString(),
  };
}

module.exports = { collectIdentity, identityExpression };
