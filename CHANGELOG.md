# Changelog

## v1.1.0

### Local Data Connector for Windows

- 历史笔记改为创作者中心 Network/API 数据优先、DOM 滚动回退的双通道采集
- 递归识别严格的笔记列表对象和分页/游标信息，拒绝把普通随机 ID 当作笔记
- 支持真实滚动容器、页面滚动、加载状态和连续稳定轮次判断，上限提高到 2000 篇
- API 与 DOM 数据按 `note_id` 合并，保留新增、更新和去重语义
- 从创作者中心其他页面同步时自动打开笔记管理页，并继续执行账号身份校验
- 同步结果显示发现、新增、更新、数据库总数及两路来源数量
- 保持单篇数据同步独立，保留全部 V1.0 安全边界

## v1.0.0

### Public Skill

- 账号初始化
- 定位分析
- 账号自身数据基准
- `ACCOUNT_PROVEN`
- `LIVE_TREND`
- `EVERGREEN_PROBLEM`
- `EVENT_TRIGGERED`
- 选题池
- Distribution Gate
- 内容生成
- 发布后复盘
- 周/月复盘

### Local Data Connector

- Windows x64 本地运行
- 独立浏览器 Profile
- 用户本人手动登录
- 账号身份确认
- 账号数据同步
- 历史笔记同步
- 单篇笔记同步
- Snapshot
- SQLite 本地数据
- Public Skill 数据导出
- Windows 便携包
