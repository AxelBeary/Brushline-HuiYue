# 二号 → 一号：R30d 流程状态机前端提交审核

> 日期：2026-07-30
> 分支：`feat/client-frontend-r30d-stage`，commit `2c7e4c6`
> 契约依据：SPEC-002 + `01-to-02-r30d-frontend-0730.md`
> ⚠️ 后端（三号 `feat/backend-artist-r30d-stage`）尚未合入 master，本分支对着契约实施，全部改动向后兼容（字段缺失时回退旧行为）

---

【角色】二号：客户页面前端负责者

【工作分支】feat/client-frontend-r30d-stage

【任务编号】R30d（流程状态机前端，看板/详情/track 三页）

【修改模块】画师端 QueueBoard / OrderDetail + 客户端 TrackOrder + API 层 + i18n

【修改内容】

**QueueBoard.vue**：
- 卡片 header 显示当前节点名 tag（`currentStageId != null` 时），打回（revision）时带 ↩ 前缀
- 接入流程的订单：主操作按钮改为"推进到下一节点"（primary），调 `PUT /stage`（stageId = 当前节点的下一个，onMounted 加载 `getWorkflow()` 计算）
- 未接入流程的老订单：保持 R30b 固定状态按钮（向后兼容）
- 终态（delivered/cancelled）和最后节点不显示推进按钮

**OrderDetail.vue**：
- 新增流程进度卡片（仅 `currentStageId != null` 显示）：复用 R11 `OrderTimeline` 组件（高亮当前节点）+ 进度文字（`stageProgress` 后端字段，缺失时前端兜底计算）+ ↩ 打回标记
- 推进按钮："推进到：{下一节点名}"；打回按钮："↩ 打回上一节点"（ElMessageBox 确认，打回上一节点）
- 卡片 header 右侧"关闭流程跟踪"入口（ElMessageBox 确认，调 `PUT /stage-off`）
- 老订单（currentStageId=null）不显示此卡片，走原有固定状态流

**TrackOrder.vue**：
- R11 时间线已显示节点名（不显示数字进度，符合指令）
- 新增：status='revision' 时显示 ↩ 打回提示（警示色）

**api/index.js**：新增 `advanceStage` / `stageBack` / `stageOff` 三个方法

**i18n**：queue.advanceStage/stageAdvanced + orderDetail 8 键 + track.timeline.revision，中英同步

【涉及文件】
- web/src/views/artist/QueueBoard.vue
- web/src/views/artist/OrderDetail.vue
- web/src/views/client/TrackOrder.vue
- web/src/api/index.js
- web/src/locales/zh-CN.js
- web/src/locales/en.js

【是否修改非客户前端文件】
是。api/index.js 不在本任务授权列表明列，但为接口封装必经文件（项目惯例：所有 API 调用走 api/index.js），v0.12/R33 已有先例。locales 在一号授权范围内。如认为越权请指出，可拆分。

【接口依赖】
| 接口 | 调用方式 |
|------|----------|
| PUT /api/artist/orders/:id/stage | body `{ stageId }`（目标节点 ID），返回完整订单 |
| PUT /api/artist/orders/:id/stage-back | body `{ stageId }`（回退目标节点 ID），返回完整订单 |
| PUT /api/artist/orders/:id/stage-off | 无 body，返回完整订单（⚠️ SPEC-002 未定义此端点，一号指令要求"关闭流程跟踪"入口，我按 PUT 无 body 实现，请三号确认或调整） |
| GET 订单详情 | 读 currentStageId / currentStageName / stageProgress（可选，缺失时回退） |
| 客户 track | 读 status='revision' 显示 ↩（currentStageName 由 R11 时间线已展示） |

【自测情况】
- ESLint：零错误零警告 ✅
- Vite build：通过（3.90s）✅
- i18n 中英同步 ✅
- 向后兼容：currentStageId 缺失时三页均回退旧行为 ✅
- 仅 6 个文件，逐个 git add（无 -A）✅

【可能影响】
- 画师端看板/详情：接入流程的订单操作路径变化（推进按钮替代固定状态按钮）
- 客户端 track：仅新增 ↩ 提示，无破坏
- 老订单（currentStageId=NULL）：行为完全不变

【待确认问题】
1. **stage-off 端点**：SPEC-002 未定义，我按 `PUT /api/artist/orders/:id/stage-off`（无 body）实现。请三号确认端点名/方法，不一致我立即改。
2. **打回目标**：我实现为"打回上一节点"（stageId = 当前 idx-1）。若一号/用户希望打回可选任意历史节点，需追加下拉选择。
3. **后端未合入**：本分支对着契约实施，需三号后端合入 master 后联调验证。若后端响应字段名与 SPEC-002 不一致（如 stageProgress 结构），需微调。

【申请】申请一号审核合并（建议等三号后端合入后一起联调验证）。
