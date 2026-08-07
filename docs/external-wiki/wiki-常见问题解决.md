# 常见问题解决
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「故障排除\常见问题解决.md」的仓库内修订版（P2 非认证抽样批 #7），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①文件名 .js→.ts（connection.ts/app.ts/index.ts，TS 迁移；init.js 豁免保留）；②features/shared 引用路径全部核实存在；③正文 TOTP 时代描述/上传白名单/订单 stage 接口均与 master 吻合，保留原文正确内容。

<cite>
**本文引用的文件**
- [server/src/db/connection.ts](file://server/src/db/connection.ts)
- [server/src/app.ts](file://server/src/app.ts)
- [server/src/index.ts](file://server/src/index.ts)
- [server/src/shared/errors.ts](file://server/src/shared/errors.ts)
- [server/src/shared/middleware/auth.ts](file://server/src/shared/middleware/auth.ts)
- [server/src/features/auth/auth.routes.ts](file://server/src/features/auth/auth.routes.ts)
- [server/src/features/upload/upload.routes.ts](file://server/src/features/upload/upload.routes.ts)
- [server/src/features/order/order.routes.ts](file://server/src/features/order/order.routes.ts)
- [docker-compose.yml](file://docker-compose.yml)
- [.env.example](file:.env.example)
- [server/package.json](file://server/package.json)
</cite>

## 人话总览

后端 Fastify + SQLite（better-sqlite3），模块化路由与服务分层；静态/上传由 @fastify/static 托管；认证为 httpOnly Cookie + 会话签名（TOTP 动态口令主登录）；上传模块有白名单与路径穿越防护；全局错误处理统一返回结构化错误码与中文提示。入口 index.ts → app.ts（TS 迁移后）。

## 数据库连接失败

- 症状：启动即报错退出；运行时 busy/WAL 错误（Docker Desktop Windows bind mount 场景）。
- 排查：DB_PATH 有效且可写；data 目录存在（连接模块会自动创建）；Docker/K8s 环境 journal_mode 自动 DELETE；端口占用与崩溃重启循环（index.ts 未捕获异常记录并退出）。
- 修复：修正 .env DB_PATH；确认 volumes ./data:/app/data；清理残留 .db-wal/.db-shm 后重启；看 index.ts 未捕获异常日志。

## 文件上传错误

- 症状：「仅支持 JPG/PNG/WebP/GIF 格式的图片」「不支持的文件类型/格式」「非法的文件路径」「未收到文件」；大文件被拒（图片 10MB，交付文件 50MB）；references/deliverables/notes 403（缺签名）。
- 排查：multipart/form-data + file 字段；扩展名与 MIME 双白名单；大小限制；上传目录存在且磁盘充足；私有目录需 signedUrl（sig 参数）。
- 修复：前端按规范构造 multipart；GIF 等提示转换 JPG/WebP；用 /api/upload/* 返回的 url（已签名）；频繁 429 则降频。

## 认证授权异常（TOTP 时代）

- 症状：401 未登录/登录已过期/账号不存在/账号已停用/登录状态已失效；TOTP 动态口令错误/未绑定/锁定/尝试过多；管理员权限不足。
- 排查：Cookie 中 artist_token 存在且未被篡改（httpOnly 防 XSS）；SESSION_SECRET 与 COOKIE_SECRET 正确（生产必须）；TOTP 绑定状态与动态口令（验证器时间同步）；账号 deleted_at 或 token_version 变更；管理员接口需 QQ 号等于 ADMIN_QQ。
- 修复：重新登录（POST /api/auth/verify {qqNumber, code}，唯一登录端点）；登出递增 token_version；TOTP 锁定等待过期或管理员 
pm run totp:rebind -- <QQ号> 重置；生产设置 SESSION_SECRET/COOKIE_SECRET/ADMIN_QQ。

## 订单状态异常

- 症状：INVALID_TRANSITION / 不允许的状态 / 交付状态不正确；订单不存在/非本画师/ID 无效；工作流模式下应走 stage 接口。
- 排查：current_stage_id 存在则必须走 stage 接口；校验 status/priority/deadline/startDate 枚举与格式；requireOwnOrder 归属校验；交付 filePath 属于 deliverables/{artistId}/ 防路径穿越。
- 修复：工作流订单用 PUT /:id/stage；普通订单用 status；filePath 引用自己上传的文件；「即将到期」用专用接口按 deadline 排序；关注 enrichOrderForArtist 返回（paidTotalCents/remainingCents/installments/startDate）避免前端覆盖。

## 附录：环境配置检查清单

- 必填：SESSION_SECRET（≥32 字符）、COOKIE_SECRET、ADMIN_QQ（生产首次部署必填）。
- 部署：NODE_ENV=production/development；AUTH_DEV_MODE（生产 false，当前已关闭）。
- 可选：DB_PATH、UPLOAD_DIR、CORS_ORIGIN、DOMAIN、SENTRY_DSN_BACKEND（后端错误监控，代码兼容裸 SENTRY_DSN）。
- Compose：ports 3000 已注释（v0.42 拍板仅走 Caddy）；healthcheck /api/health 可达。
- 脚本：server/package.json dev/start/test/lint/typecheck/totp:rebind 可用。
