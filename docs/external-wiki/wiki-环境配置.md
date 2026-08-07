# 环境配置
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「架构设计\部署架构\环境配置.md」的仓库内修订版（P2 非认证抽样批 #5），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①文件名 .js→.ts（index.ts/app.ts/connection.ts，TS 迁移；init.js 豁免保留）；②entrypoint.sh 实际执行 
px tsx src/index.ts（原文写 src/index.js）；③compose 端口现状：3000 映射已注释（v0.42 拍板仅走 Caddy）；④正文环境变量命名已正确（SENTRY_DSN_BACKEND），保留原文正确部分。

<cite>
**本文引用的文件**
- [server/src/index.ts](file://artist-commission/server/src/index.ts)
- [server/src/app.ts](file://artist-commission/server/src/app.ts)
- [server/src/db/connection.ts](file://artist-commission/server/src/db/connection.ts)
- [docker-compose.yml](file://artist-commission/docker-compose.yml)
- [Dockerfile](file://artist-commission/Dockerfile)
- [entrypoint.sh](file://artist-commission/entrypoint.sh)
- [docs/开发→生产切换指南.md](file://artist-commission/docs/开发→生产切换指南.md)
- [server/vitest.config.js](file://artist-commission/server/vitest.config.js)
</cite>

## 人话总览

环境变量管理链路：entrypoint.sh 启动 Node → index.ts 首行 dotenv/config 加载 .env → buildApp()（app.ts）注册插件/路由/错误处理/Sentry → connection.ts 连接 SQLite。docker-compose 用 env_file 注入 .env 全量，environment 覆盖关键运行参数（NODE_ENV/DB_PATH/UPLOAD_DIR/TRUST_PROXY/TZ）。

## 环境变量加载与优先级（当前代码现状）

- 容器内 entrypoint.sh 执行 
px tsx src/index.ts（TS 迁移后入口）。
- index.ts 首行 import 'dotenv/config' 加载 .env。
- docker-compose env_file 全量注入 .env；environment 中同名变量覆盖 .env 值。
- AUTH_DEV_MODE：仅由 .env 控制（v0.11 起，compose 不硬编码）；当前生产已关闭（.env:13 与容器 printenv 均为 false，2026-08-07 一号核实）。

## 数据库连接与持久化

- DB_PATH 默认 ./data/commission.db；测试可 :memory:。
- Docker/Kubernetes 环境自动 DELETE 模式（避免 WAL 共享内存问题）；外键开启、busy_timeout。

## 文件存储与访问控制

- UPLOAD_DIR 默认 ./uploads；启动时确保目录存在。
- images/ 公开路径：inline + 缓存；references/deliverables/notes：需签名 URL（attachment + no-store）。
- 孤儿文件回收：按引用集合与修改时间清理，移入回收站按日归档。

## 安全与跨域

- Cookie 签名：COOKIE_SECRET > SESSION_SECRET > 默认值（生产必须设置 COOKIE_SECRET，fail-fast）。
- CORS：生产未设置 CORS_ORIGIN 则不注册（same-origin）；开发全开。
- TRUST_PROXY 支持 true/false 或 CIDR 列表，默认 Docker 内网段。
- 安全响应头：X-Content-Type-Options、X-Frame-Options、CSP（connect-src 动态拼接 Sentry ingest 域名）、Referrer-Policy、Permissions-Policy、COOP/CORP。

## 错误监控（Sentry，当前代码现状）

- 后端：SENTRY_DSN_BACKEND 非空且 NODE_ENV !== development 时启用（app.ts:210-211；代码兼容裸 SENTRY_DSN，app.ts:145）；release 取 package.json 版本；sendDefaultPii=false；tracesSampleRate=0。
- CSP connect-src：根据 SENTRY DSN 动态拼接 ingest 域名（app.ts:143-158，未配置则仅 'self'）。
- 前端：VITE_SENTRY_DSN 镜像构建期注入（Dockerfile ARG），留空禁用。

## 健康检查与 SPA 回退

- /api/health 返回状态与时间。
- web/dist 存在时提供静态资源与 fallback index.html（SPA）。

## 测试环境隔离

- server/vitest.config.js 强制注入：DB_PATH=:memory:、SESSION_SECRET、NODE_ENV=test、TZ=Asia/Shanghai、UPLOAD_DIR 临时目录。

## 关键环境变量清单（当前代码现状）

- PORT：默认 3000
- NODE_ENV：development/test/production
- TZ：Asia/Shanghai
- DB_PATH：./data/commission.db（测试 :memory:）
- UPLOAD_DIR：./uploads
- WEB_DIST：../../web/dist（默认）
- COOKIE_SECRET：优先于 SESSION_SECRET（生产必须）
- SESSION_SECRET：会话签名密钥
- SIGN_SECRET：⚠️ 不存在——文件签名 URL 密钥实为 SESSION_SECRET（file-sign.ts；外部其他文档曾有虚构 SIGN_SECRET，已修正）
- CORS_ORIGIN：生产跨域白名单
- TRUST_PROXY：true/false 或 CIDR（默认 Docker 内网段）
- SENTRY_DSN_BACKEND：后端错误监控 DSN
- VITE_SENTRY_DSN：前端构建期注入
- AUTH_DEV_MODE：仅 .env 控制（生产 false）
- DOMAIN：供 Caddyfile 使用

## 故障排查指南

- 上传 403：UPLOAD_DIR 可写 + 非公开路径带 sig。
- CORS 报错：生产设置 CORS_ORIGIN。
- 登录失效/Token 伪造：确认 SESSION_SECRET/COOKIE_SECRET 为随机值且不泄露。
- Sentry 未上报：确认 SENTRY_DSN_BACKEND 已设且 NODE_ENV !== development。
- 数据库损坏/迁移失败：检查 DB_PATH 权限与磁盘；查看迁移备份（.bak.vXX）。
- 端口暴露：生产仅走 Caddy（3000 映射已注释）。
