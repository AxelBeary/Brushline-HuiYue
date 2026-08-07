# CI/CD 流水线
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「架构设计\部署架构\CI_CD 流水线.md」的仓库内修订版（P2 非认证抽样批 #3），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①CI 门禁补齐——server job 实际为 eslint → oxlint → typecheck → vitest（原文漏 oxlint/typecheck），web job 实际为 eslint → vitest → build → check:i18n（原文漏 check:i18n）；②引用文件全部存在（vitest.config.js / playwright.config.js / global-setup.js 均为 .js 未 TS 化，仅后端源码 .ts 化）；③入口说明补 src/index.ts（TS 迁移）。

<cite>
**本文引用的文件**
- [ci.yml](file://.github/workflows/ci.yml)
- [e2e.yml](file://.github/workflows/e2e.yml)
- [Dockerfile](file://Dockerfile)
- [docker-compose.yml](file://docker-compose.yml)
- [entrypoint.sh](file://entrypoint.sh)
- [package.json](file://package.json)
- [web/package.json](file://web/package.json)
- [server/package.json](file://server/package.json)
- [web/vitest.config.js](file://web/vitest.config.js)
- [server/vitest.config.js](file://server/vitest.config.js)
- [playwright.config.js](file://playwright.config.js)
- [e2e/global-setup.js](file://e2e/global-setup.js)
- [e2e/global-teardown.js](file://e2e/global-teardown.js)
</cite>

## 人话总览

GitHub Actions 两个流水线：ci.yml（代码质量 + 单测 + 构建）与 e2e.yml（Playwright 端到端）。触发条件均为 push/PR 到 master/main。容器化部署由 Dockerfile + docker-compose.yml + entrypoint.sh 承担（详见「wiki-Docker容器化部署.md」修订版）。

## CI 流水线（ci.yml，当前代码现状）

- **server job**（working-directory: server）：
  1. 
pm ci（actions/setup-node v6，Node 22，npm 缓存指向 server/package-lock.json）
  2. 
px eslint .
  3. 
px oxlint src tests（TS 迁移后新增门禁）
  4. 
pm run typecheck（tsc --noEmit，strict 全开）
  5. 
pm test（vitest run）
- **web job**（working-directory: web）：
  1. 
pm ci
  2. 
px eslint .
  3. 
px vitest run（清扫批#4：web 单测进 CI，此前 224 用例仅本地验证）
  4. 
pm run build
  5. 
pm run check:i18n（源头防屎门禁：硬编码中文增量拦截）

## E2E 流水线（e2e.yml，当前代码现状）

- 触发同 CI；独立 job。
- 安装根依赖（@playwright/test）→ 预装 web/server 依赖 → 
px playwright install chromium --with-deps。
- globalSetup（e2e/global-setup.js）：清理旧数据 → 构建前端（如缺失）→ 初始化并种子数据库（e2e/test.db）→ 注入 TOTP 密钥 → 启动服务端口 3999 → 轮询 /api/health → 预登录获取 token 写入 e2e/.tokens.json。
- 运行用例：workers=1、fullyParallel=false，避免共享状态冲突。
- globalTeardown：优雅停止服务器、清理测试 DB/上传目录/token 文件。
- 失败时上传 playwright-report（保留 7 天）；retries=1、trace:on-first-retry。

## 镜像构建与部署（Docker）

- 多阶段构建：Stage 1 node:22-slim 构建前端（ARG VITE_SENTRY_DSN 注入）；Stage 2 仅安装 production 依赖，复制后端源码（含 .ts）与前端 dist。
- 安全加固：非 root 用户（USER node）、npm 工具链升级、chown 数据卷目录。
- ENTRYPOINT 指向 entrypoint.sh，实际 cd /app/server && npx tsx src/index.ts。
- compose：web 服务 expose 3000（ports 已注释，v0.42 拍板仅走 Caddy）+ 数据卷 + 健康检查；caddy 反向代理 80/443，依赖 web 健康状态。

## 测试配置（当前代码现状）

- 前端 Vitest：happy-dom、include src/**/__tests__/**/*.test.js、setupFiles src/test-setup.js。
- 后端 Vitest：node 环境、内存数据库（:memory:）、fileParallelism=false 串行、UPLOAD_DIR 隔离临时目录。
- Playwright：workers=1、baseURL http://localhost:3999、globalSetup/Teardown 全生命周期管理。

## 故障排查指南

- CI 失败：看 ESLint/oxlint 输出、Vitest 日志、typecheck 错误（TS 门禁）。
- E2E 失败：查看 playwright-report 与失败截图；确认 globalSetup 是否成功（构建前端/种子 DB/启服/健康检查/TOTP 预登录）；检查端口 3999 占用。
- 容器化问题：检查 Docker 构建日志；验证 entrypoint.sh 正确 cd 到 server 并 tsx 启动 src/index.ts；确认数据卷权限（node:node）。
