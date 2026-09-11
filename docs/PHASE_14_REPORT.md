# PHASE 14 验收报告

STATUS = ATTENTION

当前 Windows 11 x64 设备上的自动验收已完成：便携目录和 ZIP 存在、初始包不含 workspace、ZIP 私有路径扫描、包内 Node 运行时健康检查、本地 SQLite 初始化、本地服务启动与状态接口、Edge 检测。

自动验收命令：`node scripts/acceptance_windows.js`。rc.4 便携 ZIP SHA256：`bb3f737c31e3105ad0d81b946ceb486e0a3bbfb7deff9106ebfdf55e4ff13fcc`。

2026-09-11 真实页面校准：创作中心 `/new/home` 的身份 Gate、昵称、账号 ID、头像、简介、关注数、粉丝数及获赞收藏读取通过；该页未展示笔记总数，按设计保留 null。`/new/note-manager` 可用已绑定账号 ID 加当前页昵称与头像稳定图片 ID进行双重核验。历史笔记采集、单篇数据和阶段页仍待逐页实测。

USER_ACTION_REQUIRED = YES

BLOCKED_PHASE = PHASE 14

BLOCK_REASON = 当前设备不是另一台干净 Windows 环境；真实创作者后台必须由用户本人登录，页面 selectors、账号身份字段、各数据页入口和登录状态续用无法用合成数据证明。

USER_MUST_DO = 在解压后的便携包中双击启动脚本，启动专属浏览器并本人登录；检查并确认账号；依次打开账号概览、已发布笔记列表、单篇数据、近 7/30 天趋势页并点击对应同步；关闭后重新启动确认登录状态保留；导出 ZIP 并核对页面数字。随后在一台未安装 Node 的干净 Windows 11 x64 电脑重复启动和导出流程。

单篇数据详情页已在 Windows 专属 Edge Profile 中完成真实页面验收：身份验证通过，单篇同步结果为 PASS，成功写入本地数据库和 Snapshot。实测支持笔记 ID、标题、发布时间、曝光、观看、点赞、收藏、评论和涨粉；页面没有提供的正文及其他指标保持 null。自动便携包验收全部 PASS。

CLEAN_WINDOWS_ACCEPTANCE = PASS
