# 交付报告：v0.32 Phase 2 订单创建 API 扩展（三号）

> 日期：2026-08-03
> 分支：`feat/v032-phase2-orders`
> commit：`669bdcc`

---

## 做了什么

POST /api/orders 和 POST /api/artist/orders/manual 新增 `styleSizeId` + `styleAddons` 字段，服务端调 calculateStylePrice 算价，存 total_price_cents + quote_snapshot + breakdown + 分期。旧档位路径完全不动。

## 改了哪些文件

| 文件 | 变更 |
|------|------|
| `server/src/features/order/order.routes.ts` | 两处 POST schema 加 styleSizeId/styleAddons + handler 传参 |
| `server/src/features/order/order.service.ts` | CreateOrderParams 扩展 + createOrder 画风分支 + buildStyleQuoteSnapshot + breakdown/分期 |
| `server/src/features/pricing/style-pricing.service.ts` | 导出 StylePriceResult + 加 styleName 字段 |
| `server/tests/style-order.test.js` | **新建** — 15 个测试 |

## 关键设计

- **互斥**：styleSizeId 与 tierId 同传 → 400 VALIDATION
- **折扣**：画风模式折扣走现有统一逻辑（先倍率后折扣），不重复实现
- **breakdown**：用现有 `tier`/`addon` item_type（避免改 CHECK 约束/迁移）
- **分期**：画风模式从工作流节点生成分期（同旧逻辑）
- **quote_snapshot 格式**：`[日系 / 全身] 基础¥600 + 加人×2 ¥400 = ¥1150 × 商用2.0 = ¥2300 → 总价 ¥2070`

## 验证结果

- 后端测试：**666/666 通过**（39 文件，含 15 个新增）
- ESLint：零错误
- 现有 651 测试全部通过，无回归
