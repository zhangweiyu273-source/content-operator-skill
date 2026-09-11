# 安全边界与后续架构约束

本文件定义后续代码必须满足的约束；PHASE 0 不实现采集或安全 Gate，不能宣称运行时保护已通过验收。

## 单次用户操作的依赖方向

本地 UI → 专属浏览器 → 当前页面身份核验 → 可见数据 Collector → Parser → Schema 验证 → SQLite 事务 → 用户预览 → 运营数据导出。

Connector 仅 READ → NORMALIZE → STORE → EXPORT。不得承担定位、选题、内容生成或运营策略。

## 浏览器与账号

仅使用本项目 `workspace/browser_profile`，不得复制、连接或改写日常 Profile。浏览器自行保存本地登录状态；应用不读取或序列化 Cookie、Token、密码。后续 CDP 若使用，只能连接本工具专属本地浏览器，不得暴露到网络。

每次同步都重新核验当前页面身份并要求 ACCOUNT_IDENTITY_VERIFIED = YES。首次由用户确认后建立 account_identity.json；后续对比已绑定账号，证据不足也必须停止。账号名称不作为可靠唯一 ID 的替代猜测。

不同账号：ACCOUNT_IDENTITY_VERIFIED = NO、ACCOUNT_MISMATCH = YES、SYNC_ABORTED = YES。人工确认不能直接解除原工作区账号绑定并混写数据；需要独立工作区方案，V1 不做批量账号。

## 读取与异常

仅在用户主动点击后执行一次；不轮询、不自动翻页、不自动进入单篇页面。只读用户当前有权限查看、正常展示的页面；不调用隐藏或越权接口，不读取输入框、浏览器凭据及存储令牌。

验证码、登录异常、风控提示、权限不足、页面结构异常：STOP + USER_ACTION_REQUIRED。Selectors 集中管理；结构变化返回 PAGE_SCHEMA_CHANGED = YES，停止相关 Collector。

重复 note_id、空标题、日期解析失败、数字异常、身份变化均进入 ATTENTION，不以猜测值修复。不存在的数值用 null，不能用 0 冒充观测值。

## 存储与导出

后续存储预留 accounts、notes、note_snapshots、sync_runs、source_pages。每次同步留记录；同账号 note_id 去重，历史快照追加保存、失败事务回滚、数据库损坏明确提示。

source_pages 只允许脱敏页面定位及结构化运营证据，不保存整页 HTML、请求头、网络响应、认证查询参数或浏览器存储。同步日志只保存运行 ID、时间、账号标识、Collector、脱敏页面、状态、条数及错误码；禁止凭据及任意页面文本进入日志。

ZIP 必须由明确的运营数据文件白名单生成，禁止遍历打包整个 workspace。禁止含 Profile、Cookie、Token、密码、缓存、环境变量或数据库。导出范围校验和敏感内容防泄漏测试留待后续阶段实现。

## 禁止的能力

无密码采集、自动登录填写、凭据上传或导出、验证码处理/绕过、登录风控绕过、反检测、stealth、设备指纹伪装、代理池、IP 轮换、高频采集、批量账号、多账号养号、自动点赞/评论/关注/私信/发布、越权访问。

SERVER = NO；CLOUD_DATABASE = NO；USER_ACCOUNT_SYSTEM = NO；AI_API_REQUIRED = NO。
