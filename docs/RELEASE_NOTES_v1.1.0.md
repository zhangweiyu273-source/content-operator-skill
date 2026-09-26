# Content Operator Local Data Connector v1.1.0

Windows 历史笔记全量采集修复版。

## 主要变化

- “同步历史笔记”会自动打开创作者中心笔记管理页。
- 优先读取页面在正常登录状态下自行发出的 Fetch/XHR JSON 响应。
- 递归识别笔记列表与分页信息，不把只有普通 `id` 的对象误判为笔记。
- 同步运行增强的 DOM 回退，支持真实滚动容器、页面滚动和连续稳定轮次。
- API 与 DOM 数据按 `note_id` 合并，已存在笔记更新，新笔记加入，不重复创建。
- 同步摘要显示发现、新增、更新、数据库总数及两路来源数量。
- 单篇笔记同步保持独立。

## 安全边界

用户仍需本人完成登录、扫码、密码和验证码操作。Connector 不获取或导出 Cookie、Token、密码，不绕过验证码、风控或平台权限，也不自动发布或互动。

## Windows 产物

`content-operator-local-data-connector-windows-x64-v1.1.0.zip`
