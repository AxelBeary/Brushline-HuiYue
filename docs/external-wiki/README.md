# repowiki 外部知识库归档

> 归档日期：2026-08-06 · 归档人：一号
> 来源：项目 wiki（`C:\Users\qly19\Desktop\repowiki\`，约 118 篇，原目录保留不删除）

## 为什么归档

整套 wiki（架构/API/数据库/前端/后端/故障排查），是**外部贡献**。已抽样核对 6 篇核心文档（报告见 `repowiki-核对报告-20260806.md`）：

- 🟢 4 篇正确（订单管理接口 35 端点仅缺 1 个、样式系统/错误处理/技术栈）
- 🔴 2 篇严重过时（**认证接口**——仍写旧用户名密码+JWT，实际是 TOTP+httpOnly cookie；**数据库模式设计**——price_tiers/orders 等核心表字段全错）

## 归档内容

| 文件 | 说明 |
|------|------|
| `repowiki-核对报告-20260806.md` | 6 篇核对结论 + 🔴7 项/🟡5 项/⚪6 项清单 + 建议 |
| `wiki-认证接口.md` | 已按 master 重写（2026-08-07，四号）：TOTP 动态口令登录 + httpOnly Cookie 会话 + 管理员绑定路由 |
| `wiki-数据库模式设计.md` | 已按 master 重写（2026-08-07，四号）：29 张表实际 DDL + 迁移 v1..v45 |
| `wiki-快速开始指南.md` | 已按 master 重写（2026-08-07，四号）：入口修正 index.ts / 种子命令 seed.ts / 删除 SIGN_SECRET 虚构项 / compose 端口现状 |
| `wiki-生产部署.md` | 已按 master 重写（2026-08-07，四号）：SIGN_SECRET→SESSION_SECRET / 端口映射现状与生产切换步骤 / Caddyfile 单主域（无泛解析） |
| `wiki-环境配置管理.md` | 已按 master 重写（2026-08-07，四号）：纯 SQLite（无 PG/MySQL）/ 虚构变量对照表 / SENTRY_DSN_BACKEND 命名 |
| `repowiki-重写批交付.md` | 重写批交付报告（`docs/comms/04-to-01-repowiki-P0重写-交付-20260807.md`，2026-08-07） |
| `wiki-画师管理接口.md` | 已按 master 修订（2026-08-07，四号）：server/src/*.js→*.ts（TS 迁移）、登录端点对齐 TOTP |
| `wiki-会话管理.md` | 已按 master 修订（2026-08-07，四号）：删「刷新接口」表述——会话无刷新，仅文件签名刷新 useSignatureRefresh |
| `wiki-认证协议.md` | 已按 master 修订（2026-08-07，四号）：唯一登录端点 POST /api/auth/verify，删 verify-totp/自动续期 |
| `wiki-认证授权系统.md` | 已按 master 修订（2026-08-07，四号）：登录页仅 QQ 号 + TOTP，无用户名/密码 |
| `wiki-安全架构.md` | 已按 master 修订（2026-08-07，四号）：删 JWT 表述（HMAC 签名会话），app.js→app.ts |
| `wiki-错误码参考.md` | 已按 master 修订（2026-08-07，四号）：删「刷新 Token」字样，app.js→app.ts |
| `wiki-监控告警系统.md` | 已按 master 修订（2026-08-07，四号）：app.js→app.ts（5 处 cite） |
| `wiki-数据迁移管理.md` | 已按 master 修订（2026-08-07，四号）：connection.js→connection.ts，迁移版本补 v44/v45 |
| `wiki-数据访问模式.md` | 已按 master 修订（2026-08-07，四号）：connection/seed/app/index .js→.ts（init.js 保持） |
| `wiki-仪表盘与分析.md` | 已按 master 修订（2026-08-07，四号）：删 WebSocket 表述（全库零命中），补埋点看板章节 |
| `wiki-项目结构说明.md` | 已按 master 修订（2026-08-07，四号）：index/app/connection .js→.ts |
| `wiki-日志分析.md` | 已按 master 修订（2026-08-07，四号）：app.js→app.ts，SENTRY_DSN→SENTRY_DSN_BACKEND \|\| SENTRY_DSN |
| `wiki-环境变量与运行时配置系统.md` | 已按 master 修订（2026-08-07，四号）：删 BOT_*/LOGIN_CODE_* 虚构变量，.env.example 为权威清单 |
> 注：原「待重写」文件已 `git mv` 去掉后缀并整体重写，保留历史。


## 13 处修补批对照（2026-08-08 派工核实，四号）

> 08-07 c4f021d 已合入 master；08-08 派工逐条对照代码核实 13/13 通过（交付报告 `docs/comms/04-to-01-repowiki外部13处-交付-20260808.md`）。外部原文（`C:\Users\qly19\Desktop\repowiki\`）一字未动。

| # | 修订版文件（docs/external-wiki/） | 对应外部原路径 | 修订日期 |
|---|---|---|---|
| 1 | `wiki-画师管理接口.md` | `API 接口文档\画师管理接口.md` | 2026-08-08 |
| 2 | `wiki-会话管理.md` | `后端开发指南\认证授权系统\会话管理.md` | 2026-08-08 |
| 3 | `wiki-认证协议.md` | `架构设计\前后端通信协议\认证协议.md` | 2026-08-08 |
| 4 | `wiki-认证授权系统.md` | `项目概述\核心功能特性\认证授权系统.md` | 2026-08-08 |
| 5 | `wiki-安全架构.md` | `架构设计\安全架构.md` | 2026-08-08 |
| 6 | `wiki-错误码参考.md` | `故障排除\错误码参考.md` | 2026-08-08 |
| 7 | `wiki-监控告警系统.md` | `部署运维\监控告警系统.md` | 2026-08-08 |
| 8 | `wiki-数据迁移管理.md` | `数据库设计\数据迁移管理.md` | 2026-08-08 |
| 9 | `wiki-数据访问模式.md` | `数据库设计\数据访问模式.md` | 2026-08-08 |
| 10 | `wiki-仪表盘与分析.md` | `核心功能模块\仪表盘与分析.md` | 2026-08-08 |
| 11 | `wiki-项目结构说明.md` | `项目概述\项目结构说明.md` | 2026-08-08 |
| 12 | `wiki-日志分析.md` | `故障排除\日志分析.md` | 2026-08-08 |
| 13 | `wiki-环境变量与运行时配置系统.md` | `knowledge\zh\环境变量与运行时配置系统\环境变量与运行时配置系统.md` | 2026-08-08 |

## 处置建议

1. **不直接改 wiki 原文**——外部产物，改它不如在仓库内维护正确版本（已按此原则在仓库内重写正确版本）
2. **P0 已完成**：「认证接口」「数据库模式设计」及 P0 批「快速开始指南」「生产部署」「环境配置管理」共 5 篇已按当前 master 重写（TOTP 登录 / cookie 会话 / 29 张表实际 DDL / index.ts+seed.ts 入口 / 删虚构变量 / 纯 SQLite），交付报告见 `docs/comms/04-to-01-repowiki-P0重写-交付-20260807.md`
3. **P2 已完成**：外部 13 处 🟡（认证 6 + 非认证 7）已按路线 B 在仓库内维护修订版（13 篇 `wiki-*.md`），交付报告见 `docs/comms/04-to-01-repowiki外部13处-交付-20260808.md`
4. 若用户贡献者愿意，可把核对报告反馈给 ta 供修订

## P2 非认证主题抽样（2026-08-07 四号修订，见 docs/comms/04-to-01-repowiki非认证-交付-20260807.md）

| 文件 | 说明 |
|------|------|
| wiki-Docker容器化部署.md | 已按 master 修订：app/index .js→.ts（TS 迁移）、entrypoint 指向 src/index.ts、compose 3000 端口已注释（v0.42 拍板）、Caddyfile encode zstd gzip、SENTRY_DSN_BACKEND 命名 |
| wiki-构建与部署系统.md | 已按 master 修订：后端 100% TS（原文「TS/JS 混编」过时）、CI 门禁补齐（oxlint/typecheck/check:i18n） |
| wiki-CICD流水线.md | 已按 master 修订：server job 含 oxlint+typecheck、web job 含 check:i18n（原文漏） |
| wiki-容器编排.md | 已按 master 修订：app/connection .js→.ts、entrypoint src/index.ts、ports 3000 已注释、SENTRY_DSN→SENTRY_DSN_BACKEND |
| wiki-环境配置.md | 已按 master 修订：index/app/connection .js→.ts、entrypoint src/index.ts、SIGN_SECRET 虚构项标注（文件签名密钥实为 SESSION_SECRET） |
| wiki-性能监控与分析.md | 已按 master 修订：app.js→app.ts、CI 门禁补齐；Sentry 环境变量命名原文已正确 |
| wiki-常见问题解决.md | 已按 master 修订：connection/app/index .js→.ts；正文 TOTP/上传/订单描述与 master 吻合 |
| wiki-持续集成与部署.md | 已按 master 修订：CI 门禁补齐（oxlint/typecheck/check:i18n） |
