# 三号 → 一号：track-on 接口完成

> 日期：2026-07-30
> 分支：`feat/backend-artist-v014`（commit `6bc905b`）

---

## 做了什么

新增 `PUT /api/artist/orders/:id/track-on` 接口：画师对无工作流订单"启用流程跟踪"。

- 设 `current_stage_id` = 画师工作流第一节点，`status` 保持不变
- 已有跟踪 → 409 `TRACK_ALREADY_ON`
- 无工作流模板 → 400 `NO_WORKFLOW_TEMPLATE`
- 响应含 `currentStageId` / `currentStageName` / `stageProgress` + 签名 URL

## 改了哪些文件

| 文件 | 变更 |
|------|------|
| `server/src/shared/errors.js` | +2 错误码 + 中文消息 |
| `server/src/features/order/order.service.js` | +`enableTracking(orderId)` |
| `server/src/features/order/order.routes.js` | +路由（无 body schema，PUT 无请求体） |
| `server/tests/order.service.test.js` | +3 条（TC-O-40/41/42） |
| `server/tests/routes.test.js` | +4 条（TC-RT-17/17b/17c/17d） |
| `web/src/api/index.js` | +`trackOn(id)` 调用预留 |

## 验证结果

- 全量测试 **172/172 通过**（165 → 172，+7）
- ESLint 零错误零警告
- 无数据库变更、无迁移、无接口破坏性变更

## 接口契约（供二号接线）

```
PUT /api/artist/orders/:id/track-on
Authorization: Bearer <token>
（无请求体）

200 → 订单对象（含 currentStageId, currentStageName, stageProgress, 签名 URL）
409 → { code: 'TRACK_ALREADY_ON' }
400 → { code: 'NO_WORKFLOW_TEMPLATE' }
401 → 未登录
404 → 订单不存在/不属于当前画师
```

前端调用：`ordersApi.trackOn(orderId)`
