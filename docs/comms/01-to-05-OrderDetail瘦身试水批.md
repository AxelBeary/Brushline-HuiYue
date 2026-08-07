# 01-to-05：OrderDetail 瘦身试水批（施工图）

> 转交一号 · 派工时间：2026-08-07 · 执行角色：五号（重构/前端） · worktree：`../artist-commission-w15` · 分支：`beta/orderdetail-slim`
> **开工第一步：`git merge master` 再读本文件**
> 只动授权文件；不推送、不合并、不改 STATUS。本批是**纯重构**——功能零变化。

## 〇、任务理解（人话）

`OrderDetail.vue` 1898 行/85KB 是项目最大组件（三巨头之一）。本批把它**拆瘦**：把 script 区 4 大功能块（工作流/图库/截稿日/收款）抽成独立 composables，父组件只留装配逻辑。**这是试水批**——跑通拆分模式（验证 props/emit + loadOrder 刷新 + 测试全绿）后，后续再拆 QueueBoard/ManualOrder/OrderForm。

**红线铁律：纯搬移，零行为变化**。不改 API 契约、不改 i18n 键、不改样式、不改模板结构（模板引用变量名必须保持不变，因为变量由 composable 返回后名字不变）。

## 一、决策（一号本体已定，执行照做）

1. **P2（init.js 迁移拆分）已砍**——不在本批范围。
2. **P0 目标 B**：OrderDetail 拆后目标 ≤700 行。本批只拆 script 4 区块成 composables（模板 660 行不动，拆后总行数 ≈ 模板660 + script装配~300 + style≈350 ≈ 1310？**不对，目标 ≤700 需要模板也拆**——见下修正）。

> ⚠️ **目标修正（一号决策）**：报告建议 A（模板大区块连组件拆，+50% 工程量）或 B（只拆 script，父组件仍偏大）。一号定**折中**：
> - script 4 区块 → composables（必须做，脚本 884→~350）
> - 模板 gallery 区 + 付款区 → 拆成子组件（这 2 块是模板最大区块，模板 660→~450）
> - **目标：拆后 OrderDetail.vue 总行数 ≤ 1200**（不做 ≤700 的激进目标——那是 A 方案，试水批不追求一步到位，跑通模式优先）
> - 拆出的子组件放 `web/src/components/artist/order/`（新目录）

## 二、授权文件

| # | 文件 | 动作 |
|---|------|------|
| 1 | `web/src/views/artist/OrderDetail.vue` | 瘦身（删 4 区块脚本，装配 composable，模板零改动） |
| 2 | `web/src/composables/useOrderWorkflow.js` | 新建（workflow 区块） |
| 3 | `web/src/composables/useOrderGallery.js` | 新建（gallery 区块） |
| 4 | `web/src/composables/useOrderDeadline.js` | 新建（deadline 区块） |
| 5 | `web/src/composables/useOrderPaymentPanel.js` | 新建（payment 面板区块） |
| 6 | `docs/待修复问题清单.md` | 新建（执行中发现的新问题记这里，不顺手改） |

**不要动**：其他任何 .vue/.js/.ts 文件；后端；locales；样式文件；`useOrderPayments.js`（**已存在**，支付 API 逻辑它管，新 composable 是**面板状态**不重复 API）；**不建** `web/src/components/artist/order/` 子组件目录（模板不拆，本批只拆 script）。

## 三、现状锚点（已实测，2026-08-07 一号核实）

`web/src/views/artist/OrderDetail.vue` 1898 行/84.9KB：
- 模板区：L1-660（660 行）
- `<script setup>`：L661-1544（884 行）
- `<style>`：L1545-1898（354 行）
- 已 import 的 composables：usePasteUpload(L675)/useDropGuard(L676)/useSignatureRefresh(L677)/useSlideConfirm(L678)/useOrderPayments(L679)/useActivityLog(L680)
- 已 import 的子组件：ArtistLayout/OrderTimeline/DeliverDialog/CardHead/StatusChip/InkEmpty

### 4 大 script 区块边界（实测行号）

| 区块 | 行号 | 核心内容 | 依赖 |
|------|------|---------|------|
| **workflow** | L727-853 | workflowStages/currentStageIdx/stageProgress/nextStage/canAdvanceStage/canBackStage/advanceStage/backStage/turnOffStageTracking/enableTracking/loadWorkflowStages + `statusAction` 共享守卫(L1051, 见下) | order/route.params.id/ElMessage/ElMessageBox/artistApi/t |
| **gallery** | L854-951 | galleryInputEl/galleryUploading/isGalleryDragOver/galleryViewer*/openGalleryViewer/validateImageFile/uploadAndAttachReference/uploadGalleryFiles/triggerGalleryUpload/handleGalleryFileSelect/handleGalleryDrop/selectFocusImage + useDropGuard/usePasteUpload 挂载(L918-940) | order/route.params.id/loadOrder/uploadApi/artistApi/ElMessage/t/useDropGuard/usePasteUpload |
| **deadline** | L965-1047 | daysLeft/deadlineChip/deadlinePicker/disableDeadlineDate/disableStartDateDate/changeDeadline/startDatePicker/changeStartDate | order/route.params.id/artistApi/ElMessage/t/watch/ref/computed |
| **payment 面板** | L1086-1203 | useOrderPayments 装配(L1087-1090) + poolPaidCents/poolFinalCents/poolRemainingCents/poolPercent/poolOverpaidCents/installmentRefs/nextDueInstallment/remainingCents/scrollToPayment/submitPayment/payDialogVisible/payForm/nodePayDialogVisible/nodePayTarget/nodePayForm/openNodePayDialog/submitNodePayment/handleRevokePayment | order/route.params.id/loadOrder/useOrderPayments/ElMessage/ElMessageBox/t/computed/formatCents |

### ⚠️ 跨区块共享状态（拆法关键）

- `statusAction`（L1051，推进/打回/状态变更共享防连点锁）：workflow 和 changeStatus(L1053-1064) 都用。**方案**：留在父组件定义 `const statusAction = ref('')`，传入 workflow composable 作为参数（`useOrderWorkflow({ order, routeId, statusAction })`），changeStatus 留在父组件继续用。
- `order`（L686）：所有区块共享，composable 接收 `order` ref 作为参数（引用传递，内部改 order.value 外部可见）。
- `route.params.id`：各 composable 用 `routeId` 参数传入。
- `loadOrder`（L737-744）：gallery 部分失败刷新、payment 提交后刷新都会调。composable 内部需要刷新 → **方案：composable 接收 `onRefresh` 回调参数**（父组件传 `loadOrder`），或 composable 内 await 后直接改 order.value（API 返回新 order）。**推荐后者**：API 返回完整 order 时直接 `order.value = await artistApi.xxx()`（与现有代码一致，无需回调）。

## 四、施工图

### 改动 1：新建 `web/src/composables/useOrderWorkflow.js`

**职责**：订单工作流状态机（进度条+推进/打回+关闭跟踪+老单启用跟踪）。

**骨架**（照此写，内容从 L727-853 原样搬，仅改参数/返回）：
```js
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../api/index.js'

/**
 * 订单工作流状态机（从 OrderDetail.vue 拆分，纯搬移零行为变化）
 * @param {object} ctx
 * @param {import('vue').Ref} ctx.order - 订单 ref（父组件持有，内部改 value 外部可见）
 * @param {string} ctx.routeId - 订单 id（route.params.id）
 * @param {import('vue').Ref<string>} ctx.statusAction - 防连点锁 ref（父组件持有）
 */
export function useOrderWorkflow({ order, routeId, statusAction }) {
  const { t } = useI18n()

  // ─── R39 方案B：状态区派生状态 ───
  const hasWorkflow = computed(() => order.value?.currentStageId != null)
  const isTerminal = computed(() => ['delivered', 'cancelled'].includes(order.value?.status))

  // ─── R30d: 流程状态机（进度条 + 推进/打回 + 关闭跟踪） ───
  const workflowStages = ref([])
  const currentStageIdx = computed(() =>
    workflowStages.value.findIndex(s => s.id === order.value?.currentStageId)
  )
  const stageProgress = computed(() =>
    order.value?.stageProgress || { current: currentStageIdx.value + 1, total: workflowStages.value.length }
  )
  const nextStage = computed(() =>
    currentStageIdx.value !== -1 ? workflowStages.value[currentStageIdx.value + 1] : null
  )
  const nextStageName = computed(() => nextStage.value?.name || '')
  const canAdvanceStage = computed(() =>
    order.value?.currentStageId != null
    && !['delivered', 'cancelled'].includes(order.value?.status)
    && !!nextStage.value
  )
  const canBackStage = computed(() =>
    order.value?.currentStageId != null
    && !['delivered', 'cancelled'].includes(order.value?.status)
    && currentStageIdx.value > 0
  )

  async function advanceStage() {
    if (!nextStage.value || statusAction.value) return
    statusAction.value = 'advance'
    try {
      order.value = await artistApi.advanceStage(routeId, nextStage.value.id)
      ElMessage.success(t('orderDetail.stageUpdated'))
    } catch (err) {
      ElMessage.error(err.message)
    } finally {
      statusAction.value = ''
    }
  }

  async function backStage() {
    const prev = workflowStages.value[currentStageIdx.value - 1]
    if (!prev) return
    try {
      await ElMessageBox.confirm(
        t('orderDetail.stageBackConfirm', { name: prev.name }),
        t('orderDetail.confirmTitle'),
        { type: 'warning' }
      )
    } catch { return }
    // T3: 守卫须在 try 外——try 内 return 会触发 finally 误清飞行中请求的锁
    if (statusAction.value) return
    statusAction.value = 'back'
    try {
      order.value = await artistApi.stageBack(routeId, prev.id)
      ElMessage.success(t('orderDetail.stageUpdated'))
    } catch (err) {
      ElMessage.error(err.message)
    } finally {
      statusAction.value = ''
    }
  }

  async function turnOffStageTracking() {
    try {
      await ElMessageBox.confirm(
        t('orderDetail.stageOffConfirm'),
        t('orderDetail.confirmTitle'),
        { type: 'warning' }
      )
    } catch { return }
    try {
      order.value = await artistApi.stageOff(routeId)
      ElMessage.success(t('orderDetail.stageOffDone'))
    } catch (err) {
      ElMessage.error(err.message)
    }
  }

  // ─── R39/C53：老订单启用流程跟踪 ───
  const trackOnLoading = ref(false)
  async function enableTracking() {
    trackOnLoading.value = true
    try {
      order.value = await artistApi.trackOn(routeId)
      ElMessage.success(t('orderDetail.trackingEnabled'))
    } catch (err) {
      ElMessage.error(err.message)
    } finally {
      trackOnLoading.value = false
    }
  }

  async function loadWorkflowStages() {
    try {
      const res = await artistApi.getWorkflow()
      workflowStages.value = res.stages || []
    } catch {
      // 静默失败：无工作流时流程卡片不显示（currentStageId 为 null）
    }
  }

  return {
    hasWorkflow, isTerminal,
    workflowStages, currentStageIdx, stageProgress, nextStage, nextStageName,
    canAdvanceStage, canBackStage,
    advanceStage, backStage, turnOffStageTracking,
    trackOnLoading, enableTracking, loadWorkflowStages
  }
}
```

### 改动 2：新建 `web/src/composables/useOrderGallery.js`

**职责**：订单图库（上传+来源角标+点击设焦点+粘贴/拖拽）。

**骨架**：
```js
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { artistApi, uploadApi } from '../api/index.js'
import { usePasteUpload } from './usePasteUpload.js'
import { useDropGuard } from './useDropGuard.js'

/**
 * 订单图库（从 OrderDetail.vue 拆分，纯搬移零行为变化）
 * @param {object} ctx
 * @param {import('vue').Ref} ctx.order - 订单 ref
 * @param {string} ctx.routeId
 * @param {Function} ctx.onRefresh - 刷新回调（loadOrder；gallery 部分失败时用）
 */
export function useOrderGallery({ order, routeId, onRefresh }) {
  const { t } = useI18n()

  const galleryInputEl = ref(null)
  const galleryUploading = ref(false)
  const isGalleryDragOver = ref(false)
  const galleryViewerVisible = ref(false)
  const galleryViewerIndex = ref(0)

  function openGalleryViewer(index) { ... }        // L861-864 原样
  function validateImageFile(file) { ... }          // L867-877 原样
  async function uploadAndAttachReference(file) { ... } // L880-888 原样（artistApi.addReference(routeId, ...)）
  async function uploadGalleryFiles(files) { ... }  // L891-905 原样（catch 里 onRefresh() 替代 loadOrder()）
  function triggerGalleryUpload() { ... }           // L907-909 原样
  function handleGalleryFileSelect(event) { ... }   // L911-915 原样
  const { guardDragEnter, guardDragOver, guardDrop } = useDropGuard()  // L918 原样
  function handleGalleryDrop(event) { ... }         // L920-925 原样
  // R18/R19: Ctrl+V 粘贴上传（焦点路由：备注输入框聚焦→备注附图；否则→图库）L929-940
  // ⚠️ 焦点路由里 uploadNoteImage 属于备注区块（不拆）——方案：usePasteUpload 留父组件挂载！
  // 见下方"⚠️ 关键决策"
  async function selectFocusImage(reference) { ... }  // L943-951 原样

  return { galleryInputEl, galleryUploading, isGalleryDragOver, galleryViewerVisible, galleryViewerIndex,
    openGalleryViewer, triggerGalleryUpload, handleGalleryFileSelect,
    handleGalleryDrop, guardDragEnter, guardDragOver, guardDrop, selectFocusImage }
}
```

> **⚠️ 关键决策（粘贴上传归属）**：usePasteUpload 挂载点（L929-940）的 onFiles 回调有**焦点路由**：备注输入框聚焦→uploadNoteImage（备注区块，不拆），否则→uploadGalleryFiles。**方案：usePasteUpload 留在父组件**（备注区块也不拆，父组件仍用 pasteError），useOrderGallery 不挂载 usePasteUpload。这样避免跨 composable 回调纠缠。gallery 的粘贴能力通过父组件 onFiles 回调里调 `gallery.uploadGalleryFiles(files)` 获得。**useOrderGallery 返回里不含 pasteError**。

### 改动 3：新建 `web/src/composables/useOrderDeadline.js`

**职责**：截稿日/开工日（剩余天数 chip + 日期即时保存 + 自动填截稿日）。

**骨架**：
```js
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { artistApi } from '../api/index.js'

/**
 * 截稿日/开工日（从 OrderDetail.vue 拆分，纯搬移零行为变化）
 * @param {object} ctx
 * @param {import('vue').Ref} ctx.order
 * @param {string} ctx.routeId
 */
export function useOrderDeadline({ order, routeId }) {
  const { t } = useI18n()

  // L965-974 daysLeft 原样
  // L976-982 deadlineChip 原样
  // L984-991 deadlinePicker + watch 原样
  // L993-998 disableDeadlineDate 原样（引用 startDatePicker）
  // L1000-1005 disableStartDateDate 原样（引用 deadlinePicker）
  // L1007-1016 changeDeadline 原样
  // L1018-1023 startDatePicker + watch 原样
  // L1025-1047 changeStartDate 原样

  return { daysLeft, deadlineChip, deadlinePicker, disableDeadlineDate, disableStartDateDate, changeDeadline, startDatePicker, changeStartDate }
}
```

### 改动 4：新建 `web/src/composables/useOrderPaymentPanel.js`

**职责**：收款面板状态（订单级 + 节点级弹窗、金额计算、提交/撤销 UI 逻辑）。**API 逻辑走已有 useOrderPayments**，本 composable 只做装配+面板状态。

**骨架**：
```js
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useOrderPayments } from './useOrderPayments.js'
import { formatCents } from '../utils/format.js'  // ⚠️ 核实导出名：OrderDetail 已用 formatCents，查其来源

/**
 * 收款面板（从 OrderDetail.vue 拆分，纯搬移零行为变化）
 * @param {object} ctx
 * @param {import('vue').Ref} ctx.order
 * @param {string} ctx.routeId
 * @param {Function} ctx.onRefresh - 刷新回调（提交/撤销后 loadOrder）
 */
export function useOrderPaymentPanel({ order, routeId, onRefresh }) {
  const { t } = useI18n()
  const { payments, loading: paymentsLoading, submitting: paymentSubmitting, loadPayments, addPayment, revokePayment } = useOrderPayments()

  // L1092-1104 pool 计算原样
  // L1106-1115 installmentRefs/nextDueInstallment/remainingCents 原样
  // L1117-1120 scrollToPayment 原样
  // L1122-1148 submitPayment 原样（await Promise.all([onRefresh(), loadPayments(routeId)]) 替代 loadOrder()）
  // L1150-1185 node 弹窗原样
  // L1187-1203 handleRevokePayment 原样（同替换 onRefresh）

  return { payments, paymentsLoading, paymentSubmitting, loadPayments,
    payDialogVisible, payForm, submitPayment,
    nodePayDialogVisible, nodePayTarget, nodePayForm, openNodePayDialog, submitNodePayment, handleRevokePayment,
    poolPaidCents, poolFinalCents, poolRemainingCents, poolPercent, poolOverpaidCents,
    installmentRefs, nextDueInstallment, remainingCents, scrollToPayment }
}
```

> ⚠️ `formatCents` 来源核实：搜 `OrderDetail.vue` 里 formatCents 的 import 来源（可能在 utils/ 某文件），新 composable 用同来源 import。

### 改动 5：`web/src/views/artist/OrderDetail.vue` 装配（核心）

> **一号决策（模板不拆）**：本试水批**只拆 script 4 区块成 composables，模板 660 行保持原样**。父组件解构 composable 返回值，**模板零改动**（变量名一致）。目标：拆后 OrderDetail.vue = 模板660 + script装配<500 + style354 ≈ **<1500 行**。试水批核心是验证 script 拆分模式跑通（依赖注入/共享状态/刷新回调/测试全绿），模板子组件拆分放下一批。

1. **script setup 开头**（L661-681 import 区后）新增 import：
```js
import { useOrderWorkflow } from '../../composables/useOrderWorkflow.js'
import { useOrderGallery } from '../../composables/useOrderGallery.js'
import { useOrderDeadline } from '../../composables/useOrderDeadline.js'
import { useOrderPaymentPanel } from '../../composables/useOrderPaymentPanel.js'
```
2. **删除** L727-853（workflow 区块原代码）+ L854-951（gallery 区块）+ L965-1047（deadline 区块）+ L1086-1203（payment 面板区块原代码）。
3. **装配**（在 loadOrder 定义后）：
```js
// ─── 瘦身批装配（v0.40）：4 区块抽 composable，零行为变化 ───
const statusAction = ref('')  // 从 L1051 提前，workflow/changeStatus 共享
const { hasWorkflow, isTerminal, workflowStages, currentStageIdx, stageProgress, nextStage, nextStageName,
  canAdvanceStage, canBackStage, advanceStage, backStage, turnOffStageTracking,
  trackOnLoading, enableTracking, loadWorkflowStages } =
  useOrderWorkflow({ order, routeId: route.params.id, statusAction })
const {
  galleryInputEl, galleryUploading, isGalleryDragOver, galleryViewerVisible, galleryViewerIndex,
  openGalleryViewer, triggerGalleryUpload, handleGalleryFileSelect, handleGalleryDrop,
  guardDragEnter, guardDragOver, guardDrop, selectFocusImage
} = useOrderGallery({ order, routeId: route.params.id, onRefresh: loadOrder })
const { daysLeft, deadlineChip, deadlinePicker, disableDeadlineDate, disableStartDateDate, changeDeadline, startDatePicker, changeStartDate } =
  useOrderDeadline({ order, routeId: route.params.id })
const {
  payments, paymentsLoading, paymentSubmitting, loadPayments,
  payDialogVisible, payForm, submitPayment, nodePayDialogVisible, nodePayTarget, nodePayForm,
  openNodePayDialog, submitNodePayment, handleRevokePayment,
  poolPaidCents, poolFinalCents, poolRemainingCents, poolPercent, poolOverpaidCents,
  installmentRefs, nextDueInstallment, remainingCents, scrollToPayment
} = useOrderPaymentPanel({ order, routeId: route.params.id, onRefresh: loadOrder })
```
4. **模板零改动**：所有模板绑定变量名与拆前一致（workflowStages/advanceStage/galleryInputEl/uploadGalleryFiles/payDialogVisible/poolPercent 等），解构后同名可用。
5. **usePasteUpload 留在父组件**：L929-940 原样保留（focus 路由含 uploadNoteImage 备注区块，不拆）。onFiles 里 `await uploadGalleryFiles(files)` 不变（解构后同名）。gallery 的粘贴能力由父组件 onFiles 回调获得——useOrderGallery **不挂载** usePasteUpload、**不返回** pasteError。
6. **不拆区块留在父组件**：changeStatus(L1053-1064)/slideCancel(L1066-1084)/changePriority(L953-963)/note 区块(L1205-末尾)/formatCents 等工具函数——保持原样，statusAction 提前到装配处定义（changeStatus 继续用它）。

### 改动 6：新建 `docs/待修复问题清单.md`

```md
# 待修复问题清单（瘦身批执行中发现，不顺手改，记这里）

> 规则：执行拆分时发现的新问题（无关文件/越权/潜在 bug）记此清单，交付时随报告提交，一号排期处理。**禁止顺手修复**（保持重构 diff 纯净）。

（初始为空，执行中发现再填）
```

## 五、验证门禁（跑完才算完成）

```powershell
cd D:\Hermes Agent CN Desktop\workspace\artist-commission-w15
# 1. oxlint 新文件+父组件
npx oxlint web/src/composables/useOrderWorkflow.js web/src/composables/useOrderGallery.js web/src/composables/useOrderDeadline.js web/src/composables/useOrderPaymentPanel.js web/src/views/artist/OrderDetail.vue

# 2. web 单测
npm run test:web --prefix web 2>&1 | Select-Object -Last 8

# 3. web build
npm run build --prefix web 2>&1 | Select-Object -Last 5
```

**验证断言**：
- 全部测试通过（215 基线，拆分不改行为 → 必须 215/215；新增测试可选但鼓励对 workflow/gallery composable 加 1-2 条冒烟）。
- build 成功（无 missing export / 未定义变量）。
- `Select-String -Path web/src/views/artist/OrderDetail.vue -Pattern 'workflowStages|advanceStage|uploadGalleryFiles|payDialogVisible'` 至少各 1 处（模板引用仍在，且值来自 composable）。
- 人工确认：OrderDetail.vue 行数明显下降（脚本区 884 → <500）。

## 六、交付物

1. 改动 commit 到 `beta/orderdetail-slim`（message：`refactor: OrderDetail瘦身试水——script 4区块抽composable(workflow/gallery/deadline/payment),零行为变化`，可拆多次 commit）。
2. 交付报告 `docs/comms/02-to-01-OrderDetail瘦身试水-交付.md`（commit 进分支，抬头「**五号转交一号，文件：docs/comms/02-to-01-OrderDetail瘦身试水-交付.md**」）：
   - 每个 composable 的职责一句话 + 导出清单
   - 自修/纠偏说明（如 formatCents 来源、statusAction 处理、paste 归属等与派工假设不符处）
   - 自测结果（真实输出摘要）
   - OrderDetail.vue 拆前/拆后行数对比
   - 卡点（如有）
3. 新建的 4 个 composable + 清单文件路径列全。

## 七、红线

- **纯重构零行为变化**：不改 API 契约/错误码/i18n 键/schema/样式；模板变量名与现有引用一致。
- 只动授权文件；不建子组件目录（改动 5/6 已取消）；不改 useOrderPayments.js 本体。
- 每步验证通过再下一步；红了立即回退该步。
- 发现新问题记 `docs/待修复问题清单.md`，不顺手改。
- 不推送、不合并、不改 STATUS。
