# 05-派工-ManualOrder拆分+时间条滚动-20260807

> 派工：一号 → 五号（bugfix/重构）
> worktree：`artist-commission-w5`（分支 `beta/manualorder-split`，HEAD=159ee76）
> 开工第一步：**`git merge master` 再读本文件**。
> 两个任务：①ManualOrder 拆分（三巨头之三）②QueueBoard 时间条 Excel 式滚动（用户第 6 条反馈）。

## 一、任务①：ManualOrder 拆分

- `web/src/views/artist/ManualOrder.vue`：**1497 行**，`<script setup>` L507，模板双栏 `mo-grid`（L9）+ 左栏 `mo-col`（L11）+ 右栏 `mo-col`（L110）
- **沿用 PaymentPanel/GalleryPanel/QueueBoard 已验证模式**（props 向下 / emit 向上，样式 scoped 搬入）
- 拆 2 个组件（新目录 `web/src/components/artist/order/`）：
  - `ManualOrderLeft.vue`：左栏客户信息 + 参考图上传（QQ/参考图/昵称/描述/优先级/截稿日）
  - `ManualOrderRight.vue`：右栏档位/尺寸/增项/价格/提交
- 父组件目标 ≤800 行；模板原样搬移、事件等价、i18n 零改
- ⚠️ 参考图上传逻辑（handleRefUpload/guardDrag*）随卡移入；档位联动若耦合深允许移入子组件（props 收原始数据）

## 二、任务②：时间条 Excel 式滚动（用户第 6 条反馈）

- 现状：`web/src/components/artist/queue/QueueBoardCalendar.vue`——时间条 `tl-scroll`（L78）+ `tl-canvas`（L79 固定宽度按跨度算）+ `tl-axis`（L81）+ `tl-tick`（L84）；**选了跨度直接掐断**（canvas 宽度=跨度×格宽，超出不显示）
- **用户要求**："现在选了跨度直接掐断，希望像 Excel 那样还能往后滚动？能安全实现吗"——**已确认可安全实现**（纯前端视图逻辑）
- 修法：
  1. `tl-canvas` 宽度改为**覆盖订单实际日期范围**（min = 当前跨度，但可向未来/过去延伸——取所有订单最早/最晚日期 + 前后各 N 天的余量）
  2. `tl-scroll` 容器 `overflow-x: auto` + **scrollLeft 初始定位到"今天"**（或最早订单日），让用户能自由左右滚动
  3. 保持 `tl-today-line`（今天线）在滚动时正确显示
  4. 边界：日期范围有界（订单日期不会无限远），canvas 宽度设上限（如 2000px）防极端数据
- **安全点**：纯前端视图逻辑，不改数据/后端；`scrollLeft` 控制无需新依赖
- ⚠️ 这是 QueueBoard 拆分后的组件（刚合入），改前先确认组件结构稳定

## 三、门禁

```bash
cd server && npm test && npm run typecheck && npm run lint   # 基线 953/953
cd web && npm run test:web && npm run lint && npm run build  # 基线 215/215
```
- e2e 主路径冒烟：ManualOrder 录单提交 / QueueBoard 三视图 / 时间条滚动
- **截图**：ManualOrder 拆分前后 + 时间条滚动前后（0% 像素差异 + 滚动功能证据）

## 四、纪律

- 纯重构 + 视图增强：不改 API/后端/i18n 键
- 禁止任何（strict 已全开）；新问题记 `docs/待修复问题清单.md`
- 两个任务**分开 commit**（先 ManualOrder 拆分，再时间条滚动）

## 五、交付

- 报告 `docs/comms/05-to-01-ManualOrder拆分+时间条-交付-20260807.md`
- 不推送、不合并、不改 STATUS；合入由一号执行
