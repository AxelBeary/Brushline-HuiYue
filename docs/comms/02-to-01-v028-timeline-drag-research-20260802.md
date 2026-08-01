# 二号 → 一号：v0.28 时间条拖拽设计评估

> 日期：2026-08-02
> 分支：`research/v028-timeline-drag`（只读，无代码改动）
> 性质：设计方案，不含实施

---

## 现状摘要

- 时间条视图（QueueBoard.vue L322-385）：订单横条 `.tl-bar` 已有 `data-order-id`，绝对定位 `left` + `width`
- 坐标换算：`tlX(date)` 日期→画布 x，`tlDayWidth` 每天像素宽（2w=48px / 1m=32px / 2m=18px）
- 后端 API 已就绪：
  - `PUT /api/artist/orders/:id/deadline`，body `{ deadline: string|null }`，接受 ISO 8601，service 层 `new Date()` 校验后存 SQLite 格式
  - `PUT /api/artist/orders/:id/start-date`，body `{ startDate: string|null }`，`YYYY-MM-DD` 格式
- 前端 API 已封装：`artistApi.updateDeadline(id, deadline)` / `artistApi.updateStartDate(id, startDate)`
- 项目内已有 Pointer Events 拖拽先例：R30e 滑块取消（`setPointerCapture` + `pointerdown/move/up`）

---

## Q1：拖拽实现方案 — 原生 Pointer Events，不引库

| 方案 | 评估 |
|------|------|
| vuedraggable | ❌ 面向列表排序（SortableJS），不支持"沿时间轴拖端点改日期"的交互模型 |
| interact.js / @vueuse/gesture | ⚠️ 能做，但引入新依赖只为一个 ~100 行的拖拽逻辑，违反"不引新 npm 依赖"原则 |
| **原生 Pointer Events** | ✅ 项目已有先例（R30e 滑块取消），`setPointerCapture` 保证拖出元素不丢事件，鼠标/触摸统一 API，零依赖 |

**结论：原生 Pointer Events。** 核心逻辑约 80-100 行 JS，模式与 R30e 一致：

```
pointerdown（handle 上）→ setPointerCapture → pointermove（算 x→日期）→ pointerup（提交 API）
```

---

## Q2：拖拽交互细节

### 操作模型

| 操作 | 触发区域 | 效果 | API |
|------|----------|------|-----|
| **拖右端** | 横条右侧 8px 热区（cursor: `col-resize`） | 改截稿日 | `updateDeadline` |
| **拖左端** | 横条左侧 8px 热区（cursor: `col-resize`） | 改开工日 | `updateStartDate` |
| **拖整条**（v2 候选） | 横条主体 | 平移开工日+截稿日 | 两个 API 并发 |

> SPEC-005 §5 明确写了"拖动订单带右端 → 修改截稿日"。左端改开工日是自然延伸（API 已有），建议 v1 一起做。整条平移复杂度翻倍（需处理 null deadline 的未设截稿订单），建议 v2。

### 吸附

- **吸附到天**。日期是日粒度，拖拽过程中 x 坐标实时换算为日期（`Math.round(deltaX / tlDayWidth)` 天偏移），松手时提交 `YYYY-MM-DD`。
- 拖拽中显示浮动日期标签（跟随指针，格式 `M/D`），让画师看到"松手会设成哪天"。

### 视觉反馈

- 拖拽中：横条显示半透明 ghost 轮廓（原位置），实体条跟随指针伸缩
- 右端/左端 handle：hover 时显示 8px 宽的竖线 + `col-resize` 光标
- 日期浮动标签：`position: fixed`，跟随 `clientX/clientY`

### 校验与防呆

- 截稿日不得早于开工日（前端拦截，不发请求，ElMessage.warning）
- 未设截稿日的订单（斜纹条）：右端 handle 仍可用，拖出即设截稿日（从"画满到窗口末端"变为实际日期）
- 已完成/已交付订单：不显示 handle（不可改）
- 缓冲区订单：允许拖拽（候补也可能需要排期）

### 提交方式

- **松手即保存**（与项目"诚实 UI"一致，不加确认弹窗）
- 保存失败：ElMessage.error + 回滚到拖拽前状态（重新 loadQueue）
- 保存成功：ElMessage.success + 局部更新该订单的 deadline/startDate（不全量刷新，避免闪烁）

---

## Q3：月历视图色带是否支持拖拽

**不做。** 理由：

1. 月历色带是**按格子切片渲染**的（每个 `.cal-cell` 内独立渲染该日覆盖的带子片段），不是一条连续 DOM 元素。拖拽需要跨格子追踪，与时间条的"一条连续横条"完全不同
2. 月历定位是**只读总览**，时间条定位是**排期操作**。SPEC-005 §5 也只提了"拖动订单带右端"，语境是时间条
3. 月历格子最小高度 64px（移动端），色带高度 ~16px，触摸拖拽热区太小，体验差
4. 如果未来真要做月历拖拽，那是另一个独立设计（跨格子 DnD，类似 Google Calendar 月视图），不应混入本次

---

## Q4：改动量估算

| 文件 | 改动 | 行数 |
|------|------|------|
| `web/src/views/artist/QueueBoard.vue` | 拖拽状态 + handler + handle 渲染 + 日期标签 + 校验 | +120~150 行 JS，+15 行 template |
| `web/src/views/artist/QueueBoard.vue` `<style>` | handle 样式 + ghost + 日期标签 + 移动端热区扩大 | +35 行 CSS |
| `web/src/locales/zh-CN.js` | 拖拽提示文案（~6 键） | +6 行 |
| `web/src/locales/en.js` | 同上英文 | +6 行 |

**总计：~180 行新增，0 行删除（纯增量，不改现有逻辑）。**

**工时估算：2-3h**（含自测 + ESLint + i18n 双语）

不需要后端改动。不需要新 npm 依赖。不需要改共享组件。

---

## Q5：移动端处理

**方案：Pointer Events 天然统一鼠标/触摸，同一套代码。** 但需处理一个冲突：

- `.tl-scroll` 容器有 `overflow-x: auto` + `-webkit-overflow-scrolling: touch`，移动端手指在横条上水平滑动时，浏览器会优先触发容器滚动而非拖拽
- **解决**：handle 元素设 `touch-action: none`（阻止浏览器接管手势），横条主体保持默认（允许滚动）
- 移动端 handle 热区扩大：CSS `@media (max-width: 768px)` 下 handle 宽度从 8px → 24px，确保手指可触达
- 横条高度移动端从 24px → 32px（已有 `.tl-row` 36px 行高，空间够）

**不建议放弃移动端拖拽。** 画师用手机看排期是真实场景，"看到截稿日不对，随手拖一下"比"打开电脑改"体验好很多。Pointer Events 方案下移动端零额外代码量，只需 CSS 热区调整。

---

## 风险与边界

| 风险 | 应对 |
|------|------|
| 2m 缩放下 tlDayWidth=18px，拖 1 天 = 18px，精度低 | 可接受：2m 是总览模式，精细调整切回 2w（48px/天）。日期标签始终显示目标日期，不会设错 |
| 拖拽中 loadQueue 刷新导致 DOM 重建 | 拖拽中不刷新。松手提交后局部更新数据，不触发全量 loadQueue |
| 未设截稿日订单的"画满到窗口末端"是视觉假象 | 右端 handle 定位在窗口末端，拖出即设真实截稿日。handle 上显示 ⚠️ 提示"未设截稿" |
| 并发：拖拽中另一设备改了同一订单 | 后端 `updated_at` 乐观锁未实现（现有所有 PUT 都没有）。本次不加，与现有行为一致 |

---

## 建议实施节奏

1. **v1（本次）**：时间条右端拖改截稿日 + 左端拖改开工日 + 吸附到天 + 日期标签 + 移动端热区
2. **v2（后续）**：整条平移（改开工日+截稿日）、拖拽中显示相邻订单吸附参考线
3. **不做**：月历色带拖拽（独立设计，不在本 SPEC 范围）
