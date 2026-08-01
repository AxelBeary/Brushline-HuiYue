# 一号→三号：admin orders 端点补字段（2026-08-01）

## 背景

B7 额度池前端已合入 master。管理端 ArtistManage.vue 订单行展开需要 `paidTotalCents` / `installments` 字段，但 `GET /api/admin/artists/:id/orders` 当前只返回 `o.*`（orders 表原始列），没有三态推算。

## 任务

修改 `server/src/features/admin/admin.routes.ts` L92-100 的 `GET /api/admin/artists/:id/orders` 端点，在返回的每个订单对象中补充：
- `paidTotalCents`：已收总额（从 order_payments 表 SUM）
- `finalPriceCents`：应收总额（已有 final_price_cents 字段，映射为 camelCase）
- `installments`：分期三态数组（复用 order.service.ts 的 getOrder 中的推算逻辑，或抽成公共函数）

## 参考

- `server/src/features/order/order.service.ts` L100-150（getOrder 中的 installments 推算）
- `web/src/views/admin/ArtistManage.vue` L72-95（前端行展开模板，已兜底"暂无付款信息"）

## 授权文件

- `server/src/features/admin/admin.routes.ts`
- `server/src/features/order/order.service.ts`（如需抽公共函数）
- `server/test/`（补测试）

## 分支

`fix/admin-orders-payments`，worktree 自建：
```
git worktree add ../artist-commission-fix-admin fix/admin-orders-payments
```

## 风险等级

低（只读端点加字段，不改写逻辑）。完成后写 comms `03-to-01-admin-orders-{日期}.md`。
