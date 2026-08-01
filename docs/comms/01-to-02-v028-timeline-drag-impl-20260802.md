# 一号 → 二号：v0.28 时间条拖拽实施

> 日期：2026-08-02
> 分支：`feat/v028-timeline-drag`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-02`
> 方案来源：你之前的设计评估（已采纳，全部按你的方案来）

## 任务

在排期看板时间条视图中实现拖拽改日期。

### 实施要点（你的方案，直接执行）

1. **原生 Pointer Events**（不引库）：pointerdown → setPointerCapture → pointermove（x→日期换算）→ pointerup（提交 API）
2. **右端拖改截稿日**：横条右侧 8px 热区（cursor: col-resize），调 `artistApi.updateDeadline(id, deadline)`
3. **左端拖改开工日**：横条左侧 8px 热区，调 `artistApi.updateStartDate(id, startDate)`
4. **吸附到天**：`Math.round(deltaX / tlDayWidth)` 天偏移，松手提交 `YYYY-MM-DD`
5. **浮动日期标签**：拖拽中跟随指针显示目标日期（`position: fixed`）
6. **校验**：截稿日不得早于开工日（前端拦截，ElMessage.warning）
7. **已完成/已交付订单**：不显示 handle
8. **未设截稿日订单**：右端 handle 在窗口末端，拖出即设真实截稿日
9. **松手即保存**（无确认弹窗），失败回滚（重新 loadQueue）
10. **移动端**：handle 设 `touch-action: none`，@media(max-width:768px) 热区 8px→24px
11. **月历不做拖拽**

### 不做

- 整条平移（v2）
- 月历色带拖拽
- 后端改动（API 已就绪）

## 授权文件

- `web/src/views/artist/QueueBoard.vue`
- `web/src/locales/zh-CN.js`
- `web/src/locales/en.js`

## 验证标准

- eslint 0 错误 + build 成功
- 时间条右端可拖改截稿日，左端可拖改开工日
- 拖拽中显示浮动日期标签
- 截稿日早于开工日时拦截
- 已完成订单无 handle
- 移动端热区可触达

## 交付

comms `02-to-01-v028-timeline-drag-{日期}.md`
