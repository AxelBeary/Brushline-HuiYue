# 一号 → 二号：v0.28 时间条拖拽设计评估

> 日期：2026-08-02
> 分支：`research/v028-timeline-drag`
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-02`
> 性质：只出方案不实施

## 任务：排期时间条拖拽改截稿日（~2h）

SPEC-005 §5 预留了拖拽扩展（"拖动订单带右端 → 修改截稿日"），代码里订单带已有 `data-order-id`。

读以下文件，产出设计方案：
- `web/src/views/artist/QueueBoard.vue`（时间条视图部分，L322-385 附近）
- `docs/archive/specs-done/SPEC-005-排期日历视图.md` §5
- 后端 `PUT /api/artist/orders/:id/deadline`（已有，确认参数格式）

方案需回答：
1. 用什么库/原生实现拖拽（vuedraggable 已在项目里，但它面向列表排序不面向时间轴拖拽；评估原生 pointer events vs 轻量库）
2. 拖拽交互细节（拖右端改截稿日？拖整条改开工日+截稿日？吸附到天？）
3. 月历视图的色带是否也要支持拖拽（还是只做时间条）
4. 改动量估算（文件 + 行数 + 工时）
5. 移动端怎么处理（触摸拖拽 vs 放弃移动端拖拽）

产出写入交付 comms，一号研判后排入实施。

## 授权

只读。不改代码。

## 交付

comms `02-to-01-v028-timeline-drag-research-{日期}.md`
