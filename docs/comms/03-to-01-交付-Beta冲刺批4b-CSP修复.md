# 交付：三号 · Beta 冲刺批 4b —— Sentry CSP 变量名对齐（快速批）

> 分支：`beta/backend-track-fields` 续用 · worktree：`../artist-commission-w8`
> 交付时间：2026-08-07 · 基线 merge：`23fc62e`（master，含批 3 合入）
> 状态：**完成，测试全绿，未推送未合并**

---

## 一、改动（1 文件 1 行）

**`server/src/app.js` L139-141** CSP 拼接处：

```diff
-  const cspSentryDsn = process.env.SENTRY_DSN
+  // 批4b: .env 实际变量名是 SENTRY_DSN_BACKEND（docker-compose env_file 全量注入），向后兼容 SENTRY_DSN
+  const cspSentryDsn = process.env.SENTRY_DSN_BACKEND || process.env.SENTRY_DSN
```

只改这一行，其余未动。未动 `.env` / `web/` / docker-compose.yml。

## 二、验证

| 验证 | 结果 |
|------|------|
| `npx vitest run`（server 全量） | ✅ **930/930 通过**（59 文件） |
| `npx tsc --noEmit` | ✅ 0 错误 |
| 冒烟（派工指定命令） | ✅ `SENTRY_DSN_BACKEND=https://abc123@sentry.example.com/456` → origin `https://sentry.example.com`；仅设 `SENTRY_DSN` 时回退 origin `https://sentry.fallback.com` |
| **真实响应头 ad-hoc 验证** | ✅ 4/4 PASS：设 `SENTRY_DSN_BACKEND` 起 app → `GET /api/health` 响应 CSP 头为 `...connect-src 'self' https://sentry.example.com; font-src 'self'`——ingest 域名已进 connect-src，且 `'self'` 保留 |

## 三、说明

- 变量名优先级：`SENTRY_DSN_BACKEND`（.env 实际名）→ `SENTRY_DSN`（向后兼容旧部署）。
- 生产容器 env_file 全量注入 `.env`，修复后容器内 `SENTRY_DSN_BACKEND` 生效，Sentry 前端上报不再被 CSP 拦截。
- 向后兼容：未配置任一变量时行为与之前一致（connect-src 保持 `'self'`，不追加域名）。
