# 价格计算器 — 工程规划

> 创建日期：2026-07-28
> 状态：✅ 已完成（v0.9.0 实施，迁移 v9，29 个测试用例）
> 前置依赖：无（现有 price_tiers / workflow_stages 已就绪）

---

## 一、功能概述

客户在画师主页选择基础档位后，进入「专柜」式增项选择界面，
实时计算总价和分期金额。画师通过拖拽操作管理增项与档位的关联。

### 核心公式

```
基础价 = tier.price

增项合计 = Σ 固定增项 + Σ (百分比增项 × 基础价)
           ↑ 百分比永远基于基础价，不基于小计

小计 = 基础价 + 增项合计

用途倍率 = 选中的 usage multiplier 中取最高值（不叠加）
加急倍率 = 选中的 rush multiplier（默认 1.0）

总价 = 小计 × 用途倍率 × 加急倍率
       ↑ 用途和加急之间是相乘关系（可叠加）

分期 = 总价 × 各 workflow_stage.basis_points / 10000
```

### 举例

全身像 ¥200 + 表情差分×2（¥15/个=¥30）+ 复杂背景（+40%=¥80）
→ 小计 ¥310 → 商用 ×1.5 → 加急 ×2.0
→ 总价 ¥310 × 1.5 × 2.0 = ¥930
→ 定金 30% = ¥279，尾款 70% = ¥651

---

## 二、已确认的设计决策

| # | 决策 | 结论 |
|---|------|------|
| 1 | 多个用途倍率（商用+买断）同时选中 | **取最高**，不相乘 |
| 2 | 用途倍率和加急倍率能否同时生效 | **可以叠加**（相乘） |
| 3 | 百分比增项的基数 | **永远基于档位基础价**，不给画师选基数 |
| 4 | 增项计价方式 | 每个增项独立选：固定金额 或 按基础价百分比 |
| 5 | 增项选择模式 | quantity（数量）/ toggle（开关）/ inquiry（面议） |
| 6 | 增项与档位关联 | 全局定义 + 多对多关联表（addon_tiers） |
| 7 | 画师管理交互 | 跨列拖拽（增项库→档位货架）+ 列表排序 |
| 8 | 倍率设置交互 | 数字输入框（不做滑杆） |
| 9 | 客户端增项展示 | 按分类折叠，数量步进器，实时总价 |
| 10 | 档位（款式）自定义 | 已有功能，不需要新做 |

---

## 三、数据模型（迁移 v8）

### 3.1 price_addons（增项表）

```sql
CREATE TABLE IF NOT EXISTS price_addons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id     INTEGER NOT NULL,
  category      TEXT NOT NULL CHECK(category IN (
                  'expression', 'outfit', 'background', 'weapon', 'other'
                )),
  name          TEXT NOT NULL,
  price_type    TEXT NOT NULL DEFAULT 'fixed' CHECK(price_type IN ('fixed', 'percent')),
  price_value   REAL NOT NULL,          -- 固定: 金额(元); 百分比: 0.3 = 30%
  select_mode   TEXT NOT NULL DEFAULT 'quantity' CHECK(select_mode IN (
                  'quantity', 'toggle', 'inquiry'
                )),
  max_qty       INTEGER DEFAULT 5,      -- quantity 模式下的上限
  description   TEXT,                   -- 给客户看的说明
  sort_order    INTEGER DEFAULT 0,
  enabled       INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_addons_artist ON price_addons(artist_id, sort_order);
```

### 3.2 addon_tiers（增项-档位关联表）

```sql
CREATE TABLE IF NOT EXISTS addon_tiers (
  addon_id  INTEGER NOT NULL,
  tier_id   INTEGER NOT NULL,
  PRIMARY KEY (addon_id, tier_id),
  FOREIGN KEY (addon_id) REFERENCES price_addons(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES price_tiers(id) ON DELETE CASCADE
);
```

> 不在此表中的档位 = 客户选该档位时看不到此增项。
> 新建增项时若未指定关联 → 默认关联画师所有档位。

### 3.3 price_multipliers（倍率表）

```sql
CREATE TABLE IF NOT EXISTS price_multipliers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id     INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK(type IN ('usage', 'rush')),
  name          TEXT NOT NULL,          -- "商用授权" / "加急（3天内）"
  multiplier    REAL NOT NULL DEFAULT 1.0,  -- 1.5 = ×1.5
  description   TEXT,
  sort_order    INTEGER DEFAULT 0,
  enabled       INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_multipliers_artist ON price_multipliers(artist_id, type);
```

### 3.4 order_price_breakdown（订单价格明细快照）

```sql
CREATE TABLE IF NOT EXISTS order_price_breakdown (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL,
  item_type   TEXT NOT NULL CHECK(item_type IN ('tier', 'addon', 'usage', 'rush')),
  item_name   TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,        -- 该项贡献金额（分），避免浮点
  multiplier  REAL DEFAULT 1.0,         -- 倍率项记录倍率值
  quantity    INTEGER DEFAULT 1,        -- 增项数量
  sort_order  INTEGER DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### 3.5 orders 表新增字段

```sql
ALTER TABLE orders ADD COLUMN total_price_cents INTEGER;  -- 计算总价（分）
ALTER TABLE orders ADD COLUMN usage_multiplier_id INTEGER; -- 选中的用途倍率
ALTER TABLE orders ADD COLUMN rush_multiplier_id INTEGER;  -- 选中的加急倍率
```

---

## 四、后端 API

### 4.1 画师后台（需 requireAuth）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/artist/addons` | 获取增项列表（含关联的 tier_ids） |
| POST | `/api/artist/addons` | 创建增项（body 含 tierIds 数组） |
| PUT | `/api/artist/addons/:id` | 更新增项（含 tierIds） |
| DELETE | `/api/artist/addons/:id` | 删除增项 |
| PUT | `/api/artist/addons/reorder` | 拖拽排序（orderedIds 数组） |
| PUT | `/api/artist/addons/:id/tiers` | 单独更新关联档位（拖拽用） |
| GET | `/api/artist/multipliers` | 获取倍率列表 |
| POST | `/api/artist/multipliers` | 创建倍率 |
| PUT | `/api/artist/multipliers/:id` | 更新倍率 |
| DELETE | `/api/artist/multipliers/:id` | 删除倍率 |

### 4.2 客户端（公开 + 限流）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/pricing/:subdomain` | 获取画师完整报价（档位+增项+倍率） |
| POST | `/api/public/calculate-price` | 无状态计算（传选择，返总价+分期） |

### 4.3 calculate-price 请求/响应

```json
// 请求
{
  "subdomain": "alice",
  "tierId": 3,
  "addons": [
    { "addonId": 1, "quantity": 2 },
    { "addonId": 5, "quantity": 1 }
  ],
  "usageMultiplierId": 2,
  "rushMultiplierId": null
}

// 响应
{
  "basePrice": 200,
  "addonTotal": 110,
  "subtotal": 310,
  "usageMultiplier": 1.5,
  "rushMultiplier": 1.0,
  "totalPrice": 465,
  "installments": [
    { "label": "定金", "basisPoints": 3000, "amount": 139.5 },
    { "label": "尾款", "basisPoints": 7000, "amount": 325.5 }
  ],
  "breakdown": [
    { "type": "tier", "name": "全身像", "amount": 200 },
    { "type": "addon", "name": "表情差分 ×2", "amount": 30 },
    { "type": "addon", "name": "复杂背景", "amount": 80 },
    { "type": "usage", "name": "商用授权 ×1.5", "amount": 155 }
  ]
}
```

### 4.4 下单集成

现有 `POST /api/orders` 扩展 body：

```json
{
  "subdomain": "alice",
  "tierId": 3,
  "clientQq": "123456789",
  "addons": [{ "addonId": 1, "quantity": 2 }],
  "usageMultiplierId": 2,
  "rushMultiplierId": null,
  "agreeRules": true
}
```

下单时：
1. 调用 calculatePrice 逻辑算出总价
2. 写入 orders.total_price_cents
3. 写入 order_price_breakdown 明细
4. 按 workflow_stages.basis_points 生成 order_payment_installments

---

## 五、前端改动

### 5.1 画师后台 — 增项管理（新组件）

**文件**：`web/src/components/artist/AddonManager.vue`

**布局**：左右双列

```
┌─ 增项库（左）──────────┐   ┌─ 档位货架（右）─────────────────┐
│  ⠿ 表情差分  ¥15/个    │   │  📦 头像 ¥50                    │
│  ⠿ 服装替换  ¥40/个    │──→│     [表情差分] [服装替换]        │
│  ⠿ 复杂背景  +40%      │   │                                 │
│  ⠿ 武器道具  ¥50/个    │   │  📦 全身 ¥200                   │
│  ⠿ 小挂件    面议      │   │     [表情差分] [复杂背景] [武器] │
│                        │   │                                 │
│  ＋ 新建增项            │   └─────────────────────────────────┘
└────────────────────────┘
```

**交互**：
- 左列：vuedraggable 排序（复用 StageListView 的 handle 模式）
- 跨列拖拽：`group: { pull: 'clone', put: true }` 从库拖到货架
- 货架芯片点 ✕ 或拖回左列 → 解除关联
- 点击增项 → 展开内联编辑（名称/价格/模式/说明）
- 新建增项 → 底部输入框 + 弹窗配置

**技术**：vuedraggable（已安装），无需新依赖。

### 5.2 画师后台 — 倍率管理（新组件）

**文件**：`web/src/components/artist/MultiplierManager.vue`

简单列表 + 数字输入，分「用途」和「加急」两组。
不做拖拽，不做滑杆。

### 5.3 画师设置页集成

**文件**：`web/src/views/artist/Settings.vue`

新增两个 Tab：「增项管理」「倍率管理」。
现有 Tab 结构不动。

### 5.4 客户下单页

**文件**：`web/src/views/client/OrderForm.vue`

改动：
- 选完档位后，调 `GET /api/public/pricing/:subdomain` 加载增项
- 按 category 分组折叠展示
- quantity 模式 → el-input-number 步进器
- toggle 模式 → el-switch
- inquiry 模式 → 显示「面议」标签，不计入总价
- 底部实时总价栏（调 calculate-price 或前端本地算）
- 分期预览（读 workflow_stages 的 basis_points）

### 5.5 客户报价页（画师主页）

**文件**：`web/src/views/client/ArtistHome.vue`（及模板）

改动：
- 档位卡片下方展示适用增项（只读）
- 倍率信息展示（「商用 ×1.5」「加急 ×2」）
- 不需要交互，纯展示

---

## 六、实施顺序

| 阶段 | 内容 | 预计文件 |
|------|------|----------|
| **Phase 1** | 迁移 v8 + pricing.service.js + 路由 | init.js, pricing.service.js, pricing.routes.js |
| **Phase 2** | calculate-price 端点 + 下单集成 | order.service.js 改动, order.routes.js 改动 |
| **Phase 3** | 前端 AddonManager 拖拽组件 | AddonManager.vue, Settings.vue |
| **Phase 4** | 前端 MultiplierManager + 客户下单页 | MultiplierManager.vue, OrderForm.vue |
| **Phase 5** | 客户报价页展示 + 端到端测试 | ArtistHome.vue, 新测试文件 |

每个 Phase 完成后跑 `npm test` 确认无回归。

---

## 七、错误码（追加到 errors.js）

```js
// 增项
ADDON_NOT_FOUND: 'ADDON_NOT_FOUND',
ADDON_NAME_EMPTY: 'ADDON_NAME_EMPTY',
ADDON_INVALID_PRICE: 'ADDON_INVALID_PRICE',
ADDON_INVALID_MODE: 'ADDON_INVALID_MODE',
ADDON_MAX_QTY: 'ADDON_MAX_QTY',
ADDON_NOT_FOR_TIER: 'ADDON_NOT_FOR_TIER',

// 倍率
MULTIPLIER_NOT_FOUND: 'MULTIPLIER_NOT_FOUND',
MULTIPLIER_INVALID: 'MULTIPLIER_INVALID',

// 计算
PRICING_TIER_REQUIRED: 'PRICING_TIER_REQUIRED',
PRICING_CALC_FAILED: 'PRICING_CALC_FAILED',
```

对应 ERROR_MESSAGES 中文映射同步添加。

---

## 八、测试计划

| 测试文件 | 覆盖 |
|----------|------|
| `tests/pricing.service.test.js` | 计算公式（固定/百分比/倍率叠加/取最高） |
| `tests/pricing.routes.test.js` | CRUD + 权限 + 限流 |
| `tests/order.service.test.js`（扩展） | 下单时 breakdown 快照正确性 |

关键测试用例：
- 百分比增项基于基础价（不是小计）
- 多个用途倍率取最高
- 用途×加急相乘
- inquiry 模式不计价
- 增项不适用于当前档位时拒绝
- 下单后 price_breakdown 与 calculate 结果一致

---

## 九、不做的事（明确排除）

- ❌ 倍率滑杆（数字输入即可）
- ❌ 增项子选项/嵌套（第一版一个增项=一个价格）
- ❌ 每个档位单独定价增项（统一价格，关联表控制可见性）
- ❌ 百分比基数可选（锁死基础价）
- ❌ 客户端拖拽（客户用手机，点按+步进器）
- ❌ 多币种（只做人民币）

---

## 十、明天开工 Checklist

- [ ] 读一遍本文档
- [ ] Phase 1：写迁移 v8，跑 `npm test` 确认迁移不炸
- [ ] Phase 1：写 pricing.service.js（纯计算逻辑，先不碰路由）
- [ ] Phase 1：写 pricing.routes.js（CRUD 端点）
- [ ] Phase 1：跑测试
- [ ] Phase 2：calculate-price 端点
- [ ] Phase 2：改 order.service.js 下单流程集成 breakdown
- [ ] Phase 2：跑测试
- [ ] Phase 3-5：前端（可以另开一天）
