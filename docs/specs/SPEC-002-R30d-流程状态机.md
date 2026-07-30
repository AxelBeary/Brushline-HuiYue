# R30d 技术方案：订单状态流转接入自定义工作流

> 文档编号：SPEC-002
> 作者：三号（后端）
> 日期：2026-07-30
> 状态：已实施（v0.13 合入，迁移 v14 + stage 推进/回退接口 + 看板/详情页/track 页接入）
> 前置：REQ-007 R30d、C44 决策（排 v0.13 后期，方案先行）

---

## 一、现状分析

### 1.1 两套独立系统

| 系统 | 位置 | 作用 |
|------|------|------|
| 订单状态机 | `order.service.js` STATUS_TRANSITIONS | 固定 7 状态：pending→confirmed→wip→revision→done→delivered→cancelled |
| 自定义工作流 | `workflow.service.js` artist_workflow_stages | 画师自定义 N 个节点（默认 7 个：定稿→排期确认→草稿→线稿→上色→完稿→交付） |

**问题**：两者完全断开。工作流节点只是展示标签 + 收款比例，不驱动订单状态。画师在看板上拖状态（pending→wip→done），和流程节点（草稿→线稿→上色）是两套操作。

### 1.2 用户痛点（REQ-006 原声）

> "我设了 7 个流程节点，但订单状态还是只有那几个固定的。我想让订单跟着我的流程走。"

---

## 二、设计目标

1. 订单有一个 `current_stage_id`，指向画师工作流的某个节点
2. 画师推进流程节点时，订单状态自动映射更新
3. 客户进度页展示当前流程节点名（而非抽象的 "wip"）
4. 向后兼容：老订单无 current_stage_id 时行为不变
5. 不破坏现有状态机的安全约束（cancelled 不可逆、delivered 终态）

---

## 三、核心设计

### 3.1 状态映射规则

工作流节点按 sort_order 排列。映射规则：

| 节点位置 | 映射到的订单状态 | 说明 |
|----------|:----------------:|------|
| 第 1 个节点 | `pending` | 初始/定稿阶段 |
| 第 2 个节点 ~ 倒数第 2 个 | `wip` | 进行中（草稿/线稿/上色...） |
| 最后一个收款节点（尾款） | `done` | 完稿待交付 |
| 交付完成（手动触发） | `delivered` | 终态 |

**特殊状态**：
- `confirmed`：保留，作为"排期确认"的语义（第 2 个节点如果是收款节点 → confirmed）
- `revision`：保留，作为"打回"操作（从任意 wip 节点回退到上一个节点）
- `cancelled`：保留，独立于流程（任何阶段都可取消）

**简化规则**：
```
stageIndex = 0         → pending
stageIndex = 1 且收款  → confirmed
stageIndex >= 1        → wip（非收款节点或 index > 1）
stageIndex = last      → done（最后一个节点）
手动交付               → delivered
```

### 3.2 数据模型变更

**迁移 v14**（orders 表加列）：

```sql
ALTER TABLE orders ADD COLUMN current_stage_id INTEGER DEFAULT NULL
  REFERENCES artist_workflow_stages(id) ON DELETE SET NULL;
```

- NULL = 老订单/未接入流程（行为不变，走旧状态机）
- 非 NULL = 接入流程的订单

**不加新表**。current_stage_id 足够表达"订单走到哪了"。

### 3.3 接口变更

#### 新增：推进流程

```
PUT /api/artist/orders/:id/stage
Body: { "stageId": 5 }  // 目标节点 ID
```

逻辑：
1. 校验 stageId 属于该画师的工作流
2. 校验目标节点在当前节点之后（只能前进，不能跳跃回退）
3. 更新 `orders.current_stage_id = stageId`
4. 根据映射规则自动更新 `orders.status`
5. 如果目标是收款节点，可选触发收款提醒（v0.14，本期不做）

#### 新增：回退（打回修改）

```
PUT /api/artist/orders/:id/stage-back
Body: { "stageId": 3 }  // 回退到的节点 ID
```

逻辑：
1. 校验 stageId 在当前节点之前
2. 更新 current_stage_id + status 映射为 `revision`
3. 记录备注 "从 X 回退到 Y"

#### 变更：GET 订单详情

响应新增字段：
```json
{
  "currentStageId": 5,
  "currentStageName": "线稿确认",
  "stageProgress": { "current": 4, "total": 7 }
}
```

#### 变更：客户 track 接口

响应新增：
```json
{
  "currentStageName": "线稿确认",
  "stageProgress": { "current": 4, "total": 7 }
}
```

客户只看节点名 + 进度，不看内部 ID。

### 3.4 向后兼容

| 场景 | 处理 |
|------|------|
| 老订单（current_stage_id=NULL） | 走旧 STATUS_TRANSITIONS，PUT status 接口不变 |
| 新订单（创建时） | 自动设 current_stage_id = 画师第一个节点，status = pending |
| 画师修改工作流（删节点） | ON DELETE SET NULL → 订单回退到旧模式 |
| 画师修改工作流（重排序） | current_stage_id 不变（指向 ID 不指向位置），映射重算 |
| PUT /api/artist/orders/:id/status（旧接口） | 保留，但仅对 current_stage_id=NULL 的订单生效。有 stage 的订单必须走 stage 接口 |

### 3.5 状态机校验（新版）

```js
// 有 current_stage_id 的订单：
// - 只能通过 PUT stage / stage-back 变更
// - cancelled 仍可从任何状态触发
// - delivered 只能通过 POST deliver 触发（与现在一致）

// 无 current_stage_id 的订单（老订单）：
// - 走旧 STATUS_TRANSITIONS，完全不变
```

---

## 四、前端影响（供二号参考）

| 页面 | 改动 |
|------|------|
| QueueBoard.vue | 卡片显示当前节点名 + 进度条；状态按钮改为"推进到下一节点" |
| OrderDetail.vue | 流程进度条（高亮当前节点）；"推进"/"打回"按钮 |
| 客户 track 页 | 显示"当前阶段：线稿确认（4/7）"替代"状态：wip" |
| Settings.vue 工作流 | 无改动（节点 CRUD 不变） |

---

## 五、迁移与回滚

| 项目 | 内容 |
|------|------|
| 版本 | v14 |
| 内容 | `ALTER TABLE orders ADD COLUMN current_stage_id INTEGER DEFAULT NULL` |
| 幂等 | PRAGMA table_info 检测 |
| 回滚 | 列可空，旧代码忽略它。恢复备份 + 降级 |
| 存量数据 | 全部 NULL（老订单不接入，自然过渡） |

---

## 六、风险

| 风险 | 等级 | 缓解 |
|------|:----:|------|
| 画师删工作流节点导致订单 stage 悬空 | 🟡 | ON DELETE SET NULL + 前端检测 NULL 回退旧模式 |
| 映射规则不符合画师预期 | 🟡 | 映射规则可配置化（v0.15），本期用固定规则 |
| 前端改动面广 | 🟡 | 分批：先后端 + QueueBoard，再 OrderDetail + track |
| 旧接口 PUT status 与新接口并存 | 🟢 | 有 stage 的订单拒绝旧接口（400 提示用新接口） |

---

## 七、实施拆分建议

| 阶段 | 内容 | 指派 |
|------|------|------|
| 1 | 迁移 v14 + service 层（stage 推进/回退/映射） + 路由 | 三号 |
| 2 | QueueBoard 接入（推进按钮 + 进度条） | 二号 |
| 3 | OrderDetail 流程进度条 + track 页适配 | 二号 |
| 4 | 五号回归 | 五号 |

---

## 八、用户已确认（2026-08-01）

1. ✅ **映射规则**：按位置自动映射（第一个节点=pending、中间=wip、最后=done），画师不需要理解"映射"概念
2. ✅ **回退语义**：显示回退到的节点名（如"线稿"），不显示"revision"——节点名对客户更有意义
3. ✅ **新订单默认接入**：自动接入（画师配了工作流就是想用，不需要每单手动开）
4. ✅ **客户可见度**：两者都要（节点名 + 进度条，如"线稿确认 4/7"）
