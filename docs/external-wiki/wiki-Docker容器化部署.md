# Docker 容器化部署
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「部署运维\Docker 容器化部署.md」的仓库内修订版（P2 非认证抽样批 #1），按 master 代码逐条核实修正；外部原文（C:\Users\qly19\Desktop\repowiki\）一字未动。
> 修订范围：①TS 迁移——server/src/app.js→app.ts、server/src/index.js→index.ts（.js 已不存在，仅 db/init.js 豁免 @ts-nocheck 保留）；②entrypoint.sh 实际执行 
px tsx src/index.ts（原文写 src/index.js）；③compose ports: 3000:3000 已注释（v0.42 拍板用户选 B，仅走 Caddy，见 docker-compose.yml 注释）；④Caddyfile 已有 encode zstd gzip（环境批 B1）；⑤SENTRY_DSN_BACKEND 命名正确（原文已对，正文保留）。

<cite>
**本文引用的文件**
- [Dockerfile](file://artist-commission/Dockerfile)
- [docker-compose.yml](file://artist-commission/docker-compose.yml)
- [entrypoint.sh](file://artist-commission/entrypoint.sh)
- [Caddyfile](file://artist-commission/Caddyfile)
- [.dockerignore](file://artist-commission/.dockerignore)
- [server/package.json](file://artist-commission/server/package.json)
- [web/package.json](file://artist-commission/web/package.json)
- [server/src/app.ts](file://artist-commission/server/src/app.ts)
- [server/src/index.ts](file://artist-commission/server/src/index.ts)
- [server/src/db/init.js](file://artist-commission/server/src/db/init.js)
</cite>

## 人话总览

系统由两个容器组成：web 容器（后端 Fastify + 前端静态资源，监听 3000）和 caddy 容器（反向代理，对外 80/443，自动 HTTPS）。SQLite 数据库与上传文件通过宿主机目录挂载持久化。启动入口为 entrypoint.sh，实际执行 
px tsx src/index.ts（TS 迁移后入口已改名，见 entrypoint.sh 第 8 行）。

## 启动脚本执行流程（当前代码现状）

- entrypoint.sh 先 cd /app/server（安全加固批 F6：避免 npx 从 /app 起跑找不到 node_modules/.bin 而在线下载 tsx）。
- 随后 exec npx tsx src/index.ts——TS 迁移后入口为 index.ts，显式写扩展名（entrypoint.sh 注释「TS 迁移后入口已改名 index.ts」）。
- index.ts 首行 import 'dotenv/config' 加载 .env，然后 buildApp()（app.ts）初始化插件/路由/错误处理，app.listen({ port: PORT, host: '0.0.0.0' }) 监听。

## 环境变量与配置注入（当前代码现状）

- 构建期：VITE_SENTRY_DSN 通过 Dockerfile ARG 注入前端构建（docker-compose.yml args.VITE_SENTRY_DSN）。
- 运行期：NODE_ENV、DB_PATH、UPLOAD_DIR、TRUST_PROXY、TZ、SENTRY_DSN_BACKEND、COOKIE_SECRET/SESSION_SECRET、CORS_ORIGIN 等由 docker-compose env_file + environment 注入。
- **Sentry 变量名注意**：.env 实际变量名是 SENTRY_DSN_BACKEND（docker-compose env_file 全量注入），代码读 process.env.SENTRY_DSN_BACKEND || process.env.SENTRY_DSN（app.ts:145 向后兼容）。CSP connect-src 根据该值动态拼接 Sentry DSN 域名（app.ts:143-158，未配置则 connect-src 仅 'self'）。
- 安全头与 CSP：app.ts 动态拼接 connect-src（app.ts:143-158）。

## 网络与端口映射（当前代码现状）

- **3000 端口已注释**：docker-compose.yml 中 ports: "3000:3000" 两行已注释（v0.42 拍板 2026-08-07 用户选 B：A 测已结束，生产收紧，仅走 Caddy），保留 expose: "3000" 供 Caddy 反代。
- Caddy 对外 80/443（含 HTTP/3 443/udp），everse_proxy web:3000。
- TRUST_PROXY 默认信任 Docker 内网段（172.16/12, 10/8, 192.168/16），防 X-Forwarded-For 伪造。

## 数据卷与持久化

- DB_PATH=/app/data/commission.db 映射宿主 ./data。
- UPLOAD_DIR=/app/uploads 映射宿主 ./uploads。
- 镜像构建时 chown -R node:node 确保非 root 用户可写。

## 健康检查与探针

- GET /api/health 返回 {status:'ok', time:...}（app.ts 注册）。
- compose healthcheck：每 30s fetch('http://127.0.0.1:3000/api/health')，超时 5s，重试 3 次，启动宽限期 10s。
- caddy depends_on.web.condition: service_healthy，避免冷启动 502。

## 安全加固措施（当前代码现状）

- 非 root 运行：Dockerfile USER node。
- 安全响应头：X-Content-Type-Options、X-Frame-Options、Content-Security-Policy（connect-src 含 Sentry ingest 域名）、Referrer-Policy、Permissions-Policy、Cross-Origin-*（app.ts）。
- 上传访问控制：/uploads/ 下非公开路径（references/deliverables/notes）需签名验证（file-sign.ts），禁止 MIME 嗅探。
- 依赖升级：构建时全局升级 npm 修复已知漏洞。

## Caddyfile（当前代码现状）

- 单主域 {}（C48 决策放弃子域名，画师主页走路径 /artist/:subdomain）。
- **encode zstd gzip**（环境批 B1）：启用压缩，zstd 优先回退 gzip，Caddy 2 内置编码器无需插件。
- everse_proxy web:3000。

## 故障排查指南

- 服务无法启动：检查 .env 是否包含 DB_PATH、UPLOAD_DIR、NODE_ENV；看容器日志（docker compose logs -f web）。
- 健康检查失败：确认 /api/health 可达与容器网络。
- 上传文件无法访问：检查 /uploads 权限（node:node）；非公开路径需带 sig 参数。
- 数据库迁移失败：查看迁移日志与备份文件生成情况（迁移 v45 为最新，迁移运行器事务内 PRAGMA foreign_keys 是 no-op，DROP/RENAME 父表迁移须事务外执行——v38 事故教训）。
- 反向代理无法访问：确认 Caddyfile 域名（{}）与 DNS 解析。

## 附录：关键环境变量清单

- NODE_ENV=production
- DB_PATH=/app/data/commission.db
- UPLOAD_DIR=/app/uploads
- TRUST_PROXY=172.16.0.0/12,10.0.0.0/8,192.168.0.0/16
- TZ=Asia/Shanghai
- SENTRY_DSN_BACKEND（可选，后端 Sentry；代码兼容裸 SENTRY_DSN）
- COOKIE_SECRET / SESSION_SECRET（生产必填，fail-fast）
- CORS_ORIGIN（可选，生产同域时可不注册 CORS）
- VITE_SENTRY_DSN（构建期，可选）
