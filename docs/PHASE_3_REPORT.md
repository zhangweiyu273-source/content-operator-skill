# PHASE 3 验收报告

STATUS = PASS（离线工程验收）

实现本机 CDP 会话、页面身份候选读取、用户确认后原子绑定 account_identity.json，以及每次同步前核验。CDP WebSocket 只接受 localhost/127.0.0.1。

首次未绑定、身份不可见均返回 USER_ACTION_REQUIRED；账号 ID 不同返回 ACCOUNT_IDENTITY_VERIFIED=NO、ACCOUNT_MISMATCH=YES、SYNC_ABORTED=YES。已绑定文件不能被另一个账号覆盖。

页面 URL 和头像 URL 移除 query/hash，避免带签名或 Token 的参数落盘。自动测试覆盖字段清洗、显式绑定、同账号通过、异账号拒绝及不可覆盖。

真实页面 selectors 尚需登录后验证；识别不出稳定 account_id 时会停止，不以昵称猜测唯一身份。
