# 环境配置管理

> 本文按 `artist-commission` master 当前代码重写（2026-08-07，四号）。
> 外部原版「环境配置管理.md」存在 3 类系统性问题：①「生产环境：PostgreSQL 或 MySQL」「DATABASE_URL/DB_POOL_SIZE/DB_TIMEOUT_MS」——全库零命中，实际**纯 SQLite**（connection.ts 仅 SQLite/:memory:）；②「JWT_SECRET、RATE_LIMIT_WINDOW_MS、RATE_LIMIT_MAX_REQUESTS、LOG_LEVEL、STORAGE_PROVIDER/ACCESS_KEY/BUCKET/REGION」等——全为虚构变量，代码零命中；③「SENTRY_DSN」命名——正式变量为 `SENTRY_DSN_BACKEND`（CSP 处有 `||SENTRY_DSN` 兼容回退）。
> 重写依据：`docs/comms/04-to-01-repowiki非认证-交付-20260807.md` 🔴 1-3 项 + 对照 master 代码逐一实测（grep 全库验证）。

<cite>
**本文引用的文件**
- [.env.example](file://artist-commission/.env.example)（环境变量唯一权威清单）
- [server/src/db/connection.ts](file://artist-commission/server/src/db/connection.ts)（SQLite 连接与模式选择）
- [server/src/db/init.js](file://artist-commission/server/src/db/init.js)（建表 + 迁移 v1..v45）
- [server/src/db/seed.ts](file://artist-commission/server/src/db/seed.ts)（开发种子数据）
- [server/src/index.ts](file://artist-commission/server/src/index.ts)（启动入口）
- [server/src/app.ts](file://artist-commission/server/src/app.ts)（应用装配 / Sentry / CSP）
- [server/src/shared/file-sign.ts](file://artist-commission/server/src/shared/file-sign.ts)（文件签名，密钥 = SESSION_SECRET）
- [server/src/shared/middleware/rate-limit.ts](file://artist-commission/server/src/shared/middleware/rate-limit.ts)（per-IP 滑动日志限流）
- [server/src/features/admin/health.routes.ts](file://artist-commission/server/src/features/admin/health.routes.ts)（健康检查）
- [server/src/features/admin/health.service.ts](file://artist-commission/server/src/features/admin/health.service.ts)（8 项自检）
- [web/vite.config.js](file://artist-commission/web/vite.config.js)（前端代理）
- [web/src/main.js](file://artist-commission/web/src/main.js)（前端 Sentry 初始化）
- [Dockerfile](file://artist-commission/Dockerfile) / [docker-compose.yml](file://artist-commission/docker-compose.yml)
- [.github/workflows/ci.yml](file://artist-commission/.github/workflows/ci.yml) / [.github/workflows/e2e.yml](file://artist-commission/.github/workflows/e2e.yml)
- [server/vitest.config.js](file://artist-commission/server/vitest.config.js) / [playwright.config.js](file://artist-commission/playwright.config.js)
</cite>

## 目录
1. [人话总览](#人话总览)
2. [环境变量权威清单](#环境变量权威清单)
3. [数据库（纯 SQLite）](#数据库纯-sqlite)
4. [文件上传与存储](#文件上传与存储)
5. [Sentry 错误监控](#sentry-错误监控)
6. [速率限制](#速率限制)
7. [健康检查与平台能力](#健康检查与平台能力)
8. [构建与测试环境](#构建与测试环境)
9. [配置生效方式与常见问题](#配置生效方式与常见问题)

## 人话总览

**一句话**：这个项目的"配置管理"就是**一个 `.env` 文件 + 启动时读一次**。`.env.example` 是唯一权威清单，代码里读哪些变量、默认值是什么，全部以它为准。没有配置中心、没有热重载、没有多环境 .env.development/.env.production 拆分（compose 里用 `environment` 覆盖少量路径/时区项）。

**外部旧文档最大的问题**：写了一大堆**根本不存在的变量**（PostgreSQL 连接串、JWT_SECRET、RATE_LIMIT_*、云存储凭据、LOG_LEVEL 等）。照它填了也没用——代码不读。本文只列代码里真实存在的变量，并附"虚构变量对照表"。

## 环境变量权威清单

### 真实变量（全部经 grep 验证）

| 变量 | 必填 | 作用 | 默认值 / 说明 |
|------|------|------|---------------|
| `SESSION_SECRET` | 是 | 会话签名 + 文件访问签名（HMAC）+ Cookie 签名 | 无默认；生产缺失或过短 fail-fast |
| `COOKIE_SECRET` | 是 | httpOnly Cookie 签名验证 | 无默认；生产缺失 fail-fast |
| `ADMIN_QQ` | 生产是 | 首次部署自动创建管理员账号 | 生产缺失且无管理员 → 启动抛错退出 |
| `NODE_ENV` | 否 | `production`（默认）/ `development` | 决定 Sentry 是否上报、TOTP dev 密钥等 |
| `AUTH_DEV_MODE` | 否 | `true` 时 TOTP 绑定接口返回明文 `_dev_secret` | 默认 false；**生产必须 false** |
| `PORT` | 否 | 后端监听端口 | 默认 3000（index.ts `parseInt(process.env.PORT \|\| '3000')`） |
| `DB_PATH` | 否 | SQLite 文件路径 | 默认 `./data/commission.db`（容器内 compose 固定 `/app/data/commission.db`） |
| `UPLOAD_DIR` | 否 | 上传目录 | 默认 `./uploads`（容器内 `/app/uploads`） |
| `CORS_ORIGIN` | 否 | 跨域白名单（逗号分隔） | 留空 = 禁止跨域 |
| `DOMAIN` | 否 | Caddy 主域名 | Caddyfile `{$DOMAIN}` 使用 |
| `TRUST_PROXY` | 否 | 可信反代网段 | compose 内置 `172.16.0.0/12,10.0.0.0/8,192.168.0.0/16` |
| `TZ` | 否 | 容器时区 | compose 内置 `Asia/Shanghai` |
| `SENTRY_DSN_BACKEND` | 否 | 后端错误监控 DSN | 留空 = 禁用；`NODE_ENV=development` 自动跳过 |
| `VITE_SENTRY_DSN` | 否 | 前端错误监控 DSN（构建时注入） | Dockerfile 构建参数；留空 = 禁用 |
| `DOCKER` | 否 | Docker 环境标记 | 有值或 `/etc/.dockerenv` 存在 → SQLite 用 DELETE 模式 |

### 虚构变量对照表（外部旧文档写了，代码零命中，勿填）

| 虚构变量 | 真相 |
|----------|------|
| `SIGN_SECRET` | 不存在；文件访问签名密钥 = `SESSION_SECRET` |
| `JWT_SECRET` | 不存在（会话为 HMAC 签名 token，无 JWT 库）。仅 `/api/admin/health` 第 7 项的**显示名**叫 JWT_SECRET，实际检查的就是 `SESSION_SECRET` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | 不存在；限流参数在各调用处硬编码（见第 6 节） |
| `LOG_LEVEL` | 不存在；日志级别未开放为环境变量 |
| `DATABASE_URL` / `DB_POOL_SIZE` / `DB_TIMEOUT_MS` | 不存在；SQLite 单文件连接，无连接池/URL 概念 |
| `STORAGE_PROVIDER` / `ACCESS_KEY` / `SECRET_KEY` / `BUCKET` / `REGION` | 不存在；无云存储实现，只有本地文件系统 |
| `BOT_ENABLED` / `BOT_WS_URL` | 不存在（REQ-028 机器人备案未实施） |
| `LOGIN_CODE_TTL` / `LOGIN_CODE_MAX_ATTEMPTS` | 不存在（旧登录码方案已随 v41 TOTP 化移除） |

## 数据库（纯 SQLite）

- **引擎**：better-sqlite3 单文件数据库。**支持 SQLite 与 `:memory:`，不支持 PostgreSQL/MySQL**（`connection.ts` 唯一实现）。
- **路径**：`DB_PATH` 覆盖；默认 `./data/commission.db`；`:memory:` 模式跳过建目录。
- **连接参数**（代码硬编码）：`journal_mode` = Docker 环境（`DOCKER` / `KUBERNETES_SERVICE_HOST` / `/.dockerenv`）下 DELETE，本地 WAL；`foreign_keys = ON`；`busy_timeout = 5000`。
- **初始化与迁移**：`init.js` 的 `initDatabase()` 在应用装配时自动执行——建 29 张表（`IF NOT EXISTS` 幂等）→ 按 `MIGRATIONS` 数组升序应用未执行版本（最新 **v45**）→ 迁移前自动备份 `.bak.v<N>` → 迁移后建索引。`schema_migrations` 表记录已应用版本。
- **种子数据**：`seed.ts`（开发测试用）**不在启动流程中调用**，需手动执行 `npm run db:seed`（等价 `tsx src/db/seed.ts`）。种子数据不含管理员（管理员由 initDatabase 自举逻辑创建）。

## 文件上传与存储

- **存储**：本地文件系统（`UPLOAD_DIR`）。**无 OSS/S3/GCS 实现**，不要配置任何云存储变量。
- **目录结构**：按业务域组织（images/references/deliverables/notes 等）；回收站 `.recycle-bin` 配合 `gc-uploads.js` 定期清理孤儿文件。
- **访问控制**：`images/` 公开可 inline；`references/`、`deliverables/`、`notes/` 需签名 `?sig=`（TTL 15 分钟，HMAC-SHA256，密钥 = `SESSION_SECRET`，见 file-sign.ts）。路径先 decode 再校验，含 `..` 拒绝。
- **文件大小/类型**：由上传路由（@fastify/multipart）校验。

## Sentry 错误监控

- **后端**：变量名 **`SENTRY_DSN_BACKEND`**（.env.example 只列这个）。读取点：`app.ts:210`（`process.env.SENTRY_DSN_BACKEND`）；CSP 的 `connect-src` 动态拼接用 `SENTRY_DSN_BACKEND || SENTRY_DSN`（app.ts:145，向后兼容，但权威名是 BACKEND）。
- **行为**：DSN 空/不设 → 完全禁用、零网络请求；`NODE_ENV=development` → 跳过上报；`release` 取 package.json 版本；`tracesSampleRate: 0`（只捕获错误，不做性能追踪）。
- **前端**：`VITE_SENTRY_DSN`，Dockerfile 构建时注入，`web/src/main.js` 初始化。
- **开发环境验证**：设了 DSN 但 `NODE_ENV=development` 时不会上报（日志有提示）。

## 速率限制

- 实现：`rate-limit.ts` 共享滑动日志限流器，**per-IP**，纯内存（进程重启清零）。
- 参数：`maxHits` / `windowMs` 在**每个调用处硬编码**（例如管理员 transfer 接口 = IP 5 次/15 分钟 + 目标 QQ 3 次/15 分钟；TOTP 绑定/验证等公开接口各有阈值）。
- **没有环境变量控制限流**。要调阈值只能改代码，改后走正常发布流程。

## 健康检查与平台能力

- `/api/health`：容器健康探测（compose healthcheck 用），返回 `ok`。
- `/api/admin/health`：管理员自检 8 项——数据库连接 / 迁移版本 / 上传目录 / 磁盘空间 / 数据完整性 / 备份状态 / 密钥（显示名 JWT_SECRET，实际查 SESSION_SECRET）/ Node 环境；附诊断包下载 `/api/admin/health/download`。
- `platform.ts`：运行环境与能力探测工具（辅助诊断与降级策略）。

## 构建与测试环境

| 场景 | 配置 | 说明 |
|------|------|------|
| 前端开发 | `web/vite.config.js` | 端口 5173；`/api`、`/uploads` 代理到 `http://localhost:3000` |
| 前端生产 | Dockerfile 构建 `web/dist` | 由后端静态托管，同域部署（无 CORS） |
| 单元测试 | `server/vitest.config.js` | vitest；测试环境 `tests/setup.js` |
| E2E | `playwright.config.js` | Playwright；E2E 工作流含 TOTP 预登录、独立端口 3999、workers=1 |
| CI | `.github/workflows/ci.yml` | lint（eslint + oxlint）+ typecheck + 单元测试 |
| CI | `.github/workflows/e2e.yml` | E2E 全流程 |

## 配置生效方式与常见问题

- **生效方式**：环境变量在进程启动时读取（dotenv 加载 `.env`），**修改后需重启容器/进程**。本项目**没有配置中心、没有热重载**。
- **compose 注入**：`web` 用 `env_file: .env` 全量注入 + `environment` 固定覆盖路径/时区/TRUST_PROXY 等项。**`AUTH_DEV_MODE` 不要写进 compose environment**（注释明确：由 .env 控制，写了会被覆盖成固定值）。

| 现象 | 排查方向 |
|------|----------|
| 容器启动失败 | 看日志里 fail-fast 提示：SESSION_SECRET / COOKIE_SECRET / ADMIN_QQ 缺失 |
| 健康检查第 7 项 fail/warn | `SESSION_SECRET` 未设置或过短（≥32） |
| TOTP 绑定返回明文密钥 | `AUTH_DEV_MODE=true`（生产必须 false） |
| Sentry 无上报 | DSN 变量名应为 `SENTRY_DSN_BACKEND`；`NODE_ENV=development` 会跳过；CSP 是否拦截（connect-src 应含 ingest 域名） |
| 数据库报 WAL 相关错误 | Docker 环境应自动用 DELETE 模式；若手工指定了 WAL 且数据丢失，恢复 `.bak.v<N>` |
| 上传 403 | 敏感路径必须带有效 `sig`（15 分钟有效） |
| 填了云存储/限流变量没效果 | 那些变量不存在；存储只有本地文件系统，限流参数在代码里 |

---

*修订版维护于仓库内（docs/external-wiki/），外部原文（C:\Users\qly19\Desktop\repowiki\）未改动。*