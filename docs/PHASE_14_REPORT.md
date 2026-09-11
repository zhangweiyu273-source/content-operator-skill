# PHASE 14 验收报告

STATUS = ATTENTION

当前 Windows 11 x64 设备上的自动验收已完成：便携目录和 ZIP 存在、初始包不含 workspace、ZIP 私有路径扫描、包内 Node 运行时健康检查、本地 SQLite 初始化、本地服务启动与状态接口、Edge 检测。

自动验收命令：`node scripts/acceptance_windows.js`。便携 ZIP SHA256：`330b1222988f50437f6b13f115c39877191cb677e009793b2e9b6466b4511863`。

USER_ACTION_REQUIRED = YES

BLOCKED_PHASE = PHASE 14

BLOCK_REASON = 当前设备不是另一台干净 Windows 环境；真实创作者后台必须由用户本人登录，页面 selectors、账号身份字段、各数据页入口和登录状态续用无法用合成数据证明。

USER_MUST_DO = 在解压后的便携包中双击启动脚本，启动专属浏览器并本人登录；检查并确认账号；依次打开账号概览、已发布笔记列表、单篇数据、近 7/30 天趋势页并点击对应同步；关闭后重新启动确认登录状态保留；导出 ZIP 并核对页面数字。随后在一台未安装 Node 的干净 Windows 11 x64 电脑重复启动和导出流程。

AFTER_USER_ACTION = 根据实际页面结果校准集中 selectors 和提示词，记录实测字段与页面版本；全部通过后将版本从 1.0.0-rc.1 提升为正式版，并把 CLEAN_WINDOWS_ACCEPTANCE 更新为 PASS。
