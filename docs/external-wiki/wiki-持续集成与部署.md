# 持续集成与部署
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「部署运维\持续集成与部署.md」的仓库内修订版（P2 非认证抽样批 #8），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①CI 门禁补齐——server job 实际为 eslint → oxlint → typecheck → vitest（原文漏 oxlint/typecheck），web job 实际为 eslint → vitest → build → check:i18n（原文漏 check:i18n）；②引用文件全部存在（eslint.config.js / vitest.config.js / global-setup.js 等均为 .js 未 TS 化，仅后端源码 .ts 化）；③启动入口补 src/index.ts（TS 迁移）。

<cite>
**本文引用的文件**
- [ci.yml](file://.github/workflows/ci.yml)
- [e2e.yml](file://.github/workflows/e2e.yml)
- [package.json](file://package.json)
- [server/package.json](file://server/package.json)
- [web/package.json](file://web/package.json)
- [playwright.config.js](file://playwright.config.js)
- [global-setup.js](file://e2e/global-setup.js)
- [global-teardown.js](file://e2e/global-teardown.js)
- [server/vitest.config.js](file://server/vitest.config.js)
- [web/vitest.config.js](file://web/vitest.config.js)
- [Dockerfile](file://Dockerfile)
- [docker-compose.yml](file://docker-compose.yml)
- [server/eslint.config.js](file://server/eslint.config.js)
- [web/eslint.config.js](file://web/eslint.config.js)
</cite>

## 人话总览

GitHub Actions 两个流水线：ci.yml（代码质量 + 单测 + 构建）与 e2e.yml（Playwright 端到端）。多包结构：server（Fastify + TS + tsx）、web（Vue 3 + Vite）、e2e（Playwright）。容器化由 Dockerfile + docker-compose.yml + entrypoint.sh 承担。

## CI 工作流（ci.yml，当前代码现状）

- 触发：push/PR 到 master/main。
- 并行：server 与 web 两个 job。
- server job：npm ci → npx eslint . → npx oxlint src tests → npm run typecheck → npm test。
- web job：npm ci → npx eslint . → npx vitest run → npm run build → npm run check:i18n。
- 缓存：actions/setup-node npm cache 分别指向 server/package-lock.json 与 web/package-lock.json。

## E2E 工作流（e2e.yml，当前代码现状）

- globalSetup（e2e/global-setup.js）：清理旧数据 → 构建前端（如缺失）→ 初始化并种子数据库（e2e/test.db）→ 注入 TOTP 密钥 → 启动服务端口 3999 → 轮询 /api/health → 预登录获取 token 写入 e2e/.tokens.json。
- 运行：playwright test，workers=1、fullyParallel=false。
- globalTeardown：清理进程/DB/上传目录/token 文件。
- 报告：失败时上传 playwright-report（保留 7 天）；retries=1、trace:on-first-retry。

## 测试配置（当前代码现状）

- 后端 Vitest：内存数据库、UPLOAD_DIR 临时目录隔离、fileParallelism=false 串行。
- 前端 Vitest：happy-dom、setupFiles src/test-setup.js。
- Playwright：单 worker、baseURL http://localhost:3999、失败截图 + trace。

## 镜像构建与部署（当前代码现状）

- 多阶段构建：Stage 1 node:22-slim 构建前端（ARG VITE_SENTRY_DSN）；Stage 2 仅 production 依赖 + 后端源码 + 前端 dist。
- 安全加固：USER node、npm 工具链升级、chown 数据卷目录。
- ENTRYPOINT：entrypoint.sh → cd /app/server && npx tsx src/index.ts（TS 迁移后入口）。
- compose：web expose 3000（ports 已注释，v0.42 拍板仅走 Caddy）+ 健康检查；caddy 80/443 反代 + encode zstd gzip 压缩（环境批 B1）。

## 故障排查指南

- E2E 失败：服务未就绪（健康检查轮询/端口 3999）；依赖缺失（npm ci + playwright 浏览器）；数据库状态（e2e/test.db 初始化与种子）；TOTP 预登录（动态口令计算与 /api/auth/verify 响应）。
- 查看 GitHub Actions 日志与 playwright-report。

## 附录：关键路径

- CI：.github/workflows/ci.yml；E2E：.github/workflows/e2e.yml
- Playwright：playwright.config.js；后端单测：server/vitest.config.js；前端单测：web/vitest.config.js
- ESLint：server/eslint.config.js / web/eslint.config.js
- 容器：Dockerfile / docker-compose.yml / entrypoint.sh
