# 认证接口

> 本文按 `artist-commission` master 当前代码重写（2026-08-07，四号）。
> 原「用户名/密码 + JWT」描述已废弃——当前是 **QQ 号 + TOTP 动态口令登录 + httpOnly Cookie 会话**（REQ-027）。
> 重写依据：`repowiki-核对报告-20260806.md` 🔴 1-3 项过时点。

<cite>
**本文引用的文件**
- [server/src/features/auth/auth.routes.ts](file://server/src/features/auth/auth.routes.ts)（认证路由，3 个端点）
- [server/src/features/auth/auth.service.ts](file://server/src/features/auth/auth.service.ts)（登录校验/防爆破/会话 Token）
- [server/src/features/auth/totp.ts](file://server/src/features/auth/totp.ts)（TOTP 纯函数实现）
- [server/src/shared/middleware/auth.ts](file://server/src/shared/middleware/auth.ts)（鉴权中间件）
- [server/src/features/admin/admin.routes.ts](file://server/src/features/admin/admin.routes.ts)（管理员 TOTP 绑定路由）
- [server/src/app.ts](file://server/src/app.ts)（应用入口，注册全局错误处理）
- [server/src/db/init.js](file://server/src/db/init.js)（管理员自举逻辑）
- [server/src/db/seed.ts](file://server/src/db/seed.ts)（种子数据：admin_qq 默认 10003）
- [server/scripts/totp-rebind.ts](file://server/scripts/totp-rebind.ts)（管理员 TOTP 丢失自救 CLI）
- [server/tests/auth-token.test.js](file://server/tests/auth-token.test.js)
- [server/tests/auth.service.test.js](file://server/tests/auth.service.test.js)
- [server/tests/totp-login.test.js](file://server/tests/totp-login.test.js)
- [server/tests/totp.test.js](file://server/tests/totp.test.js)
</cite>

## 目录
1. [人话总览](#人话总览)
2. [三个登录相关端点](#三个登录相关端点)
3. [会话机制（Cookie，不是 JWT）](#会话机制cookie不是-jwt)
4. [TOTP 动态口令原理](#totp-动态口令原理)
5. [TOTP 绑定与管理（管理员路由）](#totp-绑定与管理管理员路由)
6. [防爆破与失败锁定](#防爆破与失败锁定)
7. [开发模式开关 AUTH_DEV_MODE](#开发模式开关-auth_dev_mode)
8. [管理员账号 bootstrap 与更换](#管理员账号-bootstrap-与更换)
9. [管理员 TOTP 丢失自救（CLI）](#管理员-totp-丢失自救cli)
10. [鉴权中间件与错误码](#鉴权中间件与错误码)
11. [客户端对接要点](#客户端对接要点)
12. [测试覆盖](#测试覆盖)
13. [附录：端点速查](#附录端点速查)

## 人话总览

**一句话**：画师/管理员不再用「账号密码」登录，而是用自己的 **QQ 号 + 手机上验证器 App（如 Google Authenticator、Microsoft Authenticator）里每 30 秒变化的 6 位数字** 登录。登录成功后浏览器里种下一个 **httpOnly Cookie**（`artist_token`），之后所有请求都靠这个 Cookie 识别身份。

**为什么这样改**（需求 REQ-027）：旧机制靠短信/邮箱发登录码，有消息通道依赖和延迟；TOTP 动态口令是行业标准（RFC 6238），全程无消息通道，安全等级高。

**三个关键事实**（与旧文档完全不同）：
1. **没有**「用户名/密码登录 POST /api/auth/login」——该端点不存在。
2. **没有** JWT Bearer 令牌 + 刷新令牌 + 登出黑名单——会话是 httpOnly Cookie，登出靠递增 `token_version` 让旧令牌全部失效。
3. **没有**「客户端自助绑定 TOTP」——TOTP 绑定/确认/重置全部是**管理员路由**（需要管理员登录）。

## 三个登录相关端点

认证路由（`auth.routes.ts`）只有 3 个端点：**登录 / 当前用户 / 登出**。

### POST /api/auth/verify —— 登录（唯一登录方式）

QQ 号 + TOTP 动态口令登录，这是**唯一**登录端点。

**请求体**（JSON）：

| 字段 | 必填 | 规则 |
|------|------|------|
| `qqNumber` | 是 | 5-15 位纯数字，画师的 QQ 号 |
| `code` | 是 | 6 位纯数字，验证器 App 当前显示的动态口令 |

**限流**：同一 IP 10 次 / 5 分钟，超限返回 429。

**成功响应（200）**：登录成功，服务端设置 httpOnly Cookie `artist_token`（7 天），响应体：

```json
{
  "isAdmin": true,
  "artist": {
    "id": 1,
    "name": "画师名",
    "subdomain": "subdomain",
    "qqNumber": "10003"
  }
}
```

- `isAdmin`：当前 QQ 号是否为管理员（等于 `platform_config.admin_qq`）。
- 前端**不拿 token 存 localStorage**——身份在 Cookie 里，JS 读不到（安全设计，防 XSS 窃取）。

**失败响应（401）**：统一 `{ code, error, detail? }` 结构：

| code | 含义 | 说明 |
|------|------|------|
| `TOTP_INVALID` | QQ 号或动态口令错误 | 故意不区分「QQ 号不存在」与「口令错」，防止探测注册状态 |
| `TOTP_NOT_BOUND` | 尚未绑定动态口令 | 该画师还没绑定，需管理员绑定后才能登录 |
| `TOTP_LOCKED` | 已临时锁定 | 连续错 5 次后锁定 15 分钟；`detail.remainingLockMs` 是剩余毫秒数 |

### GET /api/auth/me —— 当前登录用户

需要已登录（Cookie 或 Bearer）。返回当前画师公开信息 + `isAdmin` 标记：

```json
{
  "id": 1,
  "name": "画师名",
  "subdomain": "subdomain",
  "qqNumber": "10003",
  "status": "open",
  "...": "其他公开字段（敏感列如 totp_secret 已剔除）",
  "isAdmin": true
}
```

前端刷新页面时以此接口为准恢复登录态。

### POST /api/auth/logout —— 登出

需要已登录。**真正的登出**：服务端递增该画师的 `token_version`，使当前及所有旧 Cookie/令牌立即失效，然后清掉 `artist_token` Cookie。不是黑名单机制——旧令牌不是被记录为黑名单，而是因为版本号对不上直接被拒。

## 会话机制（Cookie，不是 JWT）

### 会话载体：httpOnly Cookie

- 名称：`artist_token`
- 有效期：7 天
- 属性：`httpOnly`（JS 不可读）、`sameSite=lax`、生产环境 `secure`（仅 HTTPS 传输）
- 读取优先级：**Cookie 优先**；`Authorization: Bearer <token>` 仅作测试/旧客户端兜底（`extractToken` 逻辑）

### 令牌本身：HMAC 签名（无状态）

令牌格式：`payload.sig`，payload 是 Base64URL 编码的 `{ id, t, v }`：

- `id`：画师 id
- `t`：签发时间（7 天 TTL 判断依据）
- `v`：token_version（服务端主动失效手段）

签名用 `SESSION_SECRET`（HMAC-SHA256，`timingSafeEqual` 防时序攻击）。**生产环境必须设置 `SESSION_SECRET` 环境变量**，否则启动即崩溃；开发环境未设置时每次启动生成随机密钥（意味着开发重启后旧会话失效）。

### 主动失效：token_version

登出（`/api/auth/logout`）时递增 `artists.token_version`。中间件校验时若会话里的 `v` ≠ 数据库当前 `token_version`，返回 `TOKEN_REVOKED`。这一个字段实现了「踢下线」「登出全部设备」能力。

## TOTP 动态口令原理

`totp.ts` 是零依赖纯函数实现（Node 内置 crypto），遵循 RFC 6238 / RFC 4226 / RFC 4648：

| 参数 | 值 | 人话 |
|------|-----|------|
| 时间步长 | 30 秒 | 验证器里数字每 30 秒变一次 |
| 码位数 | 6 位 | 标准动态口令长度 |
| 算法 | HMAC-SHA1 | RFC 6238 默认算法 |
| 校验窗口 | ±1 个时间步 | 容忍手机时钟前后漂移约 30 秒 |
| 密钥 | 20 字节随机 → Base32 编码 32 字符 | 绑定后画师手机与服务器共享这个密钥 |

生成 `otpauth://` URI 供验证器扫码（issuer 为「绘约」）：

```
otpauth://totp/绘约:<QQ号>?secret=<密钥>&issuer=绘约&algorithm=SHA1&digits=6&period=30
```

## TOTP 绑定与管理（管理员路由）

**绑定流程由管理员操作**（需要管理员登录，`requireAdmin`），画师本人不能自助绑定——这是安全设计：绑定涉及身份确认，由管理员当面/线下完成。

三个端点（都在 `admin.routes.ts`）：

### 1. POST /api/admin/artists/:id/totp/bind-init —— 绑定第一步：生成二维码

- 管理员为指定画师生成 TOTP 密钥 + `otpauth` 二维码（data URL，220px），**密钥立即入库但标记未验证**（`totp_verified=0`）。
- 返回 `{ secret?, otpauthUri, qrDataUrl }`。
- **重复调用 = 覆盖旧密钥**，画师手机上旧绑定立即失效（须重新扫码）。
- 开发模式（`AUTH_DEV_MODE=true`）额外返回 `_dev_secret` 密钥明文，方便开发/测试/演示时手动录入验证器。

### 2. POST /api/admin/artists/:id/totp/bind-confirm —— 绑定第二步：确认

- 管理员输入画师报来的 6 位动态码，服务端用刚才的密钥校验。
- 校验通过 → `totp_verified=1`，绑定完成，画师从此可以登录。
- 失败 → 400 `TOTP_BIND_INVALID`「动态口令错误，请让画师确认验证器上当前显示的 6 位码」。
- 绑定失败**不计数不锁定**（只有管理员能调，管理员身份本身可信）。

### 3. POST /api/admin/artists/:id/totp/reset —— 重置绑定

- 管理员重置指定画师的绑定：清空 `totp_secret`、`totp_verified=0`，**旧密钥立即失效**，画师须重新绑定才能登录。
- 适用于：画师换手机、验证器丢失、怀疑泄露等场景。

## 防爆破与失败锁定

`auth.service.ts` 里两个常量：

```js
TOTP_MAX_ATTEMPTS = 5        // 连续错误 5 次
TOTP_LOCK_DURATION_MS = 15分钟 // 锁定 15 分钟
```

规则（`verifyTotpLogin`）：

- **锁定期间任何尝试都拒绝**——包括正确的动态码（防止攻击者拿正确码撞锁）。
- 达到阈值后返回 `TOTP_LOCKED`，`detail.remainingLockMs` 告诉前端还剩多久。
- 登录成功清零失败计数。
- **未注册的 QQ 号返回与「口令错误」完全相同的响应**（`QQ号或动态口令错误`），不暴露该 QQ 是否注册过（防枚举）。

## 开发模式开关 AUTH_DEV_MODE

- 语义：**显式**设置 `AUTH_DEV_MODE=true` 才开启开发模式（不再靠 `NODE_ENV` 推断）。
- 作用：`bind-init` 响应附带 TOTP 密钥明文（`_dev_secret`），方便开发/测试/演示时把密钥手动录入验证器 App。
- **安全红线**：`AUTH_DEV_MODE=true` 且 `NODE_ENV=production` → **启动即抛错**（fail-fast）。原因：开发模式会让密钥明文随接口响应暴露，等于 2FA 可被绕过，靠「约定生产必须配 false」不够，误配即高危。

## 管理员账号 bootstrap 与更换

### 首次部署自动创建管理员（init.js 自举）

- 数据库初始化时在 `platform_config` 写入 `admin_qq` 默认空值。
- 若设置了 `ADMIN_QQ` 环境变量：把它写入 `platform_config.admin_qq`（仅当当前值为空时写入，不覆盖运行时更换的值），并确保该 QQ 的画师账号存在。
- **生产 fail-fast**：`NODE_ENV=production` 且既没有 `ADMIN_QQ` 环境变量、`platform_config.admin_qq` 又为空或对应画师不存在 → **启动即抛错**，不静默死锁到登录时才暴露（TOTP 上线后无管理员 = 无人能绑定/登录）。
- 种子数据（`seed.ts`）：`INSERT OR REPLACE` 确保 `admin_qq='10003'`（开发默认管理员 QQ）。

### 更换管理员：POST /api/admin/transfer

- 需要**连续两次 TOTP 动态口令验证**：先验证当前管理员的动态码（证明你是管理员），再验证新管理员的动态码（证明对方接受且已绑定）。
- 双方都须已绑定 TOTP；任一步失败全部回滚，失败计数不被事务回滚（防爆破依然生效）。
- 这是「更换管理员」的正式途径（旧登录码机制已废止）。

## 管理员 TOTP 丢失自救（CLI）

**场景**：管理员自己手机丢失 / 验证器 App 删除 / 换手机，登不进后台——而后台重置入口本身要登录才能用（死锁）；或新部署管理员从未绑定。

**解决**：服务器本机执行（`server/` 目录下）：

```bash
npm run totp:rebind -- <QQ号>
# 例：npm run totp:rebind -- 10003
```

一步完成「重置旧绑定 + 生成新绑定」：

1. 新密钥直接入库并标记已绑定（`totp_verified=1`）；
2. 输出 `otpauth` URI + 密钥明文 + 二维码 PNG（保存到 `temp/totp-rebind-<QQ号>.png`）；
3. 尽力而为的端到端验证：若服务在 `localhost:3000` 运行，自动用新密钥算一个动态码调用登录接口验证可用。

**安全边界**：只有能物理操作服务器的人可用（不经网络、不开端口）；执行后旧密钥立即失效，旧验证器上的动态码全部作废。

## 鉴权中间件与错误码

`shared/middleware/auth.ts` 提供两个守卫：

- `requireAuth`：画师登录校验。
- `requireAdmin`：管理员权限校验（在 `requireAuth` 基础上加「QQ 号 = 管理员 QQ」判断）。

校验顺序：取 token（Cookie 优先）→ 验签/过期 → 查画师 → 软删检查 → token_version 比对 → （管理员）管理员判定。

| 错误码 | HTTP | 含义 |
|--------|------|------|
| `NOT_LOGGED_IN` | 401 | 没有令牌（未登录） |
| `SESSION_EXPIRED` | 401 | 令牌无效/过期 |
| `ACCOUNT_NOT_FOUND` | 401 | 画师账号不存在 |
| `ACCOUNT_DISABLED` | 401 | 账号已停用（软删） |
| `TOKEN_REVOKED` | 401 | 登录状态已失效（token_version 不匹配，如已登出） |
| `ADMIN_REQUIRED` | 403 | 需要管理员权限 |

## 客户端对接要点

**人话版对接步骤**：

1. **登录页**：画师输入 QQ 号 + 验证器 App 当前 6 位码 → `POST /api/auth/verify` → 成功则 Cookie 自动种下（前端什么都不用存）→ 用响应的 `isAdmin` 决定跳管理后台还是画师后台。
2. **刷新页面**：调 `GET /api/auth/me`，能拿到数据 = 已登录；401 = 未登录，跳登录页。
3. **登出**：调 `POST /api/auth/logout`，服务端把旧会话全部作废。
4. **注意**：不要再往 localStorage 存 token；所有请求靠 Cookie 自动携带（同源）。

## 测试覆盖

| 测试文件 | 覆盖点 |
|----------|--------|
| `tests/totp.test.js` | TOTP 纯函数：Base32 编解码、动态码计算、±1 窗口校验 |
| `tests/totp-login.test.js` | 登录端点：成功、口令错、未绑定、锁定、限流 |
| `tests/auth-token.test.js` | 会话令牌：签发、验签、过期、token_version 失效 |
| `tests/auth.service.test.js` | 认证服务层逻辑（含防爆破计数/锁定） |

## 附录：端点速查

| 方法 | 路径 | 鉴权 | 用途 |
|------|------|------|------|
| POST | `/api/auth/verify` | 无 | QQ + TOTP 动态口令登录（唯一登录方式） |
| GET | `/api/auth/me` | requireAuth | 当前用户信息 + isAdmin |
| POST | `/api/auth/logout` | requireAuth | 登出（递增 token_version 使旧会话全失效） |
| POST | `/api/admin/artists/:id/totp/bind-init` | requireAdmin | 生成 TOTP 密钥+二维码（绑定第一步） |
| POST | `/api/admin/artists/:id/totp/bind-confirm` | requireAdmin | 校验画师报的 6 位码（绑定第二步） |
| POST | `/api/admin/artists/:id/totp/reset` | requireAdmin | 重置绑定（旧密钥立即失效） |
| POST | `/api/admin/transfer` | requireAdmin | 更换管理员（需当前+新管理员两次动态码） |

**不存在的端点**（旧文档误写，已确认代码里没有）：`POST /api/auth/login`、`POST /api/auth/totp/bind`、`POST /api/auth/totp/verify`。认证相关绑定/重置全部走管理员路由。
