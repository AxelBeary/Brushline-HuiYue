# 构建与部署系统（Docker + Vite + Fastify + GitHub Actions）
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「knowledge\zh\构建与部署系统（Docker + Vite + Fastify + GitHub Actions）」的仓库内修订版（P2 非认证抽样批 #2），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①「TypeScript/JS 混编」已过时——后端已 100% TS（唯一豁免 db/init.js @ts-nocheck）；②CI 门禁补齐：ci.yml 实际含 eslint + oxlint + typecheck + vitest + build + check:i18n；③补充 Caddyfile encode zstd gzip（环境批 B1）。

## 1. 构建系统与工具链（当前代码现状）

- **前端**：Vue 3（^3.5）+ Vite 6（^6.0），web/package.json 的 build 产出静态资源到 web/dist，由后端静态托管。
- **后端**：Fastify 5（^5.0）+ **100% TypeScript**（2026-08-07 TS 迁移完成，原 5 个 JS 文件 app/index/connection/seed 已转 .ts；唯一豁免 db/init.js @ts-nocheck）。通过 	sx 直接运行（server/package.json 的 dev: tsx --watch src/index.ts / start: tsx src/index.ts），无需预编译产物。
- **测试**：服务端与前端均使用 Vitest；端到端使用 Playwright（根目录 playwright.config.js）。门禁含 	ypecheck: tsc --noEmit（strictNullChecks 全开）。
- **容器化**：多阶段 Dockerfile，第一阶段 
ode:22-slim 构建前端，第二阶段仅拷贝生产依赖与 web/dist，镜像体积最小化。
- **反向代理**：Caddy 2（Alpine 镜像）提供 HTTPS、HTTP/3 自动证书；Caddyfile 含 encode zstd gzip 压缩（环境批 B1）。
- **CI/CD**：GitHub Actions 两个流水线——ci.yml（eslint + oxlint + typecheck + vitest + build + check:i18n）、e2e.yml（Playwright 全链路 E2E）。

## 2. 启动脚本（entrypoint.sh）

- cd /app/server（安全加固批 F6，避免 npx 从 /app 起跑在线下载 tsx）。
- exec npx tsx src/index.ts——TS 迁移后入口已改名 index.ts（entrypoint.sh 第 8 行注释）。

## 3. 关键环境变量

- VITE_SENTRY_DSN：前端构建期注入（Dockerfile ARG，留空禁用）。
- SENTRY_DSN_BACKEND：后端 Sentry DSN（代码读 SENTRY_DSN_BACKEND || SENTRY_DSN，app.ts:145）；非 development 环境且 DSN 非空才初始化（app.ts:210-211）；CSP connect-src 动态拼接 ingest 域名（app.ts:143-158）。
- SESSION_SECRET/COOKIE_SECRET：会话/Cookie 签名密钥（生产 fail-fast）。
- NODE_ENV/DB_PATH/UPLOAD_DIR/TRUST_PROXY/TZ/CORS_ORIGIN：docker-compose environment 覆盖。
- DOMAIN：供 Caddyfile {} 使用。
