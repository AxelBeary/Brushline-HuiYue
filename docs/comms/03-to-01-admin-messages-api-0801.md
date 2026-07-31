# 三号 → 一号：补 GET /api/admin/messages 端点

> 日期：2026-08-01
> 分支：fix/admin-messages-api

## 改动

- `guestbook.service.js`：新增 `getAdminMessages()`（LEFT JOIN artists 取 artist_name，按 created_at DESC）
- `guestbook.routes.js`：新增 `GET /api/admin/messages`（requireAdmin），返回数组（无分页）

响应格式与前端已构建的一致：`[{ id, artist_name, nickname, content, status, created_at, ... }]`

## 验证

- `npx vitest run`：445/445 通过（24 文件）
- `npx eslint .`：0 错误 0 警告
