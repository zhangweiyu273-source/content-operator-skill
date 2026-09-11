function guardExpression(kind) {
  return `(() => {
    const text = (document.body?.innerText || '').slice(0, 120000);
    const url = location.href;
    const checks = {
      CAPTCHA_REQUIRED: /验证码|安全验证|拖动滑块|完成拼图/.test(text),
      LOGIN_REQUIRED: /\\/login(?:[/?#]|$)/i.test(url) || /请使用小红书账号登录|扫码登录/.test(text),
      RISK_CONTROL: /账号异常|访问过于频繁|操作频繁|风险提示|环境异常/.test(text),
      PERMISSION_DENIED: /无权访问|权限不足|暂无权限|403 Forbidden/i.test(text)
    };
    const selectors = {
      identity: '[data-user-id],[data-account-id],[class*="user-id"],[class*="account-id"],[class*="nickname"]',
      account: '[data-user-id],[data-account-id],[class*="user-name"],[class*="nickname"],[class*="bio"]',
      notes: '[data-note-id],[data-testid="note-card"],[class*="note-card"],[class*="content-card"]',
      'single-note': '[data-note-id],[data-testid="note-detail"],h1,[data-testid="note-title"]',
      stage: '[class*="trend"],[class*="overview"],[class*="data"]'
    };
    const emptyAllowed = ${JSON.stringify(kind)} === 'notes' && /暂无(?:笔记|作品|内容)|还没有发布/.test(text);
    const structureVisible = Boolean(document.querySelector(selectors[${JSON.stringify(kind)}] || selectors.identity)) || emptyAllowed;
    return { checks, structureVisible, title: document.title || '', url: location.origin + location.pathname };
  })()`;
}

async function assertPageSafe(page, kind = 'identity') {
  const result = await page.evaluate(guardExpression(kind));
  const blocking = Object.entries(result.checks || {}).find(([, active]) => active);
  if (blocking) {
    const error = new Error({ CAPTCHA_REQUIRED: '页面要求验证码，请由你本人在浏览器中完成。', LOGIN_REQUIRED: '请先在专属浏览器中手动登录。', RISK_CONTROL: '页面出现登录或风控异常，请在浏览器中人工处理。', PERMISSION_DENIED: '当前账号没有此页面的访问权限。' }[blocking[0]]);
    error.code = blocking[0]; error.syncResult = 'ABORTED';
    error.details = { STOP: 'YES', USER_ACTION_REQUIRED: 'YES', reason: blocking[0] };
    throw error;
  }
  if (!result.structureVisible) {
    const error = new Error('无法确认当前页面结构，请检查页面是否正确或等待适配更新。');
    error.code = 'PAGE_SCHEMA_CHANGED'; error.syncResult = 'ATTENTION';
    error.details = { STOP: 'YES', USER_ACTION_REQUIRED: 'YES', PAGE_SCHEMA_CHANGED: 'YES', collector: kind };
    throw error;
  }
  return result;
}

module.exports = { assertPageSafe, guardExpression };
