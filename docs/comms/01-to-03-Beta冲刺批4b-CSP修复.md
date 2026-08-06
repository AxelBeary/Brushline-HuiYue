# 派工：三号 · Beta 冲刺批 4b —— Sentry CSP 变量名对齐（快速批）

> 分支：`beta/backend-track-fields` 续用 · worktree：`../artist-commission-w8`
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

生产容器 Sentry 前端上报被 CSP 拦截（用户 F12 报错实锤）：`connect-src 'self'` 不含 Sentry ingest 域名 → 前端错误监控静默失效。**根因**：`server/src/app.js:140` 读 `process.env.SENTRY_DSN`，但 `.env` 变量名是 **`SENTRY_DSN_BACKEND`**（docker-compose env_file 全量注入，容器里没有 `SENTRY_DSN`）→ CSP 拼接不出 ingest 域名。一行对齐修复。

## 授权文件（只动这些）

- `server/src/app.js`（仅 CSP 拼接处一行）

**不要动**：`.env`（生产配置，一号维护）、`web/`、其他 server 文件、docker-compose.yml。

---

## 任务：app.js CSP 变量名对齐

**现状**（`server/src/app.js` L139-143）：
```js
// #43a: CSP connect-src 动态拼接 Sentry DSN 域名（未配置则不加）
const cspSentryDsn = process.env.SENTRY_DSN
let cspConnectSrc = "connect-src 'self'"
if (cspSentryDsn) {
  try { cspConnectSrc += ` ${new URL(cspSentryDsn).origin}` } catch { /* DSN 无效，忽略 */ }
```

**改法**：读 `SENTRY_DSN_BACKEND`（.env 实际变量名），向后兼容 `SENTRY_DSN`：
```js
const cspSentryDsn = process.env.SENTRY_DSN_BACKEND || process.env.SENTRY_DSN
```
（只改这一行，其余不动。）

**验证**：
- `npx vitest run`（server）930/930
- 无 CSP 相关测试时，冒烟：`SENTRY_DSN_BACKEND=xxx node -e "console.log(new URL(process.env.SENTRY_DSN_BACKEND||process.env.SENTRY_DSN).origin)"` 能打印 ingest origin
- 交付报告：`docs/comms/03-to-01-交付-Beta冲刺批4b-CSP修复.md`

**commit**：`beta: CSP connect-src读SENTRY_DSN_BACKEND(对齐.env,修Sentry前端上报被拦)`
