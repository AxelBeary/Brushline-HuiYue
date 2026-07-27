# 流程与比例 — 实施计划 v2.2

> 状态：设计已确认（v2.2），待开工
> 版本：v2.2 | 2026-07-27
> 位置：画师后台 → 设置 → 「流程与比例」Tab；管理员后台 → 默认模板 + 画师管理

### 版本演进

| 版本 | 核心变更 |
|------|---------|
| v1.0 | 两张表（流程库 + 收款计划）两个编辑器，拖拽吞并节点 |
| v2.0 | 单表，收款是节点属性；拖拽只调比例不增删；列表开关管增删 |
| v2.1 | 尾款 = 最后一个收款节点；Q弹拖离；管理员默认模板 + 画师管理；上限 20 期 |
| **v2.2** | 默认模板加「定稿」首步（7 节点）；流程全览条复用到客户下单页；管理员抽屉含作品管理 |

---

## 一、核心概念

```
流程节点（Stage）          画师工作流的步骤：定稿、排期、草稿、线稿、上色、完稿、交付……
                           自由增删、改名、拖拽排序。
        │
        │  子集关系：打开"收款"开关的节点
        ▼
收款节点（Milestone）      出现在比例条上，有百分比。
                           可以只有 1 期（全款），也可以最多 20 期。
        │
        │  最后一个收款节点（按列表顺序）
        ▼
尾款节点                   比例自动计算 = 100% − 其他收款段之和。
                           收款开关锁定，不可关闭、不可删除。
```

**一句话：列表管"有哪些步骤"，比例条管"哪些步骤收钱、各收多少"，尾款是最后一个收款节点。**

### 真实场景

```
场景 A — 定金即全款（1 期）：
  列表：定稿 → 排期确认💰100%🔒 → 草稿 → 线稿 → 上色 → 完稿 → 交付
  条：  ┌─────────────────────────────────────────────┐
        │           排期确认 100% 🔒                    │
        └─────────────────────────────────────────────┘

场景 B — 草稿后全款（1 期，尾款不在列表末尾）：
  列表：定稿 → 排期确认 → 草稿确认💰100%🔒 → 线稿 → 上色 → 完稿 → 交付
  条：  ┌─────────────────────────────────────────────┐
        │           草稿确认 100% 🔒                    │
        └─────────────────────────────────────────────┘

场景 C — 经典两期（默认模板）：
  列表：定稿 → 排期确认💰30% → 草稿 → 线稿 → 上色 → 完稿 → 交付💰70%🔒
  条：  ┌──────────────┬──────────────────────────────┐
        │ 排期确认 30% │ 交付 70%                🔒   │
        └──────────────┴──────────────────────────────┘

场景 D — 期期都收：
  列表：定稿 → 排期💰10% → 草稿💰15% → 线稿💰20% → 上色💰25% → 完稿💰30%🔒 → 交付
  条：  ┌─────┬──────┬──────┬──────┬───────┬───────────────┐
        │排期 │草稿  │线稿  │上色  │完稿   │交付 30%  🔒   │
        │10%  │15%   │20%   │25%   │30%    │               │
        └─────┴──────┴──────┴──────┴───────┴───────────────┘
```

> 注意场景 A/B：尾款不在列表末尾。尾款之后可以有纯流程步骤，它们不上比例条，只在下方流程全览中显示。

---

## 二、产品规则

### 流程节点（列表）

| # | 规则 |
|---|------|
| R1 | 流程节点自由管理：任意添加、删除、改名、拖拽排序 |
| R2 | 列表至少保留 1 个节点；**最后一项不可删除** |
| R3 | 新节点插入到**列表末尾之前**（即倒数第二位）；想放最后就自己拖 |
| R4 | 拖拽排序自由，任何节点都可以成为列表末项（末项只是流程终点，不自动成为尾款） |

### 收款节点（比例条）

| # | 规则 |
|---|------|
| R5 | 收款节点是流程节点的子集——每个节点一个独立的「收款」开关 |
| R6 | **尾款 = 最后一个收款节点**（按列表 sort_order），其比例自动计算 = 10000 − Σ其他收款段 |
| R7 | 尾款收款开关锁定开启（🔒），不可关闭、不可删除 |
| R8 | 至少保留 1 个收款节点（即尾款永远存在） |
| R9 | 关闭非尾款节点的收款开关 = 从比例条移除，节点保留在列表；其比例自动并入尾款 |
| R10 | 期数 1~20 期；开启第 21 期时拒绝并提示 |
| R11 | 单期最低 5%（500 基点），尾款段同样 ≥ 5% |
| R12 | 比例用整数基点：1500 = 15%，10000 = 100% |
| R13 | 新开启收款的节点默认 10%（1000 基点），从尾款段扣除；尾款让不出 10% 则以 5% 开启；连 5% 都让不出则拒绝 |

### 交互规则

| # | 规则 |
|---|------|
| R14 | 比例条拖拽**只挤压手柄左右相邻两段**，手柄到 5% 边界进入 Q弹阻力区（见 §6.2） |
| R15 | Q弹拖离：在阻力区继续拖拽超过脱离阈值 → 松手后该节点移除收款（等同关开关）；未超阈值 → 弹回 5% |
| R16 | 尾款段不可拖离（🔒），其左侧手柄可拖但尾款不低于 5% |
| R17 | 手动输入某段比例时，差值由**尾款段吸收**；导致尾款 < 5% 时拒绝并回滚 |
| R18 | 拖拽吸附到 0.5%（50 基点）步进 |
| R19 | 删除收款节点前弹确认，展示"其 X% 将并入尾款" |

### 保存语义

| # | 规则 |
|---|------|
| R20 | 增删节点、改名、拖拽列表排序、切换收款开关 → **即时保存**（每步原子安全） |
| R21 | 拖拽比例条手柄 / 手动输入比例 → **本地预览 + 显式 [保存比例] 按钮** |
| R22 | 执行即时保存操作时，若有未保存的比例变更，**自动先保存比例再执行**（无需弹窗确认） |
| R23 | 有未保存变更时，[保存比例] 按钮高亮 + 离开页面拦截（beforeunload） |

### 与订单的关系

| # | 规则 |
|---|------|
| R24 | 历史订单独立快照：订单确认报价时复制收款计划，之后改模板不影响旧订单 |
| R25 | 收款节点 ≠ 订单状态，两者独立（不替换现有状态机） |
| R26 | 订单快照的 label 是确认时的名称副本，不随流程节点改名联动 |

---

## 三、数据模型

### 表 A：`artist_workflow_stages`（流程节点，单表）

```sql
CREATE TABLE IF NOT EXISTS artist_workflow_stages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id     INTEGER NOT NULL,
  name          TEXT    NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  takes_payment INTEGER NOT NULL DEFAULT 0,   -- 0=纯流程 1=收款节点
  basis_points  INTEGER,                      -- takes_payment=0 时为 NULL
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ws_artist ON artist_workflow_stages(artist_id, sort_order);
```

**设计要点：**
- ❌ 无 `is_builtin`——种子只是初始值，画师可任意修改
- ❌ 无 `is_final`——尾款 = `takes_payment=1` 中 `sort_order` 最大者，读取时计算
- ❌ 无独立 `artist_payment_schedule` 表——收款是节点属性
- ✅ 尾款节点的 `basis_points` 也存储（service 层写入时重算），`SELECT *` 即可完整渲染

### 表 B：`default_workflow_template`（管理员配置的新画师默认模板）

```sql
CREATE TABLE IF NOT EXISTS default_workflow_template (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  takes_payment INTEGER NOT NULL DEFAULT 0,
  basis_points  INTEGER
);
```

> 无 `artist_id`——全局唯一模板。管理员编辑此表，新画师注册时从这里复制。

### 表 C：`order_payment_installments`（订单快照，Phase 2 启用，Phase 1 仅建表）

```sql
CREATE TABLE IF NOT EXISTS order_payment_installments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL,
  label         TEXT    NOT NULL,              -- 确认时的名称副本（R26）
  basis_points  INTEGER NOT NULL,
  amount_cents  INTEGER,                       -- 整数"分"，不用 REAL
  status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','overdue')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  requested_at  DATETIME,
  paid_at       DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### 服务层不变式（每次写入在事务内强制）

```
I1. 至少 1 个收款节点存在
I2. 尾款（最后一个收款节点）takes_payment = 1 且 basis_points = 10000 − Σ其他
I3. 所有收款节点 basis_points ≥ 500
I4. 收款节点数量 ∈ [1, 20]
```

任何操作违反 I1~I4 → 事务回滚 + 422 + 具体错误信息。

### 默认种子（写入 `default_workflow_template`，7 节点）

| name | sort_order | takes_payment | basis_points | 说明 |
|------|-----------|---------------|--------------|------|
| 定稿 | 1 | 0 | NULL | 双方确认稿件需求与规格 |
| 排期确认 | 2 | 1 | 3000 | 确认排期，收取定金 30% |
| 草稿确认 | 3 | 0 | NULL | |
| 线稿确认 | 4 | 0 | NULL | |
| 上色确认 | 5 | 0 | NULL | |
| 完稿确认 | 6 | 0 | NULL | |
| 交付 | 7 | 1 | 7000 | 交付成品，收取尾款 70% |

> 管理员可在后台修改此模板。修改后只影响**新画师**，已有画师不受影响。

### 迁移 v4（`init.js` MIGRATIONS 追加）

```js
{
  version: 4,
  name: 'workflow_stages_and_default_template',
  up(database) {
    // 1. 建表
    database.exec(`CREATE TABLE IF NOT EXISTS artist_workflow_stages (...)`)
    database.exec(`CREATE INDEX IF NOT EXISTS idx_ws_artist ...`)
    database.exec(`CREATE TABLE IF NOT EXISTS default_workflow_template (...)`)
    database.exec(`CREATE TABLE IF NOT EXISTS order_payment_installments (...)`)

    // 2. 初始化默认模板（幂等，7 行）
    const tplCount = database.prepare('SELECT COUNT(*) AS c FROM default_workflow_template').get().c
    if (tplCount === 0) seedDefaultTemplate(database)

    // 3. ⚠️ 存量画师补种子（幂等：有数据就跳过）
    const artists = database.prepare('SELECT id FROM artists').all()
    for (const a of artists) {
      const count = database.prepare(
        'SELECT COUNT(*) AS c FROM artist_workflow_stages WHERE artist_id = ?'
      ).get(a.id).c
      if (count === 0) copyTemplateToArtist(database, a.id)
    }
  }
}
```

---

## 四、API 设计

### 画师后台（Bearer Token，归属校验 `req.artist.id`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/artist/workflow` | 流程节点列表（含计算字段 `isFinal`） |
| POST | `/api/artist/workflow` | 添加节点（插入到倒数第二位，R3） |
| PUT | `/api/artist/workflow/:id` | 改名 / 改描述 / 切换收款开关 |
| DELETE | `/api/artist/workflow/:id` | 删除节点（尾款拒绝 R7；收款节点比例并入尾款 R19） |
| PUT | `/api/artist/workflow/reorder` | 拖拽排序（尾款可能易主，自动重算 R6） |
| PUT | `/api/artist/workflow/payment` | 批量保存比例（比例条 [保存比例] 按钮） |

**GET 响应**（`isFinal` 由后端计算）：

```json
{
  "stages": [
    { "id": 1, "name": "定稿", "sortOrder": 1,
      "takesPayment": false, "basisPoints": null, "isFinal": false },
    { "id": 2, "name": "排期确认", "sortOrder": 2,
      "takesPayment": true,  "basisPoints": 3000, "isFinal": false },
    { "id": 3, "name": "草稿确认", "sortOrder": 3,
      "takesPayment": false, "basisPoints": null, "isFinal": false },
    { "id": 7, "name": "交付", "sortOrder": 7,
      "takesPayment": true,  "basisPoints": 7000, "isFinal": true }
  ]
}
```

**PUT /payment 请求体**（只含非尾款段，尾款由后端重算）：

```json
{
  "nodes": [
    { "id": 2, "basisPoints": 1500 }
  ]
}
```

**PUT /:id 切换收款开关**（服务端原子完成）：
- 开 → 默认 1000 基点从尾款扣除；不足则 500；再不足拒绝（R13）；超 20 期拒绝（R10）
- 关 → 比例并入尾款（R9）；若该节点是尾款 → 拒绝（R7）

**所有写入路由**：Fastify JSON Schema，`additionalProperties: false`。

### 公开接口（客户端，速率限制 30 次/分）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/artists/:subdomain/workflow` | 公开流程 + 收款计划（下单页 + 主页复用） |

> 此接口同时服务于：ArtistHome 时间线展示、OrderForm 下单流程预览、TrackOrder 进度参照。

### 管理员接口（ADMIN 权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/default-workflow` | 获取默认模板 |
| PUT | `/api/admin/default-workflow` | 整体更新默认模板（接收完整数组） |
| POST | `/api/admin/default-workflow/reset` | 重置为系统出厂种子（7 节点） |
| GET | `/api/admin/artists/:id/workflow` | 查看指定画师的流程与比例 |
| POST | `/api/admin/artists/:id/workflow` | 为画师添加节点 |
| PUT | `/api/admin/artists/:id/workflow/:sid` | 编辑画师节点（改名/开关） |
| DELETE | `/api/admin/artists/:id/workflow/:sid` | 删除画师节点 |
| PUT | `/api/admin/artists/:id/workflow/reorder` | 画师节点排序 |
| PUT | `/api/admin/artists/:id/workflow/payment` | 画师比例保存 |

> 管理员路由复用同一套 service 函数，仅鉴权不同（`requireAdmin` vs `requireAuth`）。

### 订单快照接口（Phase 2，本期仅建表）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/artist/orders/:id/payment-snapshot` | 确认报价时生成快照 |
| GET | `/api/artist/orders/:id/installments` | 查看订单收款进度 |
| PUT | `/api/artist/orders/:id/installments/:iid` | 标记某期已收款 |

---

## 五、前端组件树

```
Settings.vue（画师后台）
├── Tab: 基本资料（现有）
├── Tab: 价格档位（现有）
├── Tab: 作品管理（现有）
├── Tab: 约稿须知（现有）
├── Tab: 联系QQ（现有）
└── Tab: 流程与比例 ← 新增
    └── WorkflowPaymentEditor.vue      ← 本 Tab 唯一容器（管理员复用）
        │
        ├── StageListView.vue          ← 上半：可拖拽流程列表
        │   ├── vuedraggable 竖排列表，⠿ 图标为拖拽柄
        │   ├── 每行：⠿ ｜ 名称（点击内联编辑）｜ 说明（小字）
        │   │        ｜ [收款] el-switch + 比例 badge ｜ 删除按钮
        │   ├── 尾款行：🔒 尾款标记，switch 禁用常开，
        │   │          比例 badge 显示「自动」
        │   ├── 删除用 el-popconfirm；收款节点额外提示
        │   │   「其 X% 将并入尾款」
        │   └── 底部 [＋ 添加流程节点] → 内联输入框，Enter 提交
        │
        ├── PaymentBar.vue             ← 下半：收款比例条
        │   ├── 色块段：宽度 = basisPoints / 10000
        │   │   每段显示「节点名 + 本期 XX%」
        │   ├── 段间拖拽手柄（pointer events，非 vuedraggable）
        │   │   8px 热区（视觉 2px 线），拖动吸附 0.5% 步进
        │   ├── 尾款段：🔒 + 自动计算值，无右侧手柄，
        │   │          斜纹底 / 锁图标区分
        │   ├── Q弹拖离：低于 5% 进入弹性阻力区，
        │   │          超脱离阈值后松手 = 移除收款（见 §6.2）
        │   ├── 点击非尾款段的百分比 → el-input-number 内联输入
        │   │   步进 0.5%，blur/Enter 确认，差值由尾款吸收
        │   ├── 底部累计标尺 0% ─── 100%
        │   └── [保存比例] 按钮 + 未保存脏状态指示
        │
        └── WorkflowOverviewStrip.vue  ← 底部：流程全览（只读参考）
            ├── 水平排列所有流程节点（含非收款节点）
            ├── 收款节点：高亮 + 💰 标记
            ├── 非收款节点：灰色/虚线样式
            ├── 尾款节点：🔒 标记
            └── 作用：让画师看到收款节点在整体流程中的位置

OrderForm.vue（客户下单页）← 复用 WorkflowOverviewStrip
├── 现有：档位选择 / 描述 / QQ / 参考图
└── 新增：WorkflowOverviewStrip（只读，展示该画师的流程）
    ├── 数据源：GET /api/artists/:subdomain/workflow（已有公开接口）
    ├── 样式：紧凑水平条，收款节点显示比例
    └── 作用：客户下单前了解"这个画师的工作流程是什么、分几次付款"

ArtistHome.vue（公开主页）
└── PaymentPlanTimeline.vue ← 新增：只读垂直时间线
    ├── 全部流程节点按序列出
    ├── 收款节点：高亮 + 比例 badge（Phase 2 加金额）
    ├── 非收款节点：普通样式
    └── 尾款节点：🔒「尾款 · 结算剩余款项」

AdminPanel.vue（管理员后台）
├── 现有：画师列表 / 全局统计
├── 新增：默认流程模板 ← DefaultWorkflowEditor.vue
│   ├── 复用 WorkflowPaymentEditor 组件（artistId=null → admin API）
│   ├── 保存到 default_workflow_template
│   ├── [重置为出厂默认] 按钮（恢复 7 节点出厂种子）
│   └── 提示：「修改后仅影响新注册画师」
└── 新增：画师详情抽屉 ← ArtistDetailDrawer.vue
    ├── 点击画师列表某行 → 右侧抽屉
    ├── Tab: 基本资料（可编辑）
    ├── Tab: 价格档位（可编辑）
    ├── Tab: 作品管理（可编辑，含图片上传）
    ├── Tab: 流程与比例 ← 复用 WorkflowPaymentEditor（传入 artistId）
    └── Tab: 约稿须知（可编辑）
```

**组件复用**：`WorkflowPaymentEditor` 接收 `artistId` prop。画师后台传自己的 id，管理员传目标画师 id，默认模板编辑器传 `null`（走 admin default-workflow API）。

**WorkflowOverviewStrip 复用**：接收 `stages` 数组 prop（从公开接口获取），纯展示组件，无编辑能力。用于画师设置页底部参考 + 客户下单页流程预览 + 客户主页时间线（垂直变体）。

---

## 六、比例条交互规格

### 6.1 视觉结构

```
比例条（只显示收款节点）：
0%                                                          100%
├──────────────┬────────────────────────────────────────────┤
│ 排期确认 30% │ 交付 70%                              🔒   │
├──────────────┴────────────────────────────────────────────┤
●30%           ●100%

流程全览（所有节点，只读参考，在条下方）：
[定稿] → [排期确认💰] → [草稿确认] → [线稿确认] → [上色确认] → [完稿确认] → [交付💰🔒]
```

- 色块数量 = 收款节点数量（1~20），非收款节点不上条
- 色块顺序 = 列表顺序
- 段间竖线 = 拖拽手柄；尾款段右端无手柄

### 6.2 Q弹拖离（核心交互）

```
正常区间              弹性阻力区           脱离区
├─────────────────────┼───────────────────┼──────────┤
5%                  3%                  1%         0%
│← 正常拖拽，1:1 →│← 阻力 0.3x，视觉 →│← 松手移除 →│
│   吸附 0.5% 步进  │   渐淡 + 提示文字  │  节点脱离  │
│                   │   "继续拖拽移除"   │  比例归尾款│
│                   │                   │            │
│              松手 → 弹回 5%           │  松手 → 移除│
```

**详细行为：**

1. `pointerdown` 手柄 → 记录起始 X 与左段基点，`setPointerCapture`
2. `pointermove`：
   - 目标基点 ≥ 500 → 正常模式，1:1 映射，吸附 50 基点步进
   - 目标基点 < 500 → **弹性模式**：
     - 视觉宽度 = `500 - (500 - target) × 0.3`（阻力系数 0.3，越拖越慢）
     - 色块渐淡（opacity 从 1.0 → 0.4）
     - 色块内文字变为「松手移除「XX」」
     - 在 5% 边界处触发一次轻微 CSS 震动动画（`@keyframes nudge`）
   - 目标基点 < 150（脱离阈值）→ **脱离就绪**：
     - 色块变为虚线轮廓 + 红色调
     - 文字变为「松手确认移除」
3. `pointerup`：
   - 正常模式 → 应用新基点，进入脏状态
   - 弹性模式（未达脱离阈值）→ **弹回动画**（spring，300ms）回到 500 基点
   - 脱离就绪 → **移除收款**：`takes_payment = false`，基点并入尾款，显示 undo toast
4. 尾款段左侧手柄：可拖，但尾款基点 ≥ 500 硬限制，**无弹性区、无脱离**（🔒）

**undo toast**：「已移除「XX」收款节点，其 X% 已并入尾款。[撤销]」，5 秒自动消失。撤销 = 重新开启收款（基点恢复原值，从尾款扣回）。

### 6.3 手动输入

1. 点击非尾款段内「本期 XX%」→ 变为 `el-input-number`
2. 确认时：该段设为输入值，**差值由尾款段吸收**（R17）
3. 尾款将低于 5% → 拒绝，toast「尾款不能低于 5%」，回滚
4. 尾款段不可输入（点击无反应，仅展示 🔒 + 自动值）

### 6.4 键盘可访问性

- 手柄可 Tab 聚焦，`←`/`→` 调整 50 基点，`Shift+←/→` 调整 500 基点
- 与拖拽共用同一 clamp 逻辑（5% 硬限制，无键盘脱离——脱离仅通过拖拽手势）

### 6.5 保存语义（R20~R23）

| 操作 | 保存方式 |
|------|---------|
| 添加/删除/改名节点、列表排序 | 即时 API |
| 切换收款开关 | 即时 API（若有未保存比例，先自动保存比例） |
| 拖拽手柄 / 输入比例 | 本地状态 + [保存比例] 按钮 |
| 离开页面（有未保存变更） | beforeunload 拦截 |

---

## 七、管理员功能

### 7.1 默认流程模板

- 管理员后台新增「默认流程模板」入口
- 复用 `WorkflowPaymentEditor` 组件（`artistId=null` → 走 `/api/admin/default-workflow`）
- 可增删节点、调比例、开关收款——与画师编辑器体验一致
- [重置为出厂默认] 按钮 → `POST /api/admin/default-workflow/reset`（恢复 7 节点出厂种子）
- 页面提示：「修改后仅影响新注册画师，已有画师不受影响」

### 7.2 画师全设置管理

- 管理员画师列表每行新增 [管理] 按钮 → 打开 `ArtistDetailDrawer`
- 抽屉内 Tab 页：基本资料 / 价格档位 / **作品管理** / **流程与比例** / 约稿须知
- 流程与比例 Tab 复用 `WorkflowPaymentEditor`（传入目标 `artistId`）
- 作品管理 Tab 复用现有作品上传组件（管理员可代画师上传/删除作品图）
- 管理员可执行画师能做的所有操作
- 所有操作走 `/api/admin/artists/:id/*` 路由

### 7.3 新画师初始化流程

```
createArtist()
  → INSERT artists
  → INSERT commission_rules（现有逻辑）
  → 读取 default_workflow_template 全部行（7 行）
  → 逐行 INSERT artist_workflow_stages（复制 name/sort_order/takes_payment/basis_points）
  → 完成
```

---

## 八、实施任务拆分

### Phase 1A：后端（预计 4~5 小时）

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|---------|---------|
| 1A-1 | 迁移 v4：建三表 + 默认模板种子（7 行）+ 存量画师补种子 | `server/src/db/init.js` | 老库重启后三表存在，alice/bob 各有 7 节点种子；模板表有 7 行 |
| 1A-2 | workflow service：CRUD + 不变式 I1~I4 + 尾款重算 + 开关/排序/删除的原子操作 | `server/src/features/artist/workflow.service.js`（新） | TC-W-01~19 全过 |
| 1A-3 | workflow 路由 + JSON Schema（画师端 6 个接口） | `server/src/features/artist/artist.routes.js` | curl 验证，非法请求 422 |
| 1A-4 | 公开接口 + 速率限制 | `server/src/features/artist/artist.routes.js` | 未认证可访问，限流生效 |
| 1A-5 | createArtist 接入模板复制 | `server/src/features/artist/artist.service.js` | 新画师自带 7 节点 |
| 1A-6 | 管理员路由：默认模板 CRUD + 画师 workflow 代理 + 画师作品/资料代理 | `server/src/features/admin/admin.routes.js` | 管理员可查看/编辑任意画师全部设置 |
| 1A-7 | 默认模板重置逻辑 | `server/src/features/admin/admin.service.js` | reset 后恢复出厂 7 行 |

### Phase 1B：前端（预计 14~18 小时）

| # | 任务 | 涉及文件 | 验收标准 |
|---|------|---------|---------|
| 1B-1 | Settings 新 Tab 骨架 | `web/src/views/artist/Settings.vue` | Tab 可切换，i18n 键就位 |
| 1B-2 | StageListView（vuedraggable + 开关 + 内联编辑 + popconfirm） | `web/src/components/artist/StageListView.vue`（新） | 增删改排全流程，尾款行锁定 |
| 1B-3 | PaymentBar 核心（pointer 拖拽 + Q弹阻力 + 脱离手势 + clamp + 吸附 + 尾款自动 + 键盘） | `web/src/components/artist/PaymentBar.vue`（新） | 拖拽/弹性/脱离/输入/边界/键盘全通 |
| 1B-4 | WorkflowOverviewStrip（流程全览只读条，水平 + 垂直两种布局） | `web/src/components/shared/WorkflowOverviewStrip.vue`（新） | 收款/非收款/尾款区分显示，响应式 |
| 1B-5 | WorkflowPaymentEditor 组装 + API 层 + 脏状态 + 自动保存逻辑（R22） | `web/src/components/artist/WorkflowPaymentEditor.vue`（新）、`web/src/api/index.js` | 开关即时生效，比例显式保存，切换时自动先存比例 |
| 1B-6 | 客户下单页集成 WorkflowOverviewStrip | `web/src/views/client/OrderForm.vue` | 下单时展示画师流程 + 收款计划 |
| 1B-7 | 公开主页时间线 | `web/src/views/client/ArtistHome.vue`、`PaymentPlanTimeline.vue`（新） | 收款/非收款/尾款区分展示 |
| 1B-8 | 管理员：默认模板编辑器 | `web/src/views/admin/DefaultWorkflowEditor.vue`（新） | 复用 WorkflowPaymentEditor，保存到模板表 |
| 1B-9 | 管理员：画师详情抽屉（5 Tab 含作品管理） | `web/src/views/admin/ArtistDetailDrawer.vue`（新） | 全部设置可编辑，作品可上传/删除 |
| 1B-10 | i18n（中英各 ~35 条）+ 暗色主题 CSS 变量适配 | `web/src/locales/*.js`、各新组件 | 两种语言、两种主题无硬编码 |

> ⏱️ PaymentBar 的 Q弹拖离是纯 pointer events 实现（vuedraggable 做不了），含弹性动画 + 脱离判定 + undo，单独估 6~8 小时。

### Phase 1C：验证（预计 2~3 小时）

| # | 任务 | 验收标准 |
|---|------|---------|
| 1C-1 | TDD 用例 TC-W-01~19（见 §九） | `npm test` 全绿 |
| 1C-2 | 集成测试脚本 | 全部接口（含管理员）curl 通过 |
| 1C-3 | 手动边界测试 | 1 期/20 期/5% 下限/尾款锁定/Q弹脱离/弹回/排序换尾款/管理员编辑画师/下单页流程展示 |

### Phase 2（后续）：订单收款快照

| # | 任务 | 说明 |
|---|------|------|
| 2-1 | 订单确认时生成快照 | 复制当前模板 → order_payment_installments（label 冻结，R26） |
| 2-2 | 画师标记收款 | PUT installments/:id status=paid |
| 2-3 | 客户查单页展示 | 「下一笔待支付：定稿确认 ¥XXX」 |
| 2-4 | 计价器联动 | 算价结果底部展示分期明细（金额用整数分） |

---

## 九、TDD 用例规格

追加到 `docs/tdd-spec-v0.1.md`：

| 编号 | 用例 | 断言要点 |
|------|------|---------|
| TC-W-01 | 新画师从模板初始化 | 节点数 = 7，定稿 sort_order=1 无收款，排期确认 3000，交付 7000 且 isFinal |
| TC-W-02 | 添加节点 | 插入到倒数第二位（sort_order 在尾款之前） |
| TC-W-03 | 删除尾款节点 | 拒绝，错误含「尾款」 |
| TC-W-04 | 删除收款节点（非尾款） | 节点消失，其基点并入尾款，总和仍 10000 |
| TC-W-05 | 开启收款（尾款充足） | 新节点 1000，尾款 −1000 |
| TC-W-06 | 开启收款（尾款仅让出 500） | 新节点 500，尾款保持 500 |
| TC-W-07 | 开启收款（尾款 < 500） | 拒绝 |
| TC-W-08 | 开启第 21 期 | 拒绝，错误含「最多 20 期」 |
| TC-W-09 | 关闭收款（非尾款） | takes_payment=0，基点并入尾款 |
| TC-W-10 | 关闭尾款收款 | 拒绝 |
| TC-W-11 | 批量保存比例 | 尾款重算，总和恒 10000 |
| TC-W-12 | 单期 < 500 | 拒绝 |
| TC-W-13 | reorder 使收款节点成为最后收款节点 | 新尾款 isFinal=true 且基点重算，原尾款保留比例 |
| TC-W-14 | 改名后 GET | 返回新名（模板是活的） |
| TC-W-15 | 存量画师迁移 | 迁移后老画师有完整 7 节点种子，重启不重复插入 |
| TC-W-16 | 管理员编辑画师 workflow | 与画师自操作结果一致 |
| TC-W-17 | 默认模板 CRUD + reset | 修改后新画师用新模板；reset 后恢复出厂 7 行 |
| TC-W-18 | 定金即全款（1 期 100%） | 唯一收款节点 isFinal=true，basisPoints=10000 |
| TC-W-19 | 尾款不在列表末尾 | 尾款后有非收款节点，isFinal 正确，公开接口正确 |

---

## 十、不做的事（明确排除）

- ❌ 不替换现有订单状态机（pending/confirmed/wip/...）
- ❌ 不做拖拽吞并节点（v1.0 的 R7，已被 Q弹拖离 + 列表开关取代）
- ❌ 不做 NodePickerPopover（列表开关即选择器）
- ❌ 不做自动催款/提醒、不做在线支付集成
- ❌ 不做节点库的跨画师共享/模板市场
- ❌ 不做流程节点的启用/停用三态（删除即够）
- ❌ 不在第一阶段做订单进度与流程节点的映射
- ❌ 不做键盘脱离手势（脱离仅通过拖拽，键盘只调比例）

---

## 十一、依赖与前置

- 计价器（license_tiers + addon_services）是独立任务，与本计划无代码依赖
- 计价器的「算价结果展示分期」会引用本计划的公开接口，但计价器不阻塞本计划
- 本计划不阻塞 QQ Bot（Phase 2 主线）
- 管理员画师详情抽屉（1B-9）可独立于比例条（1B-3）开发，不互相阻塞
- WorkflowOverviewStrip（1B-4）是纯展示组件，可最先开发，被 1B-5/1B-6/1B-7 依赖

---

## 十二、开工前检查清单

- [ ] 迁移 v4 含三表 + 默认模板种子（7 行）+ 存量画师补种子（幂等）
- [ ] 服务层不变式 I1~I4 在**每个**写操作中事务化强制
- [ ] 所有写入路由有 Fastify JSON Schema（additionalProperties: false）
- [ ] 公开 workflow 接口纳入速率限制
- [ ] 管理员路由复用 service 层，不重复写 SQL
- [ ] 管理员画师详情含 5 个 Tab（基本资料/价格档位/作品管理/流程与比例/约稿须知）
- [ ] WorkflowOverviewStrip 支持水平（设置页/下单页）和垂直（主页时间线）两种布局
- [ ] 新组件全部使用 CSS 变量（无硬编码颜色），暗色主题适配
- [ ] zh-CN.js / en.js 各新增 ~35 条语言包键
- [ ] TC-W-01~19 先写测试再写实现
- [ ] WorkflowPaymentEditor 组件支持 artistId prop（画师/管理员/模板三态复用）
- [ ] 更新 开发自参考.md（新表、新 API、新组件、注意事项）
- [ ] 更新 画师使用说明书.md（流程与比例 Tab 的使用说明）
- [ ] 更新 维护说明书.md（管理员默认模板 + 画师管理操作说明）
