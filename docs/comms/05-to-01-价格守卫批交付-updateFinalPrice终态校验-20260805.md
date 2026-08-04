# 五号交付：价格守卫批（updateFinalPrice/deleteExtraItem 终态校验）

> 2026-08-05 · 分支 `v036-price-guard` · commit `8c38032`

## 改动清单

| 文件 | 改动 |
|------|------|
| `server/src/features/order/order.service.ts` | +12 行：updateFinalPrice（L602 后）+ deleteExtraItem（item 归属校验后）各补 `['delivered','cancelled'].includes(order.status)` → 抛 `AppError(E.ORDER_FINAL_STATE)`（复用现有错误码，未新增） |
| `server/tests/price-guard.test.js` | 新增测试文件，7 用例 |

**done 不拦是有意设计**：done 是当前唯一减价窗口（负增项被 schema `minimum:0` 拦、负收款只退钱不调总价），守卫须等 REQ-025 第二阶段负条目机制一起上。两处代码注释已落此说明，防将来误改。

## deleteExtraItem 自查结论

原无守卫（漏洞实锤），已按 addExtraItem 同款模式补上。守卫放在 item 归属校验之后——先 404（不泄露终态订单的 item 存在性）再 400，与路由层 requireOwnOrder 鉴权顺序一致。

## 顺手确认（只报告，未改）

- **addPayment**：无任何状态校验（只校验金额/备注/节点归属）——符合 semi-terminal 拍板语义，**未加守卫**
- **addExtraItem**：已有 delivered/cancelled 守卫（L707-710），无需动

## 测试用例

| 用例 | 断言 |
|------|------|
| TC-PG-01 | delivered 改价 → 400 ORDER_FINAL_STATE + 价格未动 |
| TC-PG-02 | cancelled 改价 → 400 |
| TC-PG-03 | **done 改价 → 200**（显式断言不拦） |
| TC-PG-04 | wip 改价 → 200（回归） |
| TC-PG-05 | delivered 删附加项 → 400 + item 未删 |
| TC-PG-06 | cancelled 删附加项 → 400 |
| TC-PG-07 | **done 删附加项 → 200**（显式断言不拦） |

## 验证

- price-guard.test.js：7/7 通过
- server 全量：**720/720 通过**（43 文件；存量 713 + 新增 7）
