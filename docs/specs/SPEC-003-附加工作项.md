# SPEC-003：订单附加工作项（R38）

> **编号**：SPEC-003
> **作者**：三号（后端）
> **日期**：2026-07-30
> **状态**：待用户确认
> **关联需求**：REQ-010 R38 / REQ-007 备案

---

## 1. 问题定义

用户原声（v0.13）：
> "快完稿了客户突然加需求，画师加钱，计入尾款。"

现有系统无法处理**下单后**的价格变更（除 `updateFinalPrice` 手动改总价外）：
- `price_addons` 是**下单前**的报价组件（全局增项模板），不能挂在单个订单上
- `quote_snapshot` 是下单时的快照字符串，不应被后续追加修改
- `updateFinalPrice` 只改总价，不记录"为什么改"——客户看不到加了什么

**附加工作项**解决的是：下单后、交付前，客户追加需求导致的工作量和费用增加。

---

## 2. 数据模型

### 新表：`order_extra_items`

```sql
CREATE TABLE IF NOT EXISTS order_extra_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL,
  name         TEXT    NOT NULL,           -- 附加项名称（如"加一把武器"）
  description  TEXT,                       -- 可选说明
  price_cents  INTEGER NOT NULL DEFAULT 0, -- 附加费用（分），0 = 不计费
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_extra_items_order ON order_extra_items(order_id);
```

**设计决策：**

| 决策 | 选择 | 理由 |
|------|------|------|
| 独立表 vs orders 加字段 | 独立表 | 一个订单可有多个附加项，需逐条展示/删除 |
| 是否需要 `sort_order` | 不需要 | 按 `created_at` 排序即可，附加项无拖拽排序需求 |
| 是否需要 `status`（待确认/已确认） | v1 不需要 | C62 精神：v1 固定规则不做自定义。画师单方面加，不做客户确认流程 |
| 是否需要 `created_by` | 不需要 | v1 只有画师能加（requireAuth），无客户端入口 |
| `price_cents` 允许 0 | 是 | 画师可能加"免费的小修改"，记录工作量但不计费 |

### 与现有表的关系

```
orders
  ├── order_price_breakdown   （下单时快照，只读）
  ├── order_payment_installments（下单时生成，只读）
  ├── order_extra_items       （下单后追加，可增删）← 新增
  └── final_price_cents       （= 计算器总价 + Σ附加项，或手动覆盖）
```

- `order_price_breakdown`：**不动**。它是下单时的价格明细快照。
- `order_payment_installments`：**不动**。分期比例基于下单时总价，附加项不重算分期。
- `quote_snapshot`：**不动**。它是下单时的报价字符串。
- `final_price_cents`：**附加项添加/删除时自动重算**（见 §3）。

---

## 3. 尾款重算逻辑

### 核心公式

```
final_price_cents = base_total_price_cents + Σ(extra_items.price_cents)
```

其中 `base_total_price_cents` 是订单的**计算器总价**（`total_price_cents`），即下单时 `calculatePrice()` 的结果。

### 重算时机

| 事件 | 动作 |
|------|------|
| 添加附加项 | `final_price_cents = total_price_cents + Σ附加项` |
| 删除附加项 | 同上 |
| 手动改价（`updateFinalPrice`） | 覆盖 `final_price_cents`，**不影响附加项记录** |

### 边界情况

| 场景 | 处理 |
|------|------|
| 无 `total_price_cents`（手动录单无价格） | 附加项添加时 `final_price_cents = Σ附加项`（从 0 起算） |
| 画师先手动改价，再加附加项 | 重算会覆盖手动改价结果。**建议**：有附加项时前端提示"最终价格由附加项自动计算" |
| 附加项全部删除 | `final_price_cents` 回退到 `total_price_cents` |

### 自动备注

每次附加项变更时，写入系统备注（`created_by='system'`）：
- 添加：`📎 附加工作项「加一把武器」+¥50`
- 删除：`📎 移除附加工作项「加一把武器」-¥50`

与 `updateFinalPrice` 的自动备注机制一致（order.service.js:530）。

---

## 4. API 设计

### 4.1 添加附加项

```
POST /api/artist/orders/:id/extra-items
```

**请求体（JSON Schema）：**
```json
{
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "description": { "type": ["string", "null"], "maxLength": 500 },
    "priceCents": { "type": "integer", "minimum": 0, "maximum": 99999999 }
  },
  "additionalProperties": false
}
```

**响应**：更新后的订单对象（含 `extraItems` 数组 + 重算后的 `final_price_cents`）

**校验**：
- requireAuth + requireOwnOrder
- 订单状态不能是 `delivered` / `cancelled`（终态不可追加）
- 附加项数量上限：20 条（防滥用）

### 4.2 删除附加项

```
DELETE /api/artist/orders/:id/extra-items/:itemId
```

**校验**：
- requireAuth + requireOwnOrder
- 归属校验（item.order_id === order.id）
- 不存在 → 404

**响应**：更新后的订单对象

### 4.3 查询

不新增 GET 接口。`getOrder()` 返回的订单对象中追加 `extraItems` 字段：

```js
order.extraItems = db.prepare(
  'SELECT * FROM order_extra_items WHERE order_id = ? ORDER BY created_at ASC'
).all(orderId)
```

所有返回订单的接口（GET /api/artist/orders/:id、POST notes、PUT status 等）自动携带。

### 4.4 客户进度页

`GET /api/orders/track/:orderNo` 响应新增：

```json
{
  "extraItems": [
    { "name": "加一把武器", "priceCents": 5000 }
  ],
  "finalPriceCents": 55000
}
```

客户能看到加了什么、加了多少。不返回 `description`（画师内部备注）和 `id`（无需暴露）。

---

## 5. 客户确认流程

**用户已拍板（2026-07-30）：v1 不做客户确认，画师单方面添加。**

- 画师添加附加项 → 立即生效 → 尾款自动重算
- 客户在进度页看到变更（附加项列表 + 更新后的尾款）
- 系统备注记录变更历史（审计轨迹）

> 预留：若后续用户反馈需要确认流程，在 `order_extra_items` 加 `status TEXT DEFAULT 'confirmed'` 列 + 客户端确认接口即可，不影响 v1 数据结构。

---

## 6. 前端适配（供二号参考）

### 画师端（OrderDetail.vue）

- 备注区下方新增"附加工作项"卡片
- 每条显示：名称 + 金额 + 删除按钮（悬停显示）
- 底部"添加附加项"按钮 → 弹窗（名称 + 说明 + 金额）
- 添加/删除后刷新订单数据（`final_price_cents` 已重算）

### 客户进度页

- 价格区域显示附加项明细（名称 + 金额）
- 尾款金额使用 `finalPriceCents`

### 管理后台

- 订单详情只读展示附加项（管理员可查看，不可编辑）

---

## 7. 迁移

```sql
-- 迁移 v16: order_extra_items
CREATE TABLE IF NOT EXISTS order_extra_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL,
  name         TEXT    NOT NULL,
  description  TEXT,
  price_cents  INTEGER NOT NULL DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_extra_items_order ON order_extra_items(order_id);
```

- 纯新表，无 ALTER TABLE，无存量数据影响
- 回滚：`DROP TABLE IF EXISTS order_extra_items;`
- GC：无文件字段，无需更新 `gcUploads`

---

## 8. 测试计划

| 用例 | 描述 |
|------|------|
| 正常添加 | 添加附加项 → 订单含 extraItems + final_price_cents 重算 |
| 多项累加 | 添加 3 项 → final = base + Σ3项 |
| 删除重算 | 删除 1 项 → final 减少对应金额 |
| 全部删除 | final 回退到 total_price_cents |
| 无价格订单 | total_price_cents=null → final = Σ附加项 |
| 终态拒绝 | delivered/cancelled 订单添加 → 400 |
| 数量上限 | 第 21 项 → 400 |
| 非归属拒绝 | 画师 A 操作画师 B 的订单 → 404 |
| 系统备注 | 添加/删除后 notes 含 📎 记录 |
| 客户进度页 | track 接口返回 extraItems + finalPriceCents |
| 迁移幂等 | 重复执行不报错 |

---

## 9. 工程量估算

| 层 | 工作 | 时间 |
|----|------|------|
| 迁移 | v16 新表 | 10min |
| 后端 | CRUD + 重算 + getOrder 扩展 + track 扩展 | 1.5h |
| 前端（画师端） | OrderDetail 附加项卡片 + 添加弹窗 | 1.5h |
| 前端（客户端） | 进度页附加项展示 | 30min |
| 测试 | 11 例 | 30min |
| **合计** | | **~4h** |

---

## 10. 待用户确认

| # | 问题 | 建议 |
|---|------|------|
| 1 | ~~v1 是否需要客户确认流程？~~ | **已拍板：不需要** |
| 2 | 附加项是否允许 0 元？ | 允许（记录工作量不计费） |
| 3 | 手动改价后加附加项的行为？ | 重算覆盖手动价（前端提示） |
| 4 | 客户进度页是否显示附加项说明？ | 不显示（只展示名称+金额） |
| 5 | 附加项数量上限？ | 20 条 |
| 6 | 已交付/已取消订单能否追加？ | 不能（终态拒绝） |
