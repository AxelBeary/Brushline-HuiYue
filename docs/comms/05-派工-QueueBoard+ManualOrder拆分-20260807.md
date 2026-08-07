# 05-派工-QueueBoard+ManualOrder拆分-20260807

> 派工：一号 → 五号（bugfix/重构）
> worktree：`artist-commission-w5`（分支 `beta/queueboard-split`，已建好，HEAD=240a302）
> 开工第一步：**`git merge master` 再读本文件**。
> 蓝本：`docs/comms/核实-第三方瘦身施工单-20260807.md`（保留中）+ **OrderDetail 拆分交付（PaymentPanel/GalleryPanel 模式已验证，2026-08-07 合入）**——本批沿用该模式。

## 一、任务总览

三巨头拆分第 2/3 个（OrderDetail 已试水成功：1523→1311 行，PaymentPanel/GalleryPanel，0% 像素差异）。本批：

1. **先 QueueBoard.vue**（1530 行，script L453）——拆完提交合入后
2. **再 ManualOrder.vue**（1497 行，script L507）

> ⚠️ 施工单建议「先 OrderDetail 试水跑通再派 QueueBoard → ManualOrder → OrderForm，不四文件并行」。OrderDetail 已跑通，本批顺序执行：**QueueBoard 完成（测试全绿）→ 一号合入 → 再 ManualOrder**。禁止同时拆两个（共享组件/样式易撞车）。

## 二、目标

- QueueBoard：父组件 1530 → **≤1100 行**
- ManualOrder：父组件 1497 → **≤1100 行**
- 纯重构，功能零变化，视觉零变化（截图对比必须 0% 像素差异）

## 三、QueueBoard 拆分方案（精确）

### 现状结构（已核实）
- `web/src/views/artist/QueueBoard.vue`：1530 行（Get-Content 统计），`<script setup>` L453
- 模板大区块（按视图/功能区拆）：
  - **列表视图看板卡**（board 视图，L16-约 260：焦点图大模式 focus-area + queue-item 卡片 + draggable 列表）——**拆 1**
  - **月历视图**（calendar 视图，L260-约 400：calCursor 月历网格 + 手势翻月）——**拆 2**
  - **时间条视图**（timeline 视图）——**拆 3**（若较小可并入月历拆）
- script 区（L453 起）：队列加载（loadQueue）/ 焦点图上传（uploadAndSetFocus/triggerFocusUpload/handleFocusDrop）/ 拖拽排序（onDragEnd）/ 月历逻辑（calCursor/changeMonth/手势）/ 时间条逻辑 / 交付弹窗（openDeliverFor/onDeliveredFromBoard）
- 组件惯例：`web/src/components/artist/order/`（PaymentPanel/GalleryPanel 已在此），**本批新建 `web/src/components/artist/queue/` 目录**

### 拆 1：`web/src/components/artist/queue/QueueBoardList.vue`（列表视图看板卡）
- props 向下 / emit 向上（数据流纪律，与 PaymentPanel 同款）：
  - props：`queue`（Array）、`focusDisplay`（String）、`activeTab`（String）、`loading`（Boolean）、`focusDragId`（String|null）
  - emit：`drag-end`（拖拽排序完成，父调 saveQueue）、`focus-upload`（element，触发焦点图上传）、`focus-drop`（element, event）、`open-deliver`（element）、`card-pointer-down/up`（父已有或子内处理）、`select-focus` 等（按实际事件清单）
- 模板原样搬移（焦点图区域 + queue-item 卡 + draggable 列表）；`useDropGuard`/`guardDrag*` 若只被本区块用可随卡移入，若父组件别处也用则留父组件
- 样式原样搬入 scoped

### 拆 2+3：`web/src/components/artist/queue/QueueBoardCalendar.vue`（月历+时间条视图）
- props：`queue`（Array，按 deadline 映射到日期格）
- emit：`change-month`/`go-today`（或把 calCursor 逻辑整体移入子组件，父只传 queue——**推荐后者**，月历纯展示+自身状态，与 GalleryPanel 不同（月历没有父组件共享状态）
- 月历网格 + 时间条模板原样搬移，样式 scoped

### 父组件保留
- view-switch（三视图切换）不动
- queue 数据加载/保存（loadQueue/saveQueue）不动
- 焦点图上传链路若被列表+月历共用则留父（参照 OrderDetail：composable 留在父，子纯展示）

## 四、ManualOrder 拆分方案（精确）

### 现状结构（已核实）
- `web/src/views/artist/ManualOrder.vue`：1497 行（Get-Content 统计），`<script setup>` L507
- 模板双栏布局：左栏「客户说了什么」（QQ/参考图上传/昵称/描述/优先级/截稿日）+ 右栏（档位/尺寸/增项/价格/提交）——**天然按列拆**
- script：form 大对象 + rules 校验 + 档位联动（loadTiers/handleTierChange）+ 增项管理 + 参考图上传（handleRefUpload/guardDrag*）+ 价格计算 + 提交（submitOrder）

### 拆 1：`web/src/components/artist/order/ManualOrderLeft.vue`（左栏客户信息 + 参考图上传）
- props：`form`（部分字段 v-model 或 props+emit 按实际）、`refFileList`
- emit：`update:*`（或父传 form 引用——**推荐 props 传 form 对象 + v-model 双向绑定字段**，参照现有 el-form 结构）
- 参考图上传逻辑（handleRefUpload/handleRefRemove/guardDrag*）随卡移入子组件

### 拆 2：`web/src/components/artist/order/ManualOrderRight.vue`（右栏档位/价格/提交）
- props：`form`、`tiers`、`priceBreakdown` 等
- emit：`submit`、档位变更事件（父处理联动后回传数据）
- 若档位联动逻辑与 form 深度耦合，允许**折中**：把联动函数移入子组件（props 收 tiers 原始数据），父只留 submit 提交链路

## 五、红线（零行为变化）

- 纯重构：不改 API 契约、不改后端、不改 i18n 键、不改 DOM 结构/class（样式原样搬入子组件 scoped）
- **事件 handler 保持等价**：原 @click/@change/@drop 等一个不漏，参数原样传递
- 禁止顺手优化无关文件；新问题记 `docs/待修复问题清单.md`（追加）
- 每步验证命令全绿；红了立即回退该步
- **QueueBoard 与 ManualOrder 分开提交**（两个 commit，先 QueueBoard）

## 六、验证门禁（验收必做）

```bash
cd server && npm test && npm run typecheck && npm run lint   # 基线 944/944
cd web && npm run test:web && npm run lint && npm run build  # 基线 215/215
npm run test:e2e   # 根目录
```
- e2e 主路径冒烟：QueueBoard 拖拽排序 / 月历翻月 / 焦点图上传 / ManualOrder 录单提交
- **截图对比**：拆分前后各一张（0% 像素差异铁证）
- **行数变化**：1530→? / 1497→?

## 七、交付

- 交付报告写 `docs/comms/05-to-01-QueueBoard拆分-交付-20260807.md`（QueueBoard 完成后）+ `docs/comms/05-to-01-ManualOrder拆分-交付-20260807.md`（ManualOrder 完成后）
- 报告含：改动清单、测试结果、截图、行数变化
- 不推送、不合并、不改 STATUS；合入由一号执行
