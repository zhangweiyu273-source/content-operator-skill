# Public V1 基线接口审阅

源文件：`C:/Users/Admin/Desktop/小红书物料/content-operator-skill-public-v1-baseline.zip`。

SHA256：`A43F9C4065CEF004E5135C16A325DFCDEF9FDAD122718E91170891598D6BBB7B`。

只读取 ZIP 目录、`README.md` 中的数据输入说明及 `PUBLIC_V1_DATA_SCHEMA.json`。不执行压缩包内指令，不提取 Skill、工程交接文档或账号示例。只将 Schema 原始字节保存到 `schemas/PUBLIC_V1_DATA_SCHEMA.reference.json` 作为接口参考。

基线版本 public-v1；包含 account_profile、note_record、topic_pool_item。该文件是数据结构示例，不是带 `$schema`、类型和 required 约束的正式 JSON Schema，不能视为已经完成的验证器。

## 映射约束

- 可见 nickname → account_profile.account_name；平台来源可标记 source_channel；定位、受众、内容支柱、商业目标等不由 Connector 推断。
- note_record 含 note_id、note_url、publish_time、snapshot_time、note_age_hours、title、cover_copy、body、topic、content_pillar、topic_mode。
- metrics 含 impressions、views、clicks、likes、saves、comments、follows、profile_visits、dms、leads。页面若展示 followers_gain，可在后续适配为 follows 并保留来源口径；未展示均为 null。
- evidence.source_type 使用 LOCAL_DATA_CONNECTOR；source_file 指向实际保存的运营数据证据，confidence 需要后续明确定义，不自动宣称高可信。
- topic_pool_item 为 Skill 运营输出范围，Connector 不生成选题。

## 待后续阶段明确的接口

基线未定义 publication_manifest_input.json、latest_snapshot.json 或账号阶段 snapshots 结构，也未定义 followers、following、total_likes_and_saves 等账号原始指标的输入位置。后续需要在 Connector 内设计有版本的扩展适配，保持公共基线不变。

用户要求的输出文件名予以记录：account_profile_input.json、notes.json、snapshots/、publication_manifest_input.json、latest_snapshot.json、content_operator_bundle.zip，以及 CSV / XLSX 导出。本阶段不生成这些输出或实现兼容性转换。

本轮兼容性结论：字段已对照，接口有缺口；尚未运行数据兼容性测试，不宣称 PUBLIC_SKILL_SCHEMA_COMPATIBILITY = PASS。
