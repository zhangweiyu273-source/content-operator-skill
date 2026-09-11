const token = document.querySelector('meta[name="connector-token"]').content;
let candidate = null;
const output = document.querySelector('#output');
const notice = document.querySelector('#notice');

async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Connector-Token': token }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  if (!response.ok) throw Object.assign(new Error(value.message || value.error), { details: value });
  return value;
}
function show(label, value) { notice.textContent = label; output.textContent = JSON.stringify(value, null, 2); }
async function refresh() {
  const state = await api('/api/status');
  document.querySelector('#browserState').textContent = state.browser.connected ? '已连接' : '未连接';
  document.querySelector('#accountState').textContent = state.account?.nickname || '未确认';
  document.querySelector('#noteCount').textContent = state.note_count;
  document.querySelector('#lastSync').textContent = state.last_sync ? `${state.last_sync.collector} · ${state.last_sync.result}` : '暂无';
}
const actions = {
  browser: async () => show('专属浏览器已启动，请在浏览器中自行登录。', await api('/api/browser/start', 'POST')),
  inspect: async () => { const value = await api('/api/identity/inspect', 'POST'); candidate = value.candidate; document.querySelector('#confirmButton').disabled = !candidate.account_id || !candidate.nickname; show('请核对账号，正确后再确认绑定。', value); },
  confirm: async () => show('账号已确认。', await api('/api/identity/confirm', 'POST', { account_id: candidate?.account_id })),
  account: async () => show('账号信息同步完成。', await api('/api/sync/account', 'POST')),
  notes: async () => show('历史笔记同步完成。', await api('/api/sync/notes', 'POST')),
  'single-note': async () => show('当前笔记同步完成。', await api('/api/sync/single-note', 'POST')),
  stage: async () => show('阶段数据同步完成。', await api('/api/sync/stage', 'POST')),
  data: async () => show('本地数据预览', await api('/api/data')),
  export: async () => show('导出完成。', await api('/api/export', 'POST')),
};
document.querySelector('.actions').addEventListener('click', async event => {
  const name = event.target.dataset.action; if (!name) return; event.target.disabled = true; notice.textContent = '处理中…';
  try { await actions[name](); await refresh(); } catch (error) { show(`需要处理：${error.message}`, error.details || { error: error.message }); }
  finally { if (name !== 'confirm') event.target.disabled = false; }
});
refresh().catch(error => show('无法读取本地状态', { error: error.message }));
