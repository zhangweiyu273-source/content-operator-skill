# Mac 使用指南

适用平台：macOS Apple Silicon arm64（M1 / M2 / M3 / M4）。

1. 下载 `content-operator-local-data-connector-macos-arm64-v1.0.0.zip` 并完整解压。
2. 双击 `启动内容运营数据同步工具.command`。
3. 在本地页面点击“启动专属浏览器”。工具优先使用 Microsoft Edge，没有 Edge 时使用 Google Chrome。
4. 在专属浏览器中由本人完成登录、扫码、密码或验证码。
5. 回到本地页面检查并绑定账号，然后同步账号、历史笔记、当前笔记或阶段数据。
6. 点击“导出给内容运营 Skill”生成 `content_operator_bundle.zip`。

专属浏览器使用包内 `workspace/browser_profile`，不会使用日常浏览器 Profile。请勿分享整个 `workspace` 目录。

如果 macOS 显示“无法打开，因为无法验证开发者”，请右键启动文件并选择“打开”，或者前往“系统设置 → 隐私与安全 → 仍要打开”。不需要关闭整个系统安全机制。

账号密码和验证码只在平台页面中由用户本人处理。工具不获取或导出 Cookie、Token、密码，不绕过验证码、风控或账号权限。
