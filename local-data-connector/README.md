# Local Data Connector for Windows

这是 Content Operator Skill 的可选本地数据同步工具，正式版本为 `1.0.0`。

它使用独立的 Microsoft Edge Profile。用户本人完成登录、扫码、密码和验证码操作，然后主动同步本人有权查看的账号信息、历史笔记、单篇笔记数据和阶段数据。数据写入本地 SQLite 与 Snapshot，并可导出为 Public Skill 可读取的数据包。

## 下载和使用

普通用户请从 GitHub Releases 下载 `content-operator-local-data-connector-windows-x64-v1.0.0.zip`，完整解压后双击 `启动内容运营数据同步工具.cmd`。

详细步骤见仓库的 [使用指南](../docs/使用指南.md)。

## 源码位置

为了保持已经完成实机验收的工程结构，源码保留在仓库根目录：

- `app/`：本地服务和界面
- `browser/`：专属 Edge 启动与本机 CDP 连接
- `collectors/`：账号和笔记数据读取
- `storage/`：SQLite、迁移、Snapshot 和备份
- `exporters/`：Public Skill 数据包导出
- `parsers/`：日期、数字和身份字段规范化
- `schemas/`：数据接口说明
- `tests/`：自动测试

## 安全边界

连接器不获取、保存或自动填写密码，不导出 Cookie、Token 或 Browser Profile，不处理或绕过验证码与风控，不自动点赞、评论、关注、私信或发布。
