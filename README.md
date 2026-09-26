# Content Operator Skill

一个长期内容运营 Skill，以及可选的本地账号数据同步工具。

它不是单纯的 AI 文案生成器。项目围绕完整运营闭环工作：

**数据 → 定位 → 选题 → 内容 → 发布 → 数据回流 → 复盘 → 下一轮运营**

它可以帮助个人创作者完成账号定位、历史数据分析、高表现内容识别、选题池建设、热点筛选、内容生成、发布后复盘和下一轮运营建议。

## 项目的两个组成部分

### Public Skill

[Public Skill](public-skill/) 负责：

**数据 → 定位 → 选题 → 内容 → 复盘**

它优先使用用户主动提供的账号资料、历史内容和表现数据建立账号自己的基准，再结合长期用户问题、事件节点和热点做内容决策。

### Local Data Connector

[Local Data Connector](local-data-connector/) 是可选工具，当前 Windows 版为 `1.1.0`，macOS Apple Silicon 版为 `1.0.0`。两个平台共用同一套采集、身份校验、SQLite、Snapshot 和导出逻辑。历史笔记同步使用创作者中心正常登录态下的 Network/API 列表数据，并以增强的 DOM 滚动采集作为回退。它的流程是：

```text
用户本人手动登录自己的账号
↓
同步本人有权查看的数据
↓
保存在本地
↓
导出给 Public Skill
```

为了保留已经完成实机验收的工程结构，Connector 源码位于仓库根目录的 `app/`、`browser/`、`collectors/`、`storage/`、`exporters/`、`parsers/` 和 `schemas/`，测试位于 `tests/`。

## 最简单的使用方式

```text
下载 Public Skill
↓
导入支持 Skill 或文件读取的桌面智能体
↓
发送“初始化我的内容账号”
↓
上传自己的账号资料
↓
开始定位、选题和内容运营
```

也可以直接把 `public-skill/` 中的文件交给支持文件读取的智能体使用。

## 数据同步工具怎么用

```text
下载对应平台的数据同步工具
↓
完整解压 ZIP
↓
Windows 双击 `启动内容运营数据同步工具.cmd`
Mac 双击 `启动内容运营数据同步工具.command`
↓
点击“启动专属浏览器”
↓
用户本人登录并确认账号
↓
同步自己的数据
↓
导出给内容运营 Skill
```

详细步骤见 [使用指南](docs/使用指南.md) 和 [Connector 说明](local-data-connector/README.md)。

## 隐私与安全

> 账号密码只由用户本人在平台页面中输入。项目不要求用户把密码提供给开发者。

- 用户本人完成扫码、密码和验证码操作。
- 数据默认保存在本地 `workspace/`，该目录被 Git 忽略。
- Cookie、Token、Browser Profile、密码和数据库不会进入导出包。
- 不自动点赞、评论、关注、私信或发布。
- 不绕过验证码、风控或账号权限。
- 不使用 stealth、指纹伪装或代理池。

## 下载

请从 GitHub Releases 下载：

- `content-operator-skill-public-v1.zip`
- `content-operator-local-data-connector-windows-x64-v1.1.0.zip`
- `content-operator-local-data-connector-macos-arm64-v1.0.0.zip`
- `content-operator-skill-user-guide.md`

Windows Connector v1.0.0 的历史 SHA256：

```text
8ca2e45bbee006f5f2b37ad838f2197340382fd91837d06d630f0ac759c0810f
```

Public Skill ZIP 的 SHA256：

```text
34eb43def97cb16ad95ee5de16d8b1907cd0b66b22d24d21ea240991bf87c799
```

两个校验值也记录在 v1.0.0 Release Notes 中。

## 许可证

本项目采用 [MIT License](LICENSE)。
