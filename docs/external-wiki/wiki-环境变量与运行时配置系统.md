---
name: 环境变量与运行时配置系统
category: configuration_system
scope:
    - '**'
source_files:
    - artist-commission/.env.example
    - artist-commission/.env
    - artist-commission/server/src/index.ts
    - artist-commission/server/src/app.ts
    - artist-commission/docker-compose.yml
    - artist-commission/Dockerfile
    - artist-commission/Caddyfile
    - artist-commission/entrypoint.sh

> 修订版（2026-08-07，四号）：本文件为外部 repowiki 原文 环境变量与运行时配置系统.md 的仓库内修订版（修补批 #13），按 master 代码逐条核实修正；外部原文（C:\Users\qly19\Desktop\repowiki\）一字未动。
> 修订范围：文件名引用 .js→.ts（TS 迁移）、登录/会话描述对齐 REQ-027 TOTP、删除虚构变量/端点、迁移版本补至 v45。
---

该项目的配置系统基于 **dotenv + 进程环境变量** 的轻量方案，通过 `.env` 文件注入、Docker Compose `env_file` 传递、以及构建期 ARG/ENV 注入三层机制完成。核心设计原则是“零框架依赖、全凭 `process.env`”，所有运行时开关均通过环境变量控制。

### 1. 配置文件与加载顺序
- **`.env.example`**：模板文件，列出全部可配项（必填/可选/部署模式/Sentry），作为 `.env` 的权威清单。
- **`.env`**：本地开发/生产实际配置，被 `.gitignore` 排除，不入库。
- **加载入口**：`server/src/index.ts` 首行 `import 'dotenv/config'` 自动加载 `.env`，随后所有模块通过 `process.env.XXX` 读取。
- **Docker 注入**：`docker-compose.yml` 通过 `env_file: - .env` 将宿主机 `.env` 注入容器；同时显式声明 `NODE_ENV=production`、`DB_PATH`、`UPLOAD_DIR`、`TRUST_PROXY`、`TZ` 等覆盖值。
- **构建期注入**：`Dockerfile` 使用 `ARG VITE_SENTRY_DSN` 在前端构建阶段注入 Sentry DSN，`docker-compose.yml` 的 `args.VITE_SENTRY_DSN: ${VITE_SENTRY_DSN:-}` 允许宿主变量覆盖。
- **Caddy 反向代理**：`Caddyfile` 通过 `{$DOMAIN}` 语法引用 `.env` 中的 `DOMAIN` 变量，由 compose 的 `env_file` 提供。

### 2. 关键环境变量分类
- **安全密钥类**：`SESSION_SECRET`（会话 HMAC 签名 + 文件访问签名 + Cookie 签名；**.env.example 注释仍写「JWT 签名」，实际无 JWT**）、`COOKIE_SECRET`（httpOnly Cookie 签名，回退到 `SESSION_SECRET`）
- **服务基础类**：`PORT`（默认 3000）、`DB_PATH`（SQLite 路径，默认 `./data/commission.db`）、`UPLOAD_DIR`（上传目录，默认 `./uploads`）
- **运行模式类**：`NODE_ENV`（production/development）、`AUTH_DEV_MODE`（TOTP 开发模式开关）、`TRUST_PROXY`（信任的反向代理网段，默认 Docker 私有网段）
- **安全策略类**：`CORS_ORIGIN`（多域名逗号分隔，留空=禁止跨域）、`SENTRY_DSN_BACKEND` / `VITE_SENTRY_DSN`（前后端错误上报，留空=完全禁用）
- **业务开关类**：`AUTH_DEV_MODE`（开发模式：TOTP 绑定接口返回密钥明文 `_dev_secret`，生产必须 false）
- **认证参数类**：无（旧验证码登录参数 `LOGIN_CODE_TTL`/`LOGIN_CODE_MAX_ATTEMPTS` 已随 v41 TOTP 迁移移除，全库零命中）

### 3. 架构与约定
- **无集中配置对象**：各模块直接读取 `process.env`，如 `app.ts` 中 `process.env.UPLOAD_DIR`、`process.env.CORS_ORIGIN`、`process.env.SENTRY_DSN_BACKEND` 等，避免引入额外配置库。
- **默认值内联**：所有环境变量均有合理的默认值（如 `PORT=3000`、`UPLOAD_DIR=./uploads`），保证最小化 `.env` 即可启动。
- **安全优先默认**：生产环境未设置 `CORS_ORIGIN` 时不注册 CORS 插件（same-origin 策略）；Sentry 未配置 DSN 时完全跳过初始化；500 错误不返回详细 message。
- **分层验证**：`index.ts` 启动时监听 `uncaughtException`/`unhandledRejection`，优雅关闭 SIGTERM/SIGINT 并超时强退；`app.ts` 在启动时执行孤儿文件回收、数据库初始化、静态目录创建等自检。
- **前端配置隔离**：`VITE_SENTRY_DSN` 通过构建期 ARG 注入，仅进入前端 bundle；后端 `SENTRY_DSN_BACKEND` 仅在 Node 侧生效。

### 4. 约束与规则
- **生产环境强制项**：`SESSION_SECRET`、`COOKIE_SECRET`、`ADMIN_QQ`（无管理员账号时 fail-fast 退出）必须设置（.env.example 头部「必填」区为准）。
- **`.env` 不进镜像**：`.dockerignore` 和 `.gitignore` 均排除 `.env`，通过 `env_file` 运行时注入，避免敏感信息泄露。
- **CORS 默认拒绝**：生产环境未设 `CORS_ORIGIN` 则不启用跨域，遵循最小权限原则。
- **Sentry 零开销**：DSN 为空或 `NODE_ENV=development` 时完全不初始化，不产生网络请求。
- **Trust Proxy 白名单**：默认仅信任 Docker 私有网段（172.16.0.0/12, 10.0.0.0/8, 192.168.0.0/16），防止伪造 X-Forwarded-For 绕过限流。
- **时区固定**：容器内统一设置 `TZ=Asia/Shanghai`，确保 SQLite CURRENT_TIMESTAMP 行为一致。

### 5. 相关工具链集成
- **Docker 健康检查**：`docker-compose.yml` 通过 `fetch('http://127.0.0.1:3000/api/health')` 探测服务就绪。
- **Caddy 反向代理**：自动 HTTPS + gzip/zstd 压缩，唯一入口转发至 web:3000。
- **entrypoint.sh**：非 root 用户运行，cd 到 `/app/server` 后以 `tsx` 启动，避免 npx 在线下载问题。

该系统以极简方式实现生产可用的配置管理，通过环境变量分层注入、严格默认值和安全优先策略，在无需配置框架的前提下满足多环境部署需求。