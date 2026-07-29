# 三号 → 一号：R30d 流程状态机后端交接

> 日期：2026-07-30
> 分支：`feat/backend-artist-r30d-stage`（worktree: `artist-commission-r30d`）
> 基于：master `28069e8`
> 状态：1 commit `43e4336`，165/165 测试通过，ESLint 零错误，待审核

---

## 变更文件（4 文件，+347 / -6）

```
server/src/db/init.js                          (+12)  schema + 迁移 v14
server/src/features/order/order.service.js     (+137) advanceStage/rollbackStage/getStageInfo/自动接入
server/src/features/order/order.routes.js      (+60)  PUT stage/stage-back + GET详情stageInfo + track + 旧接口隔离
server/tests/order.service.test.js             (+138) 10 个新用例
```

---

## 接口变更（需通知二号）

| 接口 | 类型 | 详情 |
|------|------|------|
| `PUT /api/artist/orders/:id/stage` | **新增** | body: `{ stageId: int\|null }`。推进流程节点（只能前进）；null=关闭流程跟踪 |
| `PUT /api/artist/orders/:id/stage-back` | **新增** | body: `{ stageId: int }`。打回修改→revision + 系统备注 |
| `GET /api/artist/orders/:id` | 新增字段 | `currentStageId` / `currentStageName` / `stageProgress: {current, total}` |
| `GET /api/orders/track/:orderNo` | 新增字段 | `currentStageName`（客户只看节点名，不看进度数字） |
| `PUT /api/artist/orders/:id/status` | 行为变更 | 有 current_stage_id 的订单拒绝旧接口（cancelled 除外），返回 400 提示用 stage 接口 |

---

## 状态映射规则（用户已确认）

| 节点位置 | 映射状态 |
|----------|:--------:|
| 第 1 个 | pending |
| 第 2 个（收款节点） | confirmed |
| 中间 | wip |
| 最后一个 | done |
| 打回 | revision |
| 交付（POST deliver） | delivered |
| 取消 | cancelled（任何阶段） |

---

## 迁移 v14

- 内容：`ALTER TABLE orders ADD COLUMN current_stage_id INTEGER`
- 幂等：PRAGMA table_info 检测
- 存量：全部 NULL（老订单不接入，走旧状态机）
- 回滚：列可空，旧代码忽略

---

## 一号待办

1. 审核 `43e4336`
2. 通知二号：R30d 后端就绪，可接前端（QueueBoard 推进按钮 + OrderDetail 进度条）
3. 合并顺序：本分支无前端依赖，可先合
