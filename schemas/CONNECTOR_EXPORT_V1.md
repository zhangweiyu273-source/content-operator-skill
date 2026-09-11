# Connector Export V1

`account_profile_input.json` 和 `notes.json` 映射 Public V1 已有字段；Connector 不推断定位、受众、内容支柱和风格，因此对应字段使用基线定义的空值。

`latest_snapshot.json` 是最近一条原始账号/阶段快照。`publication_manifest_input.json` 使用 `content-operator-connector-export-v1`，列出账号、生成时间、笔记数、Public Skill 版本及其余文件的字节数和 SHA256。

`content_operator_bundle.zip` 仅包含固定白名单：account_profile_input.json、notes.json、latest_snapshot.json、publication_manifest_input.json、notes.csv、notes.xlsx。
