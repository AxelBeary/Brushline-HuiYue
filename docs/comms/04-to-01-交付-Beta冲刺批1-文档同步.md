# 交付：四号 · Beta 冲刺批 1 —— 文档同步更新

> 派工：`docs/comms/01-to-04-Beta冲刺批1-文档同步.md`
> 分支：`docs/beta-sync`（worktree `../artist-commission-w4`）
> 交付日期：2026-08-06
> 提交：`docs: 维护说明书/开发自参考同步AGPL+TOTP+Beta阶段`（本次 commit）

---

## 一、改动总览（2 文件，+91/-55）

| 文件 | 改动数 | 内容 |
|------|--------|------|
| `docs/维护说明书.md` | 8 处 | 登录方式 TOTP、环境变量表清理、QQ Bot 推迟、AUTH_DEV_MODE 关闭、端口暴露更新 |
| `docs/开发自参考.md` | 14 处 | 测试基线、迁移 v23~v43、认证方案重写、速率限制、用例覆盖表、数据库表更新 |

**未动**：根 `README.md`（已在 `c48cb0e` 重写为 AGPL + 925/215 + TOTP，本次核对无过时段落）、`docs/comms/STATUS.md`（只读）、代码、REQ 文档、soul 文档。

---

## 二、文档过时核对清单

> 依据：master `df26d7d` + 源码实测（`server/src/db/init.js` 迁移数组、`server/tests` 目录、`.env.example`、`LICENSE`、`THIRD-PARTY-NOTICES.md`、`docker-compose.yml`）。

### 维护说明书.md

| # | 位置 | 原文（过时） | 改后（现状） | 依据 |
|---|------|-------------|-------------|------|
| 1 | 头部日期 | 最后更新：2026-07-29（v0.11） | 2026-08-06（Beta 冲刺阶段） | STATUS v10 |
| 2 | §二 添加第一个画师 | 用 ADMIN_QQ 对应的账号登录 | 用 QQ 号 + 验证器 App 动态码登录（TOTP） | REQ-027 已合入 `ac44a79` |
| 3 | §六 环境变量表 | LOGIN_CODE_TTL / LOGIN_CODE_MAX_ATTEMPTS 两行 | **删除**（登录码机制已随迁移 v41 DROP login_codes 表） | `init.js:1633-1652`、`.env.example` 无此变量 |
| 4 | §六 环境变量表 | BOT_ENABLED / BOT_WS_URL 两行 | **删除**（QQ Bot 推迟 REQ-028，变量已从 .env.example 移除） | `.env.example`、REQ-028 备案 |
| 5 | §六 环境变量表 | AUTH_DEV_MODE「开发模式登录码返回」 | 「开发模式 TOTP 绑定接口附密钥明文 `_dev_secret`」 | `auth.service.ts:37-45` |
| 6 | §六 环境变量表 | （缺） | **补** SENTRY_DSN_BACKEND 行 | `.env.example` 有 Sentry DSN 变量 |
| 7 | §七 QQ Bot 配置 | 「Phase 2」整节含"发送登录码给画师/QQ 指令控制后台" | 「已推迟，REQ-028 备案」，仅保留纯通知类规划 | 2026-08-05 用户拍板 + REQ-028 |
| 8 | §八 AUTH_DEV_MODE 关闭时机 | 「关闭时机=A 测启动」 | 「当前生产容器已设为 false，2026-08-06 重建上线时关闭」 | STATUS v10 容器重建记录 |
| 9 | §十 安全 5 | 开发模式验证码通过 AUTH_DEV_MODE 开启 | REQ-027 语义：bind-init 附 `_dev_secret` 明文 | `auth.service.ts:37-45` |
| 10 | §十 安全 6 | 容器端口仅 expose 不映射宿主机 | compose 默认映射 3000:3000（B3 用户拍板直连+frp），生产公开部署注释 ports | `docker-compose.yml:18-19`、STATUS 环境批 |

### 开发自参考.md

| # | 位置 | 原文（过时） | 改后（现状） | 依据 |
|---|------|-------------|-------------|------|
| 1 | 一句话描述 | 画师通过后台或 QQ Bot 管理排期 | 后台管理排期（登录走 TOTP），QQ Bot 已推迟 REQ-028 | REQ-027/028 |
| 2 | 技术栈·测试 | 后端 454/26 + 前端 87/5 = 541/31 | 后端 925/58 + 前端 215/13 = 1140/71 | `server/tests` 实测 58 文件 + README 925/215 |
| 3 | 技术栈·QQ Bot | Phase 2 | 已推迟为 REQ-028 通知渠道备案，当前未启用 | REQ-028 |
| 4 | 目录结构 tests/ | 454 用例，26 文件 | 925 用例，58 文件 + 补充新测试文件代表性列举 | `server/tests` 实测 |
| 5 | 目录结构 init.js | 版本化迁移（v1~v22） | v1~v43 | `init.js:460-1745` 迁移数组 |
| 6 | 核心设计 4 认证方案 | 整节登录码（6 位数字登录码/QQ Bot 发送） | TOTP 动态口令（RFC 6238、防爆破 5 次锁 15 分钟、AUTH_DEV_MODE 语义、totp:rebind 重绑） | `auth.service.ts` + `totp.ts` |
| 7 | 核心设计 9 速率限制 | 登录码发送/验证：5次/分钟 | TOTP 登录验证：10次/5分钟（+账号级防爆破） | `auth.routes.ts` 实测 |
| 8 | 数据库表 | schema_migrations v1~v22 | v1~v43 + 注：addon_tiers/price_addons 已随 v43 清退 | `init.js:1714-1744` |
| 9 | 迁移版本速查 | 仅 v1~v22 | **补 v23~v43 共 21 行**（每行以 init.js 迁移 name + 源码注释核对） | `init.js` 迁移数组逐条核对 |
| 10 | 测试·用例覆盖 | 541 个 / 后端 454/26 / 前端 87/5 | 1140 个 / 后端 925/58 / 前端 215/13，表格补齐画风档位/发布封面/安全/迁移等新模块 | `server/tests` + `web/src` 实测 |
| 11 | 注意事项 30 | 登录码验证 timingSafeEqual | 登录码机制已移除，TOTP 验证同样 timingSafeEqual | `totp.ts` |
| 12 | 注意事项 73 | 登录码表「已随 v0.37/REQ-027 移除」 | 「已随迁移 v41/REQ-027 移除」 | `init.js:1652` DROP login_codes |

### 核对过的文档（无需改动）

| 文档 | 结论 |
|------|------|
| 根 `README.md` | ✅ 已最新（c48cb0e 重写：AGPL + 925/215 + TOTP + Brushline-HuiYue 命名），无过时段落 |
| `docs/comms/STATUS.md` | 只读，未动（一号维护） |
| `docs/开发→生产切换指南.md` | ✅ 已同步 TOTP + QQ Bot 推迟（v0.37/REQ-027 段已在） |
| `docs/画师使用说明书.md` | ✅ 已同步（L18 已写 TOTP 登录） |
| `docs/A测执行手册.md` | ✅ 已同步（TOTP 步骤） |
| `docs/CONTEXT.md` | ✅ 已同步（dev mode 术语已是 TOTP 语义） |
| `docs/待修复问题清单.md` | ✅ 登录码相关项已标「已随 v0.37/REQ-027 移除」 |
| `docs/画师后台设计书-完整版.md` | ⚠️ L294 仍写「QQ 号 + 验证码（开发模式显示验证码）」。该文件为历史设计书（非维护文档），本次未动，**建议一号判断是否属于过时设计需更新** |

---

## 三、验证情况

- ✅ merge master 成功（fast-forward `2362ec9` → `df26d7d`）
- ✅ 所有事实改动均以源码/文件实测为依据（init.js 迁移数组、tests 目录计数、.env.example、docker-compose.yml、LICENSE）
- ✅ 纯文档改动，零代码改动；`git status` 仅 2 个授权文件
- ⏳ 未跑测试（纯文档批，无代码变更）；如需照常跑基线请一号在合入前执行（server 925 + web 215）

## 四、待确认

1. **画师后台设计书-完整版.md L294** 登录方式描述过时（见上表），是否要动？本批未改，等一号裁决。
2. **docs/README.md 不存在**：派工文件写 `docs/README.md`，仓库实际 README 在根目录（已核对最新），未另建 docs/README.md。若需要 docs 索引页可另派。

---

*四号 2026-08-06*
