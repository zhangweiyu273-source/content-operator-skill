# PHASE 13 验收报告

STATUS = PASS

构建 Windows 11 x64 免安装 ZIP，内含 Node 24 运行时、Connector、教程和中文启动脚本。普通用户解压后双击即可启动本地服务和界面，无需安装 npm 依赖。

构建器采用明确源码目录清单，并拒绝 workspace、browser_profile、exports、logs、backups、Cookie、Token、环境文件和数据库路径。包内 BUILD_INFO.json 记录版本、平台、构建时间、文件大小和 SHA256。

实际 ZIP 路径与校验和由构建命令输出，并在最终验收报告记录。

rc.3 构建结果：47 个文件，92,936,995 bytes，SHA256 `fd870789c90540646806a4d86d555edfd3dae05c7fe111b07581460861fd816a`。便携包使用带版本号的新目录，构建器检测到目标目录已有 workspace 时会拒绝覆盖。包内只携带用户文档，不携带内部阶段报告。

rc.4 构建结果：47 个文件，92,940,316 bytes，SHA256 `bb3f737c31e3105ad0d81b946ceb486e0a3bbfb7deff9106ebfdf55e4ff13fcc`。该版本加入真实单篇数据详情页适配、多标签页按 Collector 路由，以及仅含本机 CDP 端口的浏览器连接恢复信息；不保存或导出 Cookie、Token、密码。

正式版 1.0.0 构建结果：47 个文件，92,939,943 bytes，SHA256 `8ca2e45bbee006f5f2b37ad838f2197340382fd91837d06d630f0ac759c0810f`。用户工作区、数据库、浏览器 Profile、Cookie、Token 和密码均未进入发布包。
