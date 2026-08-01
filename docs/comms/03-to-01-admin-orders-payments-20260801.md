# 三号→一号：admin orders 端点补字段完成（2026-08-01）

## 做了什么

`GET /api/admin/artists/:id/orders` 返回的每个订单对象新增三个字段：
- `paidTotalCents`：已收总额（`paid_total_cents` 的 camelCase 映射，null → 0）
- `finalPriceCents`：应收总额（`final_price_cents` 的 camelCase 映射，null → 0）
- `installments`：分期三态数组（复用 `orderService.getOrderInstallments()`，含 name/amountCents/status/paidCents）

实现方式：route 层后处理（map），不改 `getArtistOrders` 服务函数，避免画师端列表引入 N+1。

## 改了哪些文件

| 文件 | 变更 |
|------|------|
| `server/src/features/admin/admin.routes.ts` | L92-108：getArtistOrders 结果 map 补字段 |
| `server/tests/admin.routes.test.js` | +3 用例（TC-AR-16/17/18），import seedOrder + orderService |

## 分支

`fix/admin-orders-payments`，worktree `../artist-commission-fix-admin`，commit `bb3398a`

## 验证结果

- 全量测试 485/485 通过（28 文件），含新增 TC-AR-16/17/18
- ESLint 零错误
- 无数据库变更、无接口破坏性变更（纯新增字段）
