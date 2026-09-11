# 内容运营本地数据同步工具

Content Operator Local Data Connector 是内容运营 Skill Public V1 的可选本地数据输入连接器，定位为用户主动操作的个人账号数据整理与同步工具。

当前仅完成 PHASE 0：环境核查、项目隔离和安全边界设计。此目录尚无可运行应用，不支持登录、采集、数据库或导出。没有启动浏览器、安装依赖或提前打包。须收到下一条指令才进入 PHASE 1。

## 隐私与边界

本工具默认在用户自己的电脑本地运行。用户本人在浏览器中完成账号登录。工具不会要求用户向开发者提供账号密码。账号密码不会交给工具；验证码由用户自己处理。

本工具不会将 Cookie、登录令牌、浏览器 Profile 自动上传。数据默认保存于用户自己的本地工作区。无服务器、云数据库、用户账号系统或 AI API 依赖。

允许用户本人启动专属浏览器、手动登录及扫码，浏览器自行维持本地登录状态；用户主动同步时，只读取当前账号有权限且页面已经正常展示的数据，整理后保存本机，未来导出 JSON / CSV / XLSX 给 Public Skill。

禁止获取或记录密码、自动填写密码、密码上传、Cookie/Token 导出分享或上传、验证码自动处理或绕过、登录风控绕过、指纹伪装、反检测、stealth、代理池、IP 轮换、高频抓取、批量账号、养号、自动点赞/评论/关注/私信/发布，以及越权访问。

验证码、登录异常、风控、权限不足或页面结构异常必须 STOP + USER_ACTION_REQUIRED；页面结构变化同时标记 PAGE_SCHEMA_CHANGED。账号不一致时终止同步，不得将不同账号的数据合并。

## 目录与隔离

- `app/`：未来本地 UI 与一次性同步流程。
- `browser/`：未来专属浏览器生命周期；不得读取日常浏览器 Profile。
- `collectors/selectors/`：未来只读 Collector 及集中 selectors。
- `parsers/`、`schemas/`：未来标准化与验证；本阶段仅保存接口参考。
- `storage/`、`exporters/`：未来事务存储及运营数据白名单导出。
- `tests/`、`examples/`：未来测试与合成示例；当前无账号样本。
- `docs/`：本阶段检查报告、安全边界、接口审阅和阶段约束。
- `workspace_template/`：仅说明，不放入任何真实数据或 Profile。
- `workspace/`：本地私有数据根目录，已被 Git 忽略。

固定预留：`workspace/browser_profile/`、`workspace/user_data/`、`workspace/snapshots/`、`workspace/exports/`。数据库及账号身份文件仅在后续阶段实现；当前目录均为空。

本项目有独立 `.git`。父工作目录的 `.git/info/exclude` 仅添加本项目目录忽略规则，不修改父项目受版本控制文件。Public Skill 基线 ZIP 保持原状，仅从中读取 README 接口说明和 Schema。

删除本地数据：未来先关闭工具和专属浏览器，再删除本项目的 `workspace` 文件夹。此操作会同时删除本地登录状态、已同步数据和导出文件；另行保存的备份需用户自行删除。不要删除日常浏览器目录。

详见 [PHASE 0 报告](docs/PHASE_0_REPORT.md)、[安全架构](docs/SECURITY_BOUNDARIES.md)、[接口审阅](docs/BASELINE_INTERFACE_REVIEW.md) 和 [阶段计划](docs/PHASE_PLAN.md)。
