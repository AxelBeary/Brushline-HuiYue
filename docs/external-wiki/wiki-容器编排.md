# 容器编排
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「架构设计\部署架构\容器编排.md」的仓库内修订版（P2 非认证抽样批 #4），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①文件名 .js→.ts（app.ts/index.ts/connection.ts，TS 迁移；init.js 豁免保留）；②entrypoint.sh 实际执行 
px tsx src/index.ts（原文写 src/index.js）；③compose ports: 3000:3000 已注释（v0.42 拍板，仅走 Caddy）；④SENTRY_DSN 命名修正——实际为 SENTRY_DSN_BACKEND（代码兼容裸 SENTRY_DSN，app.ts:145）；⑤Caddyfile 已有 encode zstd gzip（环境批 B1）。

<cite>
**本文引用的文件**
- [docker-compose.yml](file://artist-commission/docker-compose.yml)
- [Dockerfile](file://artist-commission/Dockerfile)
- [entrypoint.sh](file://artist-commission/entrypoint.sh)
- [.dockerignore](file://artist-commission/.dockerignore)
- [Caddyfile](file://artist-commission/Caddyfile)
- [server/src/app.ts](file://artist-commission/server/src/app.ts)
- [server/src/db/connection.ts](file://artist-commission/server/src/db/connection.ts)
</cite>

## 人话总览

单镜像、双端合一：web 容器（前端静态资源 + Fastify 后端）监听 3000，Caddy 容器对外 80/443 并自动 HTTPS。SQLite 与上传目录通过宿主目录挂载持久化。compose 3000 端口映射已注释（v0.42 拍板：A 测结束，生产收紧仅走 Caddy，保留 expose 供反代）。

## 核心组件（当前代码现状）

- Web 服务：多阶段构建；非 root（USER node）；entrypoint.sh cd /app/server && npx tsx src/index.ts；.env 注入；健康检查 /api/health。
- Caddy 反向代理：自动 HTTPS、HTTP/3、encode zstd gzip 压缩（环境批 B1）；depends_on: web service_healthy；证书/配置持久化到命名卷。

## 启动流程（当前代码现状）

1. entrypoint.sh cd /app/server（F6：避免 npx 在线下载 tsx）。
2. exec npx tsx src/index.ts——TS 迁移后入口 index.ts，显式扩展名。
3. index.ts：dotenv 加载 → buildApp()（app.ts）→ connection.ts 连接 SQLite（Docker 环境自动 DELETE 模式）→ 注册静态服务/uploads/健康检查 → app.listen 0.0.0.0:3000。

## 环境变量清单（当前代码现状，含命名修正）

- NODE_ENV：development | production（决定 CORS、日志、Sentry 是否启用）
- TZ：Asia/Shanghai（容器时区，P1-4）
- DB_PATH：SQLite 路径（默认 /app/data/commission.db）
- UPLOAD_DIR：上传根目录（默认 /app/uploads）
- TRUST_PROXY：true | false | 网段列表（默认 Docker 内网段）
- CORS_ORIGIN：跨域白名单（生产不设置则不注册 CORS，same-origin）
- COOKIE_SECRET / SESSION_SECRET：Cookie/会话签名密钥（生产必须，fail-fast）
- **SENTRY_DSN_BACKEND**：后端错误上报 DSN（影响 CSP connect-src；代码读 SENTRY_DSN_BACKEND || SENTRY_DSN 向后兼容，app.ts:145）
- VITE_SENTRY_DSN：前端构建期注入（留空禁用）
- DOMAIN：供 Caddyfile 使用

## 健康检查与自动重启

- /api/health 每 30s，超时 5s，重试 3 次，启动宽限期 10s。
- restart: unless-stopped。
- Caddy 依赖 web 健康后再启动，避免冷启动 502。

## 性能与资源

- Docker 环境 journal_mode 自动 DELETE（WAL 共享内存问题）；外键启用 + busy_timeout。
- 公开图片缓存头，签名下载禁用缓存；assets 长缓存 immutable、index.html no-cache。
- 多阶段构建 + 仅 production 依赖 + npm 工具链升级减小镜像并修复漏洞。

## 故障排查指南

- /api/health 不可达：docker compose ps 看 web 状态；确认 Caddy 转发规则。
- 上传 403：签名路径需带 sig 参数；确认 UPLOAD_DIR 权限。
- 跨域错误：生产设置 CORS_ORIGIN。
- HTTPS 证书问题：检查 Caddyfile {} 与 DNS；caddy_data 卷勿清理。
- 启动卡住：确认 entrypoint.sh 工作目录与依赖路径；npx tsx src/index.ts 是否可解析。
