# 导出给内容运营 Skill

完成同步并查看本地数据后，点击「导出给内容运营 Skill」。文件保存在 `workspace/exports`。

最方便的是使用 `content_operator_bundle.zip`。它只包含：

- `account_profile_input.json`
- `notes.json`
- `latest_snapshot.json`
- `publication_manifest_input.json`
- `notes.csv`
- `notes.xlsx`

ZIP 不包含浏览器 Profile、Cookie、Token、密码、数据库、日志或环境变量。manifest 会记录各文件大小和 SHA256，便于发现文件损坏。

把 ZIP 提供给「内容运营 Skill Public V1」，并说明：“请使用这个本地 Connector 数据包更新我的账号历史数据并复盘。”

再次导出会刷新 exports 中的同名结果；数据库和 snapshots 历史不会被覆盖。需要保留某次导出时，请将 ZIP 复制到你自己的安全目录并改名。
