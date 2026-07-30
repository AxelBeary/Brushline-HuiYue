# SPEC-004：名额与缓冲系统（R28）

> **编号**：SPEC-004
> **作者**：四号（需求整理）
> **日期**：2026-07-31
> **状态**：待一号审核
> **关联需求**：REQ-006 R28 / v0.17 规划草案 P1
> **用户交流记录**：2026-07-31，四号与用户三轮交流，全部决策已拍板

---

## 1. 问题定义

画师开一批约稿时，想设定"这批接 N 单"。现有系统只有 open/full/break 三态，无法表达"还剩几个名额"，也无法处理"满了但有人想排队"的场景。

用户原声：
> "没有一个总接单数功能，他们想要设置这批开多少个。"
> "有的画师一次只接三张，但是会想排几十个位置。"

---

## 2. 核心模型

### 两个数

画师在设置页配置：
- **正式位 N**（`batch_limit`）：正式接单的容量。允许设为 0（申请制模式，所有订单先进缓冲区）
- **缓冲位 M**（`buffer_limit`）：排队候补的容量

**校验**：N + M ≥ 1（两个都是 0 等于不接单，应直接切 full）

### 两条规则

**规则一：内部递补 = 自动（受开关控制）**

正式区空出一个位（完成/取消/画师调大 N），缓冲区第一名递补进正式区。

- "自动递补"开关**关**（默认）：空位保留，画师在看板缓冲区手动点"递补"
- "自动递补"开关**开**：空位瞬间，缓冲区第一名自动递补 + 通知客户

**规则二：外部接单 = 画师控制**

新客户能不能下单，**只看画师状态**，不看有没有空位：
- status = open → 能下单（只要总数 < N + M）
- status = full → 不能下单，哪怕有空位

完成一单、取消一单、递补一个人——**都不改变画师状态**。画师必须手动切回 open 才重新接单。

### 订单分区

每个订单有一个 `queue_zone` 字段：
- `formal`：正式区
- `buffer`：缓冲区

客户下单时：正式数 < N → `formal`；正式数 ≥ N 且缓冲数 < M → `buffer`；否则拒绝（"已接满"）。

**pending 就占位**（用户拍板）。confirmed/wip/revision 都算正式区在途。delivered/cancelled 释放名额。

---

## 3. 客户主页显示

| 条件 | 显示 |
|------|------|
| status=open，正式 < N | "开放中 · 剩 X 席" |
| status=open，正式 ≥ N，缓冲 < M | "可候补" |
| status=open，正式 ≥ N，缓冲 ≥ M | "已接满" |
| status=full，有在途订单 | "已接满" |
| status=full，全部交稿 | "暂停接单" |
| status=break | "休息中" |

**N=0（申请制）**：正式永远"满"（0/0），客户主页永远显示"可候补"（只要缓冲没满）。画师从缓冲区手动挑人递补进正式区。

**部分模板加小字**（用户拍板 C40）：状态徽章旁显示名额信息，部分模板风格可在下方加一行小字（如"正式 3/3 · 候补 12 人"），由二号按模板风格定。

---

## 4. 画师设置页

### 新增字段

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `batch_limit` | INTEGER | NULL | 正式位 N。NULL = 不限制（现有行为） |
| `buffer_limit` | INTEGER | 0 | 缓冲位 M |
| `auto_promote` | INTEGER | 0 | 自动递补开关 |
| `hide_queue_position` | INTEGER | 0 | 不显示排队位次 |
| `hide_promote_notify` | INTEGER | 0 | 不显示递补通知 |
| `buffer_short_form` | INTEGER | 0 | 缓冲区简短表单 |

**`batch_limit = NULL` 的兼容**：不设置名额时（NULL），行为与现在完全一致——open 无限接单，不显示名额信息。只有画师主动设了 N 才启用名额系统。

### 设置页 UI

在"接单状态"区域下方新增"名额设置"卡片：
- 正式位 N：数字输入（0~999），placeholder "不限制"
- 缓冲位 M：数字输入（0~999）
- 三个开关（自动递补 / 不显示位次 / 不显示递补通知）
- 一个表单开关（缓冲区简短表单）
- 实时预览："客户将看到：开放中 · 剩 3 席"

---

## 5. 看板缓冲区

### 看板滑块

看板顶部新增切换：

```
[ 📋 正式排期 (3/3) ]  [ 🕐 缓冲区 (12) ]
```

- 点"正式排期"：现有看板（拖拽排序、焦点图、操作按钮）
- 点"缓冲区"：缓冲列表，每条显示：客户名/QQ/档位/下单时间/排队位次
- 缓冲区每条有"递补"按钮 → 该订单 `queue_zone` 变 `formal`，排到正式队列末尾
- 缓冲区每条有"移除"按钮 → 取消该订单（画师主动清理）
- 缓冲区支持拖拽排序（调整排队顺序）

### 仪表盘概览卡

仪表盘新增"名额概览"卡片（仅 `batch_limit` 非 NULL 时显示）：
- 正式 X/N · 缓冲 Y/M
- 下一位候补：张三（QQ: 12345）
- 点击跳转看板缓冲区视图

---

## 6. 客户侧交互

### 下单流程

客户点"约稿"时：
1. 正式 < N → 正常下单，`queue_zone = formal`
2. 正式 ≥ N，缓冲 < M → 下单成功，`queue_zone = buffer`
   - `buffer_short_form` 关：填完整表单（和正式一样）
   - `buffer_short_form` 开：只需填简短文字 + QQ + 选款
3. 正式 ≥ N，缓冲 ≥ M → 拒绝，显示"已接满"

### 缓冲客户看到的

- 进度页/主页：
  - `hide_queue_position` 关（默认）："排队中（第 X 位）"
  - `hide_queue_position` 开："排队中"
- 递补后：
  - `hide_promote_notify` 关（默认）：通知"你排到正式位了"（站内 + QQ 等机器人上线后接入）
  - `hide_promote_notify` 开：静默递补

### 缓冲客户可自行取消

缓冲区的客户可以在进度页取消自己的订单（反正没付定金）。取消后队列顺移（后面的人位次 -1，静默处理，不发通知）。

### 缓冲期间不付定金

缓冲区的订单**不生成付款节点**。递补进正式区后，按下单时的报价快照生成付款节点（价格锁定，不受后续涨价影响）。

---

## 7. 名额变动场景

| 场景 | 处理 |
|------|------|
| 完成一单（delivered） | 释放名额。自动递补开关开 → 缓冲[0]递补；关 → 空位等画师手动 |
| 取消一单（cancelled） | 同上 |
| 画师推掉正式单 | 同上 |
| 画师调大 N（3→5） | 空 2 位。自动递补开关开 → 缓冲[0][1]递补；关 → 空位等手动 |
| 画师调小 N（5→3） | 不踢已在正式区的单。未来新单进缓冲区直到正式数 < 新 N |
| 缓冲客户取消 | 队列顺移（后面 -1），静默 |
| 画师直接接缓冲区的单 | 允许。该单 `queue_zone` 变 `formal`，排到正式队列末尾。正式数可暂时超过 N（下次完成一单自动回到 N 以内） |
| 画师手动清理缓冲区 | "移除"按钮 → 取消该订单 |

---

## 8. 数据模型

### artists 表新增字段（迁移 v17）

```sql
ALTER TABLE artists ADD COLUMN batch_limit INTEGER DEFAULT NULL;
ALTER TABLE artists ADD COLUMN buffer_limit INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN auto_promote INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN hide_queue_position INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN hide_promote_notify INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN buffer_short_form INTEGER DEFAULT 0;
```

### orders 表新增字段（迁移 v17）

```sql
ALTER TABLE orders ADD COLUMN queue_zone TEXT DEFAULT 'formal';
-- 'formal' | 'buffer'
CREATE INDEX IF NOT EXISTS idx_orders_queue_zone ON orders(artist_id, queue_zone);
```

### 名额计算（SQL 片段）

```sql
-- 正式区在途数
SELECT COUNT(*) FROM orders
WHERE artist_id = ? AND queue_zone = 'formal'
  AND status NOT IN ('delivered', 'cancelled');

-- 缓冲区在途数
SELECT COUNT(*) FROM orders
WHERE artist_id = ? AND queue_zone = 'buffer'
  AND status NOT IN ('delivered', 'cancelled');
```

---

## 9. API 设计

### 9.1 画师设置（已有接口扩展）

`PUT /api/artist/profile` 请求体新增：

```json
{
  "batchLimit": 3,
  "bufferLimit": 20,
  "autoPromote": false,
  "hideQueuePosition": false,
  "hidePromoteNotify": false,
  "bufferShortForm": false
}
```

校验：`batchLimit` 为 null 或 ≥ 0；`bufferLimit` ≥ 0；`batchLimit + bufferLimit ≥ 1`（batchLimit 为 null 时跳过此校验）。

### 9.2 递补

```
POST /api/artist/orders/:id/promote
```

- requireAuth + requireOwnOrder
- 订单 `queue_zone` 必须为 `buffer`
- 订单状态不能是 delivered/cancelled
- 操作：`queue_zone = 'formal'`，排到正式队列末尾
- 写系统备注："📋 从缓冲区递补到正式排期"
- 通知客户（受 `hide_promote_notify` 控制）
- 响应：更新后的订单对象

### 9.3 缓冲区列表

```
GET /api/artist/queue?zone=buffer
```

- 复用现有 queue 接口，加 `zone` 参数
- 返回缓冲区订单列表（按 queue_position 排序）
- 每条含：order_no, client_name, client_qq, tier_name, created_at, queue_position

### 9.4 客户下单（已有接口扩展）

`POST /api/orders` 新增校验：

```
if artist.batch_limit IS NOT NULL:
  formal_count = 正式区在途数
  buffer_count = 缓冲区在途数
  if formal_count < batch_limit:
    queue_zone = 'formal'
  elif buffer_count < buffer_limit:
    queue_zone = 'buffer'
  else:
    400 "已接满"
```

### 9.5 客户主页（已有接口扩展）

`GET /api/public/artist/:subdomain` 响应新增：

```json
{
  "batchLimit": 3,
  "bufferLimit": 20,
  "formalCount": 2,
  "bufferCount": 5,
  "slotDisplay": "开放中 · 剩 1 席"
}
```

`slotDisplay` 由后端按 §3 表格计算，前端直接渲染。

### 9.6 客户进度页（已有接口扩展）

`GET /api/orders/track/:orderNo` 响应新增：

```json
{
  "queueZone": "buffer",
  "queuePosition": 3,
  "queueDisplay": "排队中（第 3 位）"
}
```

`queueDisplay` 由后端按 `hide_queue_position` 计算。

---

## 10. 通知

| 事件 | 通知对象 | 渠道 | 受开关控制 |
|------|----------|------|-----------|
| 递补到正式区 | 客户 | 站内（订单状态变更）+ QQ（等机器人） | `hide_promote_notify` |
| 缓冲区顺移 | 不通知 | — | — |
| 名额释放 | 不通知画师 | — | — |
| 画师手动切 open | 不通知 | — | — |

> QQ 机器人尚未实现。递补通知 v1 走站内（客户进度页可见状态变化），QQ 推送等机器人上线后自动接入，不阻塞本 SPEC 实施。

---

## 11. 前端适配（供二号参考）

### 画师端

| 页面 | 改动 |
|------|------|
| Settings.vue | 新增"名额设置"卡片（N/M 输入 + 4 个开关 + 实时预览） |
| QueueBoard.vue | 顶部滑块切换正式/缓冲区；缓冲区列表 + 递补/移除按钮 + 拖拽排序 |
| Dashboard.vue | 新增"名额概览"卡片（batch_limit 非 NULL 时显示） |

### 客户端

| 页面 | 改动 |
|------|------|
| ArtistHome 4 模板 | 状态徽章旁显示名额信息（slotDisplay）；部分模板加小字 |
| OrderForm | 下单前检查名额；缓冲区 + buffer_short_form 时简化表单 |
| TrackOrder | 显示排队信息（queueDisplay）；缓冲客户可取消 |

---

## 12. 迁移

```sql
-- 迁移 v17: 名额与缓冲系统
ALTER TABLE artists ADD COLUMN batch_limit INTEGER DEFAULT NULL;
ALTER TABLE artists ADD COLUMN buffer_limit INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN auto_promote INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN hide_queue_position INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN hide_promote_notify INTEGER DEFAULT 0;
ALTER TABLE artists ADD COLUMN buffer_short_form INTEGER DEFAULT 0;

ALTER TABLE orders ADD COLUMN queue_zone TEXT DEFAULT 'formal';
CREATE INDEX IF NOT EXISTS idx_orders_queue_zone ON orders(artist_id, queue_zone);
```

- 存量订单 `queue_zone` 默认 `formal`（兼容）
- 存量画师 `batch_limit` 默认 NULL（不启用名额系统，兼容）
- 回滚：`ALTER TABLE artists DROP COLUMN batch_limit; ...`（SQLite 3.35+ 支持）

---

## 13. 测试计划

| 用例 | 描述 |
|------|------|
| 正常下单（正式） | 正式 < N → queue_zone=formal |
| 正常下单（缓冲） | 正式 ≥ N，缓冲 < M → queue_zone=buffer |
| 接满拒绝 | 正式 ≥ N，缓冲 ≥ M → 400 |
| N=0 申请制 | 所有订单进缓冲区 |
| 手动递补 | POST promote → queue_zone 变 formal |
| 自动递补 | auto_promote=1，完成一单 → 缓冲[0]自动递补 |
| 递补通知开关 | hide_promote_notify=1 → 不通知 |
| 排队位次显示 | hide_queue_position=0 → "第 X 位"；=1 → "排队中" |
| 画师调大 N | 3→5 → 缓冲前 2 名递补（auto_promote=1 时） |
| 画师调小 N | 5→3 → 不踢人 |
| 缓冲客户取消 | 队列顺移 |
| 画师直接接缓冲单 | 允许超出 N |
| 缓冲简短表单 | buffer_short_form=1 → 只需简短文字+QQ+选款 |
| 缓冲不付定金 | 缓冲订单无付款节点 |
| 递补后生成付款 | 递补进正式 → 按报价快照生成付款节点 |
| 名额显示 | 各状态组合 → slotDisplay 正确 |
| 兼容（batch_limit=NULL） | 不设名额 → 行为与现有一致 |
| 校验 | N+M < 1 → 400 |

---

## 14. 工程量估算

| 层 | 工作 | 时间 |
|----|------|------|
| 迁移 | v17 新字段 + 索引 | 15min |
| 后端 | 设置扩展 + 下单校验 + 递补 API + 队列查询 + 主页/进度页扩展 | 3h |
| 前端（画师端） | 设置页名额卡片 + 看板滑块 + 仪表盘概览 | 3h |
| 前端（客户端） | 4 模板名额显示 + 下单校验 + 进度页排队信息 + 缓冲取消 | 2h |
| 测试 | 18 例 | 1h |
| **合计** | | **~9h** |

---

## 15. 待一号审核

| # | 问题 | 说明 |
|---|------|------|
| 1 | 迁移版本号 | 当前 v16 已用（order_template_id），本 SPEC 用 v17。确认无冲突 |
| 2 | 与 R58-8 的迁移合并 | R58-8（URL 识别）也要加画师表字段，建议合并为一个迁移 v17 |
| 3 | 排期 | 建议 v0.17 第二批（第一批小快灵先清完） |
