# 05-派工-OrderDetail 拆分试水-20260807

> 派工：一号 → 五号（bugfix/重构）
> worktree：`artist-commission-w5`（分支 `beta/orderdetail-split`，已建好，HEAD=2449b6b）
> 开工第一步：**`git merge master` 再读本文件**。
> 蓝本：`docs/comms/核实-第三方瘦身施工单-20260807.md`（一号已审核落档，勘察约 85% 属实）。本文件是**修正后的施工图**，以本文件为准，施工单仅供背景。

## 一、任务总览

**OrderDetail.vue 拆分试水**（三巨头第一个，跑通模式后再派 QueueBoard/ManualOrder）。当前文件 **1503 行/72.6KB**（施工单基线 1898 已过时——v0.40 已把 script 4 区块抽成 composable，剩余大头是**模板区 + 剩余 script**）。

**目标：把模板大区块拆成子组件，父组件 ≤900 行**（施工单建议 ≤700 不可达，模板区本就大；A 方案工程量 +50% 本轮不做，采用折中：拆模板 gallery/付款两块 + 顺手收编 script 残留）。

## 二、现状（已核实锚点，不用再探）

- `web/src/views/artist/OrderDetail.vue`：**1503 行**，`<script setup>` 从 **L666** 起
- script 4 区块 v0.40 已抽 composable（**不用再抽**）：
  - `useOrderWorkflow`（L746-749 装配）
  - `useOrderGallery`（L750-754 装配，含 uploadGalleryFiles/selectFocusImage/validateImageFile/guardDrag 等）
  - `useOrderDeadline`（L755-756）
  - `useOrderPaymentPanel`（L757-763，含 payDialog 状态/payments/pool 计算）
- 模板大区块（需要拆）：
  - **收款/交付/沟通卡**（模板 L418-665 一带：payTitle 收款记录卡 L418-488、交付文件卡 L490-560、客户沟通卡 L395-416 也可并入）——**付款区块主拆点**
  - **画廊上传区**（模板 gallery 区，行号在交付卡之后，需你自己定位）
- 关键 props/状态：order/statusAction/isTerminal/pool 系列（poolPaidCents/poolFinalCents/poolRemainingCents/poolOverpaidCents/poolPercent）/payments/payDialogVisible/payForm/installmentRefs/formatCents 等
- 组件目录惯例：`web/src/components/artist/`（DeliverDialog.vue、visual/CardHead.vue 等都在此），composables 在 `web/src/composables/`

## 三、拆分方案（精确）

### 拆 1：`web/src/components/artist/order/PaymentPanel.vue`（新目录 order/）

从 OrderDetail.vue 模板拆出**收款记录卡**（L418-488 整卡，含 pool-summary 进度条 + pool-flow 收款流水 + pool-ref 节点收款），props 向下 / emit 向上：

```vue
<!-- PaymentPanel.vue（模板骨架，按原样搬移） -->
<template>
  <el-card class="od-card">
    <template #header>
      <CardHead :title="$t('orderDetail.payTitle')">
        <template #extra>
          <el-button type="primary" size="small" @click="$emit('open-pay')">{{ $t('orderDetail.payAddBtn') }}</el-button>
        </template>
      </CardHead>
    </template>
    <!-- 原 L427-487 内容原样搬移：pool-summary / pool-flow / pool-ref -->
  </el-card>
</template>

<script setup>
import CardHead from '../visual/CardHead.vue'
import InkEmpty from '../visual/InkEmpty.vue'

defineProps({
  payments: { type: Array, default: () => [] },
  paymentsLoading: Boolean,
  poolPaidCents: Number, poolFinalCents: Number, poolRemainingCents: Number,
  poolOverpaidCents: Number, poolPercent: Number,
  installmentRefs: { type: Array, default: () => [] },
  isTerminal: Boolean
})
const emit = defineEmits(['open-pay', 'revoke'])
function formatCents(v) { return (v / 100).toFixed(2) }
</script>
```

- 父组件替换为 `<PaymentPanel ... @open-pay="payDialogVisible = true" @revoke="handleRevokePayment" />`
- `handleRevokePayment` 保留在父组件（useOrderPaymentPanel 提供）
- `formatCents` 若父组件已有则子组件自带一份（纯函数，两处一致即可，不引全局）

### 拆 2：`web/src/components/artist/order/GalleryPanel.vue`（新目录 order/）

从 OrderDetail.vue 模板拆出**画廊上传/展示区**（gallery 区块，位置你自己定位——在模板交付卡之后、以 `galleryViewerVisible`/`galleryUploading`/`isGalleryDragOver` 相关 DOM 为界）：

- props：gallery 相关全部（galleryInputEl? 用 ref 透传或用 defineExpose、galleryUploading、isGalleryDragOver、galleryViewerVisible、galleryViewerIndex、order 子集如 order.gallery 之类）
- emit：trigger-upload / file-select / drop / open-viewer / select-focus
- 复用 `useOrderGallery`？**不要**——composable 已在父组件装配，子组件只做展示 + emit，数据流纪律：props 向下 + emit 向上（施工单 §四.4）
- 若 gallery 模板与 script 耦合太深（v-model 直接绑 composable 返回值），**允许折中**：把 useOrderGallery 的装配移进子组件（props 只收 order + onRefresh），父组件删掉对应装配行——两种都行，但**必须保证 loadOrder 刷新链路不变**

### 收编：script 残留顺手清理（可选，不强制）

父组件 script 区若有可安全移入 composable 的纯函数（如 formatDate/formatCents 小工具），**不强制**，保持零行为优先。

## 四、红线（零行为变化）

- **纯重构，功能零变化**：不改 API 契约、不改后端、不改 i18n 键、不改 DOM 结构/class（样式可原样搬入子组件 scoped，或保留父级全局样式）
- 拆分后父组件 import 新组件 + 模板替换为 `<PaymentPanel>`/`<GalleryPanel>`；**模板替换处行为必须逐行对照原模板**（v-if/v-for/事件/@click 一个不漏）
- 禁止顺手优化无关文件；新发现问题记 `docs/待修复问题清单.md`（已存在，追加即可）
- 每步提交前验证命令全绿；红了立即回退该步，不带病前进

## 五、验证门禁（验收必做，交付报告要附结果）

```bash
cd server && npm test && npm run typecheck && npm run lint   # 基线 939/939
cd web && npm run test:web && npm run lint && npm run build  # 基线 215/215
npm run test:e2e   # 根目录
```
- e2e 四主路径冒烟：工作流推进 / 画廊上传 / 付款登记 / 截止日修改（若 e2e 环境跑不起来，写明原因 + 手动浏览器验证步骤）
- **截图**：拆分前后 OrderDetail 页面各一张（视觉零变化证据，visual 门禁）

## 六、交付

- 交付报告写 `docs/comms/05-to-01-OrderDetail拆分-交付-20260807.md`：改动清单（新文件/父组件 diff 摘要）、测试结果、截图、行数变化（1503 → ?）
- 不推送、不合并、不改 STATUS；合入由一号执行
