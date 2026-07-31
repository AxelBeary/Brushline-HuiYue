# v0.23 评估：SPEC-005 已付额度池（B7）

> **编号**：plan-v023-quota-pool
> **作者**：四号（需求整理）
> **日期**：2026-08-01
> **状态**：用户已拍板 Q1-Q4（2026-08-01），待三号确认技术细节 T1-T5
> **来源**：一号派工 01-to-04-v022-eval-20260801（B7 展开评估）
> **原始需求**：SPEC-003 §11（2026-07-31 用户拍板方向）/ plan-v018-schedule D2（推后）

---

## 0. 用户已拍板方向（2026-07-31）

> 付款系统从"每个节点标记已付/未付"升级为**已付额度池**模型。画师只记录"收到 ¥X"，系统自动计算覆盖了哪些节点。

覆盖的用户场景（用户原声确认）：
- 临时收款（画师加一笔）✓
- 客户多付钱 ✓
- 客户定金期间直接全款（"大手一挥"）✓
- 付清后再加附加项（线下结算）✓

---

## 1. 现状分析（代码验证 2026-08-01）

### 1.1 当前付款模型

| 组件 | 位置 | 说明 |
|------|------|------|
| 分期表 | `order_payment_installments`（迁移 v5） | 每期有 `status`（pending/paid/overdue）、`amount_cents`、`basis_points` |
| 下单生成 | `order.service.js` createOrder | formal 订单按 priceCalc.installments 生成分期记录 |
| 附加项调整 | `order.service.js` adjustInstallments | 金额变动计入最后一个未付节点 |
| 已付计算 | `order-workflow.service.js` | `SUM(amount_cents) WHERE status='paid'` 实时计算 |
| 话术变量 | `{已付}` `{待付}` | 通过 SUM 查询填充 |
| 前端展示 | PaymentBar.vue / WorkflowPaymentEditor.vue | 画师端付款进度条 + 收款比例编辑 |
| 客户端展示 | TrackOrder.vue / OrderDetail.vue | 分期列表展示 |

### 1.2 当前模型的问题

| 场景 | 现有操作 | 痛点 |
|------|----------|------|
| 客户付了定金 ¥100 | 画师勾"定金已付" | 还行 |
| 客户全款 ¥500 | 逐个勾节点 | 繁琐，应该一键 |
| 客户多付 ¥50 | 改节点金额（尴尬） | 无处记录多收 |
| 临时收款 ¥200 | 加新节点 | 破坏工作流结构 |
| 附加项加 ¥50 | 改最后节点金额 | 不直观 |

### 1.3 关键缺失

- orders 表**无** `paid_total_cents` 字段
- **无**独立的"记录收款"API（付款状态变更绑定在工作流节点推进中）
- **无**"撤销收款"能力

---

## 2. 额度池模型设计

### 2.1 核心概念

```
paid_total_cents（已付总额）= 画师记录的所有收款之和
final_price_cents（应付总额）= 订单最终价格（含附加项）
remaining_cents（待收）= final_price_cents - paid_total_cents
```

画师操作从"勾选某期已付"变为"记录收到 ¥X"。系统自动推算覆盖了哪些分期节点。

### 2.2 分期节点的角色变化

| | 现有模型 | 额度池模型 |
|---|---------|-----------|
| 分期节点 | 应收 + 已付标记 | **仅应收参考**（"建议收多少"） |
| 已付判定 | 节点 status='paid' | `paid_total_cents >= 该节点累计金额` |
| 画师操作 | 勾选节点 | 记录收款金额 |

分期节点保留（作为"应收参考"和话术变量），但 `status` 字段改为由 `paid_total_cents` 推算，不再手动维护。

### 2.3 数据模型变更

```sql
-- 迁移 v24：orders 表加已付总额字段
ALTER TABLE orders ADD COLUMN paid_total_cents INTEGER DEFAULT 0;

-- 迁移 v24：收款记录表（新增）
CREATE TABLE IF NOT EXISTS order_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,          -- 正数=收款，负数=撤销/退款
  note TEXT DEFAULT NULL,                  -- 画师备注（如"微信转账""定金"）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'artist'         -- 'artist' | 'admin'
);
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);
```

**设计决策**：
- `paid_total_cents` 是冗余字段（可从 order_payments SUM 算出），但避免每次查询都聚合，且方便前端直接读取
- `order_payments` 记录每笔收款流水，支持撤销（负数记录）和审计
- `order_payment_installments` 表**保留不动**，`status` 字段改为计算值（见 §2.4）

### 2.4 分期状态推算逻辑

```js
// 伪代码：根据 paid_total_cents 推算每期状态
function computeInstallmentStatuses(order) {
  let covered = order.paid_total_cents
  return order.installments.map(inst => {
    if (covered >= inst.amount_cents) {
      covered -= inst.amount_cents
      return { ...inst, status: 'paid' }
    } else if (covered > 0) {
      const partial = covered
      covered = 0
      return { ...inst, status: 'partial', paid_cents: partial }
    }
    return { ...inst, status: 'pending' }
  })
}
```

**待用户拍板**：是否需要 `partial`（部分付款）状态？还是简化为"覆盖/未覆盖"两态？

### 2.5 与现有系统的关系

| 系统 | 影响 | 处理 |
|------|------|------|
| 工作流节点推进 | 推进时不再改 installment status | 解耦：推进只管 stage，付款只管池 |
| 话术变量 {已付}{待付} | 改为读 paid_total_cents | 简化（不再 SUM installments） |
| 附加项 adjustInstallments | 改为改 final_price_cents | 池模型不关心"计入哪个节点" |
| PaymentBar.vue | 改为显示"已付 ¥X / 应付 ¥Y" | 重做 |
| 客户 track 页 | 显示"已付 ¥X / 应付 ¥Y" | 简化 |
| monthly_quota | **无关**（月度接单额度，不是付款额度） | 不受影响 |

---

## 3. API 设计（建议，待三号确认）

### 3.1 新增

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | /api/artist/orders/:id/payments | requireAuth + requireOwn | 记录一笔收款（正数）或退款/撤销（负数），附 note |
| GET | /api/artist/orders/:id/payments | requireAuth + requireOwn | 收款流水列表（含负数记录） |

### 3.2 变更

| 方法 | 路径 | 变更 |
|------|------|------|
| GET | /api/artist/orders/:id | 响应新增 `paidTotalCents`、`remainingCents`、installments 带推算 status |
| GET | /api/public/orders/:trackId | 客户端响应新增 `paidTotalCents`、`finalPriceCents` |
| PUT | /api/artist/orders/:id/extra-items | 附加项变更后更新 final_price_cents（不再调 adjustInstallments） |

### 3.3 废弃

| 现有 | 处理 |
|------|------|
| 工作流推进时隐式改 installment status | 移除（推进只管 stage） |
| adjustInstallments（改节点金额） | 替换为改 final_price_cents |

---

## 4. 前端交互设计

### 4.1 画师端：订单详情收款区

**现有**：PaymentBar 显示各节点勾选状态

**改为**：

```
┌─────────────────────────────────────────┐
│ 💰 收款记录                              │
│                                         │
│ 已收 ¥350 / 应收 ¥500    待收 ¥150      │
│ ████████████████░░░░░░░  70%            │
│                                         │
│ 收款流水：                               │
│  07-28  +¥100  定金（微信）              │
│  07-30  +¥250  中期款（支付宝）          │
│                                         │
│ [+ 记录收款]                             │
│                                         │
│ 应收参考（工作流节点）：                   │
│  ✓ 定稿 ¥100（30%）                     │
│  ✓ 线稿 ¥150（30%）                     │
│  ○ 完稿 ¥250（40%）← 待收               │
└─────────────────────────────────────────┘
```

**交互**：
- 点击"记录收款"→ 弹窗输入金额 + 可选备注 → 提交
- 流水条目可撤销（二次确认）
- 应收参考区只读展示（由 paid_total_cents 自动推算 ✓/○）

### 4.2 客户端：进度页（用户拍板 Q2）

**现有**：分期列表（各节点已付/未付）

**改为**：进度条 + 四项数据，不显示画师内部节点名

```
已付 ¥350    下期应付 ¥150    待付 ¥150    总额 ¥500
████████████████░░░░░░░  70%
```

- **已付**：paid_total_cents
- **下期应付**：下一个未覆盖分期节点的金额（partial 时显示剩余，如"¥70"）
- **待付**：final_price_cents - paid_total_cents
- **总额**：final_price_cents
- 进度条：paid / total 百分比

客户不需要知道画师的工作流节点叫什么，只关心"我还欠多少、下次付多少"。

### 4.3 管理端

管理员可查看任意订单的收款流水（只读），用于纠纷排查。

---

## 5. 迁移方案

### 5.1 存量数据迁移

```sql
-- 迁移 v24 步骤：
-- 1. 加字段
ALTER TABLE orders ADD COLUMN paid_total_cents INTEGER DEFAULT 0;

-- 2. 存量换算：已付分期的 SUM → paid_total_cents
UPDATE orders SET paid_total_cents = (
  SELECT COALESCE(SUM(amount_cents), 0)
  FROM order_payment_installments
  WHERE order_id = orders.id AND status = 'paid'
);

-- 3. 建收款记录表（存量订单不补录流水，paid_total_cents 即为初始值）
CREATE TABLE IF NOT EXISTS order_payments (...);
```

### 5.2 兼容期

| 场景 | 处理 |
|------|------|
| 老订单（有 installments 无 payments 记录） | paid_total_cents 已由迁移填充，正常显示 |
| 老订单新收款 | 走新 API（POST payments），paid_total_cents 累加 |
| installment status 字段 | 保留但不再手动维护，前端改为推算展示 |

### 5.3 回滚

- paid_total_cents 列可空（DEFAULT 0），旧代码忽略
- order_payments 表独立，旧代码不查
- 恢复备份 + 降级即可

---

## 6. 验收标准

1. 当画师在订单详情点击"记录收款"并输入 ¥200 时，已收金额应该立即 +¥200，流水新增一条记录
2. 当画师撤销一笔 ¥100 的收款时，已收金额应该 -¥100，流水标记为已撤销（或新增负数记录，待三号定）
3. 当已收金额 ≥ 某分期节点累计金额时，该节点应该自动显示为 ✓（已覆盖）
4. 当客户全款 ¥500 时（一次记录），所有分期节点应该全部显示 ✓
5. 当客户多付 ¥50 时（已收 > 应收），应该显示"多收 ¥50"
6. 当画师记录一笔退款 -¥50 时，已收金额应该 -¥50，流水新增一条负数记录（计总账）
7. 当附加项增加 ¥50 时，应收总额应该 +¥50，待收自动重算
8. 当客户访问进度页时，应该看到四项数据：已付 / 下期应付 / 待付 / 总额 + 进度条
9. 当管理员查看订单时，应该能看到完整收款流水
10. 当老订单（迁移前已有已付分期）加载时，paid_total_cents 应该等于原已付分期的 SUM
11. 当工作流节点推进时，不应该改变收款状态（推进和收款解耦）

---

## 7. 用户已拍板（2026-08-01）

| # | 问题 | 结论 | 确认日期 |
|---|------|------|----------|
| Q1 | 分期节点是否需要"部分付款"状态？ | ✅ **三态**（paid / partial / pending），部分覆盖可见（如"¥80/¥150"） | 2026-08-01 |
| Q2 | 客户端显示什么？ | ✅ **进度条 + 四项数据**：已付 / 下期应付 / 待付 / 总额。不显示画师内部节点名 | 2026-08-01 |
| Q3 | 撤销收款的方式？ | ✅ **记负数流水**（保留审计痕迹） | 2026-08-01 |
| Q4 | 多收/退款怎么处理？ | ✅ **退款也记负数**（要计总账），不只是显示"多收" | 2026-08-01 |

---

## 8. 待三号确认

| # | 问题 |
|---|------|
| T1 | paid_total_cents 冗余字段 vs 每次 SUM(order_payments) 的性能取舍 |
| T2 | 撤销收款用 DELETE 还是负数记录（影响审计和并发安全） |
| T3 | 工作流推进与 installment status 的解耦是否有遗漏调用点 |
| T4 | adjustInstallments 替换为改 final_price_cents 的影响范围 |
| T5 | 话术变量 {已付}{待付} 改用 paid_total_cents 后是否影响已有话术模板 |

---

## 9. 工时估算（粗估，待三号/二号确认）

| 层 | 工作 | 时间 |
|----|------|------|
| 后端 | 迁移 v24（加字段 + 建表 + 存量换算） | 1h |
| 后端 | 收款 API（POST/DELETE/GET payments） | 2h |
| 后端 | 分期状态推算 + 话术变量改造 + adjustInstallments 替换 | 2h |
| 后端 | 工作流推进解耦（移除隐式改 status） | 1h |
| 前端（画师端） | 收款记录区重做（PaymentBar → 池模型 + 流水列表 + 记录/撤销弹窗） | 3h |
| 前端（客户端） | track 页付款展示简化 | 1h |
| 前端（管理端） | 订单详情加收款流水只读展示 | 1h |
| 测试 | API + 迁移 + 前端交互 + 存量兼容 | 2h |
| **合计** | | **~13h** |

---

## 10. 风险

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| 存量数据换算错误 | 🟡 | 迁移前后 SUM 校验脚本 |
| 工作流推进解耦遗漏 | 🟡 | 全局搜索 installment status 写入点 |
| 话术变量语义变化 | 🟢 | {已付} 含义不变（只是数据源变了） |
| 前端改动面广 | 🟡 | 分两批：先后端+画师端，再客户端+管理端 |
