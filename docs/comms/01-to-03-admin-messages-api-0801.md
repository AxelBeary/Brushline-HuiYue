# 一号 → 三号：补 GET /api/admin/messages 端点

> 日期：2026-08-01
> 优先级：高（阻塞管理端留言列表）
> 分支：fix/admin-messages-api

## 背景

二号第 3 波前端已合入，管理端 AdminDashboard 留言管理卡调用 `GET /api/admin/messages`，但后端 guestbook.routes.js 只有公开/画师/DELETE 路由，缺管理端列表接口。前端已做静默降级（空状态），补上即激活。

## 任务

`server/src/features/guestbook/guestbook.routes.js` 新增：

```
GET /api/admin/messages（requireAdmin）
```

返回所有留言（跨画师），按 created_at DESC，含 artist_name 字段（JOIN artists）。

响应格式（前端已按此构建）：
```json
[
  {
    "id": 1,
    "artist_name": "alice",
    "nickname": "小明",
    "content": "画得好好看！",
    "status": "approved",
    "created_at": "2026-08-01 10:00:00"
  }
]
```

不需要分页（管理端一次加载，留言量不大）。

## 授权文件

- server/src/features/guestbook/guestbook.routes.js
- server/src/features/guestbook/guestbook.service.js（如需新增查询方法）

## 验收

1. `cd server && npx vitest run` 全绿
2. GET /api/admin/messages 返回跨画师留言列表（含 artist_name）

## 交付

comms：`docs/comms/03-to-01-admin-messages-api-0801.md`
