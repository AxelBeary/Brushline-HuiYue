# 交付报告：v0.32 Phase 2 价格计算引擎（三号）

> 日期：2026-08-03
> 分支：`feat/v032-phase2-pricing`
> commit：`d837134`

---

## 做了什么

新增 `POST /api/public/calculate-style-price`——基于多画风模型的价格计算引擎。支持三种增项控件（switch/quantity/radio）、三级价格覆盖（尺寸>画风>模板）、倍率叠加、折扣码（先倍率后折扣）。旧 `calculate-price` 不动。

## 改了哪些文件

| 文件 | 变更 |
|------|------|
| `server/src/features/pricing/style-pricing.service.ts` | **新建** — 计算引擎核心逻辑 |
| `server/src/features/pricing/style.routes.ts` | 追加 calculate-style-price 路由 + JSON Schema |
| `server/tests/style-pricing.test.js` | **新建** — 29 个测试 |

## 接口规格

```
POST /api/public/calculate-style-price
限流：30次/5分钟

请求：{ subdomain, styleSizeId, addons?, usageMultiplierId?, rushMultiplierId?, discountCode? }
响应：{ sizeName, basePrice, addonItems[], subtotal, usageMultiplier, rushMultiplier, multiplierTotal, discount, totalPrice, totalPriceCents }
```

价格公式：`总价 = (尺寸基础价 + Σ增项) × Π倍率 - 折扣`
增项价格优先级：尺寸覆盖 > 画风覆盖 > 模板默认价
折扣顺序：先倍率后折扣（REQ-023 已定）

## 验证结果

- 后端测试：**651/651 通过**（38 文件，含 29 个新增）
- ESLint：零错误
- 现有 622 测试全部通过，无回归
- 复用 discount.service.ts 的 validateDiscountCode + computeDiscountCents，无重复逻辑
