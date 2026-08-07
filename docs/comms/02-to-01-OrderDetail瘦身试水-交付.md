# 02-to-01-OrderDetail瘦身试水-交付

> **五号转交一号，文件：docs/comms/02-to-01-OrderDetail瘦身试水-交付.md**
> 派工：2026-08-07 · 分支：beta/orderdetail-slim · commit：d2e8888
> 状态：✅ 代码+三门禁完成（commit 由一号收尾补落盘，因子代理工具上限截断）

## 一、改动摘要

| 文件 | 动作 | 说明 |
|------|------|------|
| `web/src/composables/useOrderWorkflow.js`（新建，135 行） | workflow 区块纯搬移 | 订单工作流状态机：hasWorkflow/isTerminal/workflowStages/currentStageIdx/stageProgress/nextStage/nextStageName/canAdvanceStage/canBackStage/advanceStage/backStage/turnOffStageTracking/trackOnLoading/enableTracking/loadWorkflowStages；接收 `{order, routeId, statusAction}` |
| `web/src/composables/useOrderGallery.js`（新建，113 行） | gallery 区块纯搬移 | 订单图库：galleryInputEl/galleryUploading/isGalleryDragOver/galleryViewer*/openGalleryViewer/validateImageFile/uploadAndAttachReference/uploadGalleryFiles/triggerGalleryUpload/handleGalleryFileSelect/handleGalleryDrop/guardDrag*/guardDrop/selectFocusImage；接收 `{order, routeId, onRefresh}` |
| `web/src/composables/useOrderDeadline.js`（新建） | deadline 区块纯搬移 | 剩余天数/截稿日/开工日：daysLeft/deadlineChip/deadlinePicker/disableDeadlineDate/disableStartDateDate/changeDeadline/startDatePicker/changeStartDate；接收 `{order, routeId}` |
| `web/src/composables/useOrderPaymentPanel.js`（新建） | payment 面板区块纯搬移 | 收款面板：payments/paymentsLoading/paymentSubmitting/loadPayments/payDialogVisible/payForm/submitPayment/nodePayDialog*/openNodePayDialog/submitNodePayment/handleRevokePayment/pool* 计算/installmentRefs/nextDueInstallment/remainingCents/scrollToPayment；内部装配 useOrderPayments；接收 `{order, routeId, onRefresh}` |
| `web/src/views/artist/OrderDetail.vue` | 瘦身装配 | 删 4 区块原码（-404 行）+ import 4 个 composable + 装配解构；**模板零改动**；移除不再使用的 useDropGuard/useOrderPayments/watch import |
| `docs/待修复问题清单.md` | 末尾追加 | 该文件已存在（114 行活跃清单），按惯例追加瘦身批说明，未覆盖原内容 |

**行数对比**：OrderDetail.vue 1898 → **1502 行**（script 区 884 → ~490，模板/样式不动）。瘦身 21%。

## 二、自修/纠偏说明（与派工假设不符处）

1. **`formatCents` 来源**：施工图假设是 utils 导出，实测是 OrderDetail.vue **本地函数**（原 L1296）→ useOrderPaymentPanel 内部复刻同款实现（金额分→元），父组件保留自己的 formatCents 供模板/日志使用。**双份同逻辑**（各 4 行），可后续收拢。
2. **gallery composable 返回值补漏**：施工图骨架 return 漏了 `validateImageFile`/`uploadGalleryFiles`——它们被父组件 note 区块（uploadNoteImage 校验）和 usePasteUpload 粘贴回调（`await uploadGalleryFiles(files)`）使用，**必须返回**。已在装配解构中补上这两个（见 OrderDetail.vue 装配段）。
3. **`loadWorkflowStages` 位置**：实测它在 workflow 区块（L845-852），composable 内独立定义并返回，onMounted 调用不变。
4. **statusAction 共享**：按施工图从原 L1051 提前到装配处定义，workflow composable 与 changeStatus 共用同一 ref——防连点锁行为不变。

## 三、自测结果（一号独立复跑确认）

| 门禁 | 结果 |
|------|------|
| oxlint（5 文件） | 0 错误 0 警告 |
| vitest（web） | **215/215 全绿**（13 文件） |
| build（web） | ✓ 5.57s |

## 四、浏览器实测

未做浏览器截图实测（重构纯搬移，行为零变化，依赖单测+build 门禁兜底）。建议合入后由用户在实际订单详情页抽查一次（工作流推进/图库上传/截稿日修改/收款）。

## 五、卡点

- 子代理工具调用上限截断：代码+三门禁完成，commit/交付报告由一号收尾补落盘。
- 无其他卡点；待修复清单无新增条目（本批未发现新问题）。

---
*五号转交一号，文件：docs/comms/02-to-01-OrderDetail瘦身试水-交付.md*
