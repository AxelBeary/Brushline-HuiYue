# 性能监控与分析
> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文「后端开发指南\性能优化策略\性能监控与分析.md」的仓库内修订版（P2 非认证抽样批 #6），按 master 代码逐条核实修正；外部原文一字未动。
> 修订范围：①server/src/app.js→app.ts（TS 迁移，.js 不存在）；②CI 门禁补齐（server job 含 oxlint + typecheck）；③正文 Sentry 环境变量命名已正确（SENTRY_DSN_BACKEND），health 8 项检查/限流描述保留原文正确部分。

<cite>
**本文引用的文件**
- [server/src/app.ts](file://server/src/app.ts)
- [server/package.json](file://server/package.json)
- [server/src/features/admin/health.routes.ts](file://server/src/features/admin/health.routes.ts)
- [server/src/features/admin/health.service.ts](file://server/src/features/admin/health.service.ts)
- [web/src/views/admin/HealthCheck.vue](file://web/src/views/admin/HealthCheck.vue)
- [.github/workflows/ci.yml](file://.github/workflows/ci.yml)
- [playwright.config.js](file://playwright.config.js)
- [server/src/shared/middleware/rate-limit.ts](file://server/src/shared/middleware/rate-limit.ts)
- [docs/archive/specs-done/plan-v021-engineering.md](file://docs/archive/specs-done/plan-v021-engineering.md)
</cite>

## 人话总览

仓库已具备：错误追踪（Sentry）+ 系统自检（/api/admin/health 八项检查 + 诊断包下载）+ 内存滑动窗口限流 + CI 测试门禁。未内置响应时间/吞吐量/内存/CPU 的指标采集与可视化（原文此判断仍成立）。

## 错误追踪（Sentry，当前代码现状）

- 初始化条件：SENTRY_DSN_BACKEND 非空且 NODE_ENV !== 'development'（app.ts:210-211；代码兼容裸 SENTRY_DSN，app.ts:145）。
- release 取 package.json 版本；sendDefaultPii=false；tracesSampleRate=0（仅错误，不采集性能）。
- 全局错误处理器在 5xx 时调用 Sentry.captureException（app.ts:240），其他错误返回结构化 { code, error, detail }。
- CSP connect-src 动态拼接 Sentry ingest 域名（app.ts:143-158，未配置则仅 'self'）。
- 前端：VITE_SENTRY_DSN 存在才初始化（web/src/main.js，零开销）。

## 系统自检与健康检查（当前代码现状）

- 路由：GET /api/admin/health（管理员鉴权）、GET /api/admin/health/download（诊断包）。
- 检查项 8 项：db、migration、uploads、disk、integrity、backup、secret、node（health.service.ts，与健康接口逐项吻合）。
- 诊断包 JSON：checks、env、generatedAt，不含敏感信息。
- 容器健康探针用 /api/health（简版状态 + 时间，app.ts 注册）。

## 限流与稳定性（当前代码现状）

- 内存滑动窗口限流器（rate-limit.ts）：Map 存每个 key 的时间戳数组，窗口内超阈值拒绝；定时清理过期桶、限制最大桶数量防内存膨胀。
- 已挂 27 处接口限流 + 登录 TOTP 锁定（5 次/15 分）+ verify 限流（10 次/5 分）。

## CI 与测试（当前代码现状）

- server job：npm ci → eslint → oxlint → typecheck → vitest。
- web job：npm ci → eslint → vitest → build → check:i18n。
- Playwright：独立端口（3999）与数据库，workers=1，失败截图 + trace（on-first-retry）。

## 性能考量（原文建议保留）

仓库未内置响应时间/吞吐量/内存/CPU 指标采集。建议（不侵入业务代码）：Fastify onRequest/onResponse 钩子或 OpenTelemetry；process.memoryUsage/performance.now；Prometheus + node_exporter 或 Grafana；autocannon/k6 压测脚本纳入 CI（可选）。如需性能追踪，可在生产开启 tracesSampleRate（注意隐私与成本）。

## 故障排查指南

- 错误上报未生效：确认 SENTRY_DSN_BACKEND 已配置且 NODE_ENV 不为 development；确认全局错误处理器在路由注册前设置。
- 健康检查失败：看 /api/admin/health/download 诊断包，逐项核对 status 与 detail。
- 限流拒请求：检查限流 key 粒度与阈值；观察清理定时器。
- CI 不稳定：确认 Node 22 与缓存依赖；调整 playwright 超时/重试。

## 附录：关键开关

- SENTRY_DSN_BACKEND：后端 Sentry DSN（留空/不设 = 完全禁用）。
- NODE_ENV：development 默认不上报。
- TRUST_PROXY：信任代理网段，防伪造 X-Forwarded-For。
- 健康检查 8 项：db/migration/uploads/disk/integrity/backup/secret/node。
