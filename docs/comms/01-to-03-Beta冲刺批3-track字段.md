# 派工：三号 · Beta 冲刺批 3 —— U1 查单响应补需求字段（后端）

> 分支：新建 `beta/backend-track-fields` · worktree：`../artist-commission-w8`（一号已建）
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

二号批 1 交付时发现：客户查单页缺「需求描述/参考图」回顾（研报 U1）。DB 层已存（`orders.description` + `order_references` 表），但 `GET /api/orders/track/:orderNo` 响应**未透出**。本批给 track 响应补 `description` + `references`（仅 client source，防泄露画师参考图）。**纯后端。**

## 授权文件（只动这些）

- `server/src/features/order/order.service.ts`（`getClientQueuePosition` 返回物）
- `server/src/features/order/order.routes.ts`（track 路由透出）
- `server/tests/*`（新增回归测试）

**不要动**：`web/` 任何文件（二号/五号并行批在改）、`server/src/features/artist/*`、`server/src/db/*`、生产数据库文件。

---

## 任务：track 响应补 description + references

**现状**：`order.routes.ts` L185-246 `GET /api/orders/track/:orderNo` → `orderService.getClientQueuePosition()`。响应已有 orderNo/status/tierName/artistName/position/total/workflowStages/currentStageId/currentStageName/deliverables/extraItems/finalPriceCents/paidTotalCents/installments/queueZone，**缺 description/references**。

**做法**：

1. **读代码确认**：`order.service.ts` 中 `getClientQueuePosition` 的实现——它已返回 `order` 完整行（含 `description` 字段？）还是投影？`order_references` 表结构（order_id/path/source？）与既有查询（如交付 deliverables 怎么查）先读清楚，保持风格一致。

2. **返回物补两个字段**：
   - `description: order.description ?? null`
   - `references: <该订单的参考图列表>`
   - **references 过滤规则**：只返回 `source = 'client'` 的行（客户提交的参考图），**不返回画师图**（R18 clientOnly 逻辑——查现有代码有没有类似过滤可复用；`order_references.source` 字段有 client/artist 两值，见 init.js）。
   - references 每项形状建议：`{ url, originalName }`（与 deliverables 风格一致）或按 order_references 实际列名（path 等）——**以表结构为准**。

3. **track 路由透出**：把两个字段加进 `order.routes.ts` 响应对象（在现有 return 对象里加两行）。

4. **回归测试**：`server/tests/` 加一条（或扩展现有 track 测试）：
   - 造订单：带 description + 1 条 client 参考图 + 1 条 artist 参考图
   - 调 `GET /api/orders/track/:orderNo?qq=` → 响应含 description、references 仅含 client 那条（artist 那条**不出现**）
   - 无需求订单 → description null、references 空数组

**验证**：`npx vitest run`（server 目录）全绿（基线 928 + 新增）；交付报告写明：前端字段形状（二号批 3 前端区块依赖，需对齐）、新增测试数。

---

## 交付要求

1. 交付报告：`docs/comms/03-to-01-交付-Beta冲刺批3-track字段.md`，写明：
   - references 每项最终形状（url/originalName 字段名）
   - source 过滤逻辑怎么做的
   - 测试跑分（928 + 新增 N）
2. commit 信息带「beta:」前缀，如 `beta: track响应补description+references(client-only)`。
3. ⚠️ 交付后二号前端区块会按你报告的形状联调——**字段名写准确**。
