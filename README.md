# 内容运营本地数据同步工具

这是内容运营 Skill Public V1 的可选本地数据连接器。它在你的 Windows 电脑上运行，由你启动专属浏览器、登录自己的账号并主动同步自己有权查看的数据。Connector 只做 READ → NORMALIZE → STORE → EXPORT，不分析定位、不写内容、不自动运营。

## 普通用户使用流程

1. 双击便携包里的 `启动内容运营数据同步工具.cmd`。
2. 浏览器打开本地界面；点击「启动专属浏览器」。
3. 在专属 Edge 窗口中，由你本人完成扫码、密码输入和验证码。
4. 回到工具，点击「检查登录账号」，核对昵称和账号 ID，再点击「确认并绑定此账号」。
5. 在专属浏览器打开相应后台页面，按需同步账号信息、历史笔记、当前笔记或阶段数据。
6. 点击「查看本地数据」检查结果，再点击「导出给内容运营 Skill」。
7. 在 `workspace/exports/content_operator_bundle.zip` 找到数据包，交给 Public Skill。

数据页面没有展示的字段会保持 `null`。标题、日期或数字异常会显示 ATTENTION；验证码、风控、权限不足、账号变化和页面结构变化会停止相应同步并要求人工处理。

详细说明见 [第一次使用](docs/01_第一次使用.md)、[登录自己的账号](docs/02_登录自己的账号.md)、[同步账号数据](docs/03_同步账号数据.md)、[导出给 Skill](docs/04_导出给Skill.md) 和 [常见问题](docs/05_常见问题.md)。

## 隐私说明

本工具默认在用户自己的电脑本地运行。用户本人在浏览器中完成账号登录。工具不会要求用户向开发者提供账号密码，也不会获取、保存或自动填写密码。

浏览器登录状态只由 Edge 保存在本项目 `workspace/browser_profile`。工具不会导出或上传 Cookie、登录令牌、浏览器 Profile；没有服务器、云数据库、用户账号系统或 AI API。

工具不处理或绕过验证码，不绕过登录风控和访问权限，不使用 stealth、反检测、指纹伪装、代理池或 IP 轮换；不自动点赞、评论、关注、私信或发布；不支持批量账号或养号。

每次同步前重新核对账号 ID。账号不同会中止，不能把两个账号的数据写进同一工作区。

## 数据位置与删除

所有私有内容位于 `workspace`：

- `account_identity.json`：用户确认的账号身份。
- `content_operator.db`：结构化数据与同步记录。
- `browser_profile/`：专属浏览器本地登录状态。
- `snapshots/`：按运行追加的历史快照。
- `exports/`：给 Public Skill 的输出。
- `backups/`：用户主动创建的本地数据库备份。

关闭工具和专属浏览器后，删除整个 `workspace` 文件夹即可移除本工具的本地数据和专属登录状态。另行复制出去的数据包或备份需在对应位置单独删除。不要删除日常 Edge Profile。

## 开发与检查

要求 Windows 11 x64、Microsoft Edge 和 Node.js 24+。源码模式运行：

```powershell
npm start
npm run check
npm run health
npm run backup
```

本地服务仅监听 `127.0.0.1:31876`，状态修改接口需要当前启动实例的随机动作令牌。SQLite 支持 schema migration、事务回滚、重复保护、健康检查和在线备份。导出 ZIP 使用固定运营数据白名单。

当前真实平台页面结构仍需用户登录后验收；无法确认结构时工具返回 `PAGE_SCHEMA_CHANGED` 并停止 Collector。
