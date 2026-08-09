# formatYuan 统一重构 — 侦察施工图

- 侦察人：二号（前端 / 只读侦察）
- 日期：2026-08-09　分支：`refactor/format-yuan`（工作树干净）
- 扫描范围：`web/src`（排除 `locales/`、`__tests__/`、`dist/`、`node_modules/`）
- 方法：`rg` 全量定位 ¥ / toFixed / format* 家族 / parseFloat / Number / Intl，逐点读文件核对行号与数据口径
- 结论摘要：**可等价迁移的「分→元」点位约 30 行（A1 必改）＋已走 formatCents 的约 30 行（D，可选折叠）＋「元源/整数语义」点位约 20 处（A2，待拍板，禁止强迁）**。全量扫描未发现任何千分位需求。

---

## ① money.js 扩展方案

现状（`web/src/utils/money.js`，唯一已核实的事实源）：

```js
export function formatCents(cents) {
  return ((cents || 0) / 100).toFixed(2)   // 分→元，两位小数，无千分位，无 ¥，负数内嵌 "-"
}
```

### 必加：`formatYuan(cents)`

```js
/** 金额分 → 「¥元」字符串（¥ 前缀 + formatCents；负数输出 ¥-12.00，与现各点 `¥{{ (x/100).toFixed(2) }}` 完全等价） */
export function formatYuan(cents) {
  return `¥${formatCents(cents)}`
}
```

等价性证明（A1 全部点位成立）：

| 现状写法 | 迁移后 | 等价性 |
| --- | --- | --- |
| `¥{{ (x / 100).toFixed(2) }}` | `{{ formatYuan(x) }}` | x 为 number 时分母、toFixed(2) 完全一致；null/undefined 均归 0.00 |
| `+¥{{ (x / 100).toFixed(2) }}` | `+{{ formatYuan(x) }}` | 同上 |
| `-¥{{ (x / 100).toFixed(2) }}` | `-{{ formatYuan(x) }}` | 折扣金额恒正，等价 |
| `¥${(x / 100).toFixed(2)}`（字符串拼接） | `formatYuan(x)` | 同上 |
| `¥{{ formatCents(x) }}`（D 类） | `{{ formatYuan(x) }}` | formatYuan 定义即 ¥+formatCents，逐字等价 |

边界差异（仅一处，标注不处理）：手写 `(NaN / 100).toFixed(2)` = `"NaN"`，而 `formatCents(NaN)` = `"0.00"`（`NaN || 0` 短路）。业务数据不可能为 NaN（金额均来自后端整数分或 `Number()` 兜底），不构成行为差异。

### 待拍板项（不擅自加）

1. **千分位**：全量扫描 0 处使用千分位。若日后统一加千分位属**新显示行为**，需单独拍板，不在本次。
2. **`formatYuanValue(yuan)`**：约 20 处点位输入**已是元**（`base_price`、`preview.totalPrice`、`displayPrice`、`customAddonsTotal`、`discount_value` 等），无法等价套 formatCents。若要把它们也收进 money.js，建议新增 `formatYuanValue(yuan) = `¥${Number(yuan ?? 0).toFixed(2)}``（等价保行为）；否则保持现状。**建议拍板：新增**（消除手写 toFixed(2)），但需先确认各数据源 ≤2 位小数（见风险 R3）。
3. **负数符号位**：`formatYuan` 默认输出 `¥-12.00`（¥ 在负号前）。现有特殊点（PaymentPanel 的 `-/+¥` 手拼、ManualOrderRight 的 `-¥xx.xx`）保持各自手写符号位，不引入 formatSignedYuan。
4. **addon-utils 私有实现迁移**（formatPrice / 整数裁剪 formatCents）：行为与 utils 版不同，迁移方案见批 6，需拍板。

---

## ② 分类总表

### A1 — 分源纯显示（应统一，等价迁移 formatYuan/formatCents）

| 文件 | 行号 | 数据源 |
| --- | --- | --- |
| `web/src/views/client/OrderForm.vue` | 176, 180, 184, 188, 192, 196, 223, 227, 231, 373, 377, 381, 385, 389, 400, 443, 447, 451, 455, 459, 469, 750, 751, 752, 753, 754 | `*Cents` 后端返分 |
| `web/src/components/artist/order/ManualOrderRight.vue` | 143, 147, 151, 155, 159, 168, 180, 245, 249, 253, 257, 261, 270, 281, 445-448, 591-593 | `*Cents` / 混合源（见批 3 公式） |
| `web/src/views/artist/StandaloneIncome.vue` | 178-179（`fmtYuan` 私有函数本体） | `amountCents` |
| `web/src/views/artist/ToolsExport.vue` | 96-97（`fmtYuan` 私有函数本体） | `overview.standaloneCents` |

### A2 — 元源 / 整数语义显示（列出，待拍板，禁止强迁 formatCents）

| 文件 | 行号 | 现状输出 |
| --- | --- | --- |
| `web/src/views/client/OrderForm.vue` | 93 | `¥{{ sz.base_price }}` → "¥80"（整元） |
| `web/src/views/client/OrderForm.vue` | 217 | `-¥${discountResult.discountValue}` → "-¥50"（固定折扣整元） |
| `web/src/views/client/OrderForm.vue` | 340, 368, 396, 412, 465, 756 | `¥{{ displayPrice.toFixed(2) }}` / `base_price.toFixed(2)` → "¥80.00"（元源两位小数） |
| `web/src/components/artist/order/ManualOrderRight.vue` | 54 | `¥{{ sz.base_price }}` → "¥80" |
| `web/src/components/artist/order/ManualOrderRight.vue` | 232, 330 | `¥{{ displayPrice || '—' }}`（displayPrice 为已格式化字符串） |
| `web/src/views/artist/PriceCalculator.vue` | 35, 67, 103, 105, 108, 116, 238-241 | `¥{{ Number(x).toFixed(2) }}` / `¥{{ opt.price }}`（元源） |
| `web/src/components/templates/TplTierGrid.vue` | 17, 49 | `¥{{ tier.price }}` → "¥80" |
| `web/src/components/templates/TplStyleGrid.vue` | 58, 100, 185 | `¥{{ sz.base_price }}`、起步价 `¥80+` |
| `web/src/components/templates/TplStyleGrid.vue` | 173 | 裸 `base_price` 传入 i18n 文案 `styleSizeHint`（文案内嵌 ¥，见风险 R1） |
| `web/src/components/artist/ArtStyleManager.vue` | 97 | `¥{{ size.base_price }}` |
| `web/src/views/admin/ArtistDetailDrawer.vue` | 39 | `¥{{ sz.base_price }}` |
| `web/src/components/artist/DiscountCodeManager.vue` | 26 | `¥${row.discount_value}`（固定折扣整元） |

### A-addon — addon-utils 私有实现（语义特殊，迁移需保行为）

| 文件 | 行号 | 说明 |
| --- | --- | --- |
| `web/src/components/artist/addon-utils.js` | 42-47 | `formatPrice`：percent `+N%` / quantity `¥N/位` / fixed `¥N`（**元、整数、无 toFixed**） |
| `web/src/components/artist/addon-utils.js` | 50-53 | `formatCents`：**¥ 前缀 + 整数裁剪**（`¥80` / `¥80.50`），与 utils/money.formatCents 语义不同 |
| `web/src/components/artist/AddonPreviewDialog.vue` | 25, 33, 40, 47 | 使用 addon-utils.formatCents，输出 "¥80" 或 "¥80.50" |
| `formatPrice` 调用方 | `useOrderForm.js:142`、`ManualOrderRight.vue:561`、`AddonTemplateManager.vue:21`、`ArtStyleManager.vue:276`、`AddonSettingsDialog.vue:142,144` | 若 formatPrice 迁 money.js，调用方 import 改源即可 |

### B — 输入解析 / 数值换算（列出，不动）

| 文件 | 行号 | 说明 |
| --- | --- | --- |
| `web/src/composables/useOrderPaymentPanel.js` | 59, 92, 97 | 元→分提交、弹窗元预填 |
| `web/src/views/artist/OrderDetail.vue` | 881, 916 | 附加项/改价弹窗 元→分 |
| `web/src/components/artist/order/ManualOrderRight.vue` | 443, 447, 462, 673, 797 | 自定义增项 Number() 解析、元→分提交 |
| `web/src/views/artist/StandaloneIncome.vue` | 134 | 记一笔 元→分 |
| `web/src/composables/useOrderForm.js` | 190, 198, 331-336, 349 | 折扣/展示价/分期计算（数值口径，非显示格式化） |
| `web/src/utils/message-parser.js` | 18 | 预算金额正则（输入识别） |
| `web/src/views/artist/ManualOrder.vue` | 75 | 预算线索提示回显（数值原文，非格式化） |
| 输入框 ¥/% 后缀装饰 | `AddonCreateDialog.vue:53`、`AddonTemplateManager.vue:73`、`AddonSettingsDialog.vue:27,80` | 是输入辅助非金额格式化，不动 |

### C — 非金额 toFixed / 格式化（列出，不动）

| 文件 | 行号 | 说明 |
| --- | --- | --- |
| `PaymentBar.vue` | 70 | 阶段百分比（basisPoints） |
| `WorkflowOverviewStrip.vue` | 34 | 百分比 |
| `OrderTimeline.vue` | 20 | 百分比（toFixed(0)） |
| `StageListView.vue` | 44, 58 | 百分比 |
| `TrackingAnalytics.vue` | 100 | 占比 |
| `useOrderForm.js` | 472 | 文件大小 MB |
| `usePasteUpload.js` | 74 | 文件大小 MB |
| `ManualOrderLeft.vue` | 175 | 文件大小 MB |
| `ArtistManage.vue` | 388-389 | 字节格式化 KB/MB |
| `DeliveryPage.vue` | 72-73 | 字节格式化 |
| `ArtworkManage.vue` | 339 | 文件大小 MB |
| `web/src/utils/reply-templates.js` | 26, 30, 50 | 静态话术 `¥XX` 占位符，非代码格式化 |

### D — 已走 formatCents（不动；可选等价折叠为 formatYuan）

| 文件 | 行号 | 形态 |
| --- | --- | --- |
| `web/src/views/client/TrackOrder.vue` | 135, 141, 146, 147, 148, 149, 210, 214, 215, 216 | `¥{{ formatCents(...) }}` |
| `web/src/views/admin/ArtistManage.vue` | 98, 99, 100, 107 | `¥{{ formatCents(...) }}` |
| `web/src/views/artist/ReturningClients.vue` | 20 | `¥{{ formatCents(...) }}` |
| `web/src/components/artist/dashboard/GreetingHero.vue` | 21, 23 | `¥{{ formatCents(...) }}` |
| `web/src/components/artist/dashboard/RevenueChart.vue` | 22, 46 | `¥${formatCents(...)}` |
| `web/src/components/artist/order/PaymentPanel.vue` | 15, 16, 20, 32, 53, 55, 56, 59 | `¥{{ formatCents(...) }}`（32 行为 `-/+¥` 手拼符号位，保留） |
| `web/src/views/artist/OrderDetail.vue` | 130, 133, 323, 341, 358, 1210 | `¥` 在外层，可折叠 |
| `web/src/views/artist/OrderDetail.vue` | 1207, 1216, 1217 | **i18n 文案内嵌 ¥，必须保持裸 formatCents**（见 R1） |
| `web/src/composables/useOrderPaymentPanel.js` | 123 | `¥${formatCents(...)}` 可折叠；**71 必须保持裸 formatCents**（文案内嵌 ¥） |
| `web/src/components/artist/order/ManualOrderLeft.vue` | 95 | **必须保持裸 formatCents**（文案内嵌 ¥） |

---

## ③ 分批施工清单

> 约定：模板中 `¥{{ ... }}` 里的 ¥ 移到函数内后，模板只剩 `{{ formatYuan(...) }}`。字符串拼接同理。

### 批 1 — money.js 扩展 + fmtYuan 直接替换（3 文件）

**`web/src/utils/money.js`**
- 新增 `formatYuan(cents)`（见 ①）。不改动 `formatCents`。

**`web/src/views/artist/StandaloneIncome.vue`**（L178-179）
- before：`function fmtYuan(cents) { return \`¥${formatCents(cents)}\` }`
- after：删除私有函数，import 改 `{ formatCents, formatYuan }`；L71 调用点 `fmtYuan(item.amountCents)` → `formatYuan(item.amountCents)`

**`web/src/views/artist/ToolsExport.vue`**（L96-97）
- before：`function fmtYuan(cents) { return \`¥${formatCents(cents)}\` }`
- after：同上；L42 调用点 `fmtYuan(overview.standaloneCents)` → `formatYuan(...)`

### 批 2 — OrderForm.vue（1 文件，26 行分源点位）

模板（全部 cents 源）：

| 行号 | before | after |
| --- | --- | --- |
| 176 | `¥{{ (stylePricePreview.baseCents / 100).toFixed(2) }}` | `{{ formatYuan(stylePricePreview.baseCents) }}` |
| 180, 184 | `+¥{{ (item.amountCents / 100).toFixed(2) }}` | `+{{ formatYuan(item.amountCents) }}` |
| 188 | `¥{{ (stylePricePreview.subtotalCents / 100).toFixed(2) }}` | `{{ formatYuan(stylePricePreview.subtotalCents) }}` |
| 192, 196 | `+¥{{ (stylePricePreview.usage/rush.incrementCents / 100).toFixed(2) }}` | `+{{ formatYuan(...) }}` |
| 223 | `¥{{ (stylePricePreview.totalCents / 100).toFixed(2) }}` | `{{ formatYuan(stylePricePreview.totalCents) }}` |
| 227, 389, 459 | `-¥{{ (…amountCents / 100).toFixed(2) }}` | `-{{ formatYuan(...) }}` |
| 231, 400, 469 | `{{ inst.label }} ¥{{ (inst.amountCents / 100).toFixed(2) }}` | `{{ inst.label }} {{ formatYuan(inst.amountCents) }}` |
| 373, 377, 443, 447 | `+¥{{ (item.amountCents / 100).toFixed(2) }}` | `+{{ formatYuan(item.amountCents) }}` |
| 381, 385, 451, 455 | `+¥{{ (…incrementCents / 100).toFixed(2) }}` | `+{{ formatYuan(...) }}` |

copyOrderSummary 字符串拼接：

| 行号 | before | after |
| --- | --- | --- |
| 750 | `` `+¥${(it.amountCents / 100).toFixed(2)}` `` | `` `+${formatYuan(it.amountCents)}` `` |
| 751 | 同上（percentAddonItems） | 同上 |
| 752, 753 | `` `+¥${(p.usage/rush.incrementCents / 100).toFixed(2)}` `` | `` `+${formatYuan(...)}` `` |
| 754 | `` `-¥${(p.discount.amountCents / 100).toFixed(2)}` `` | `` `-${formatYuan(...)}` `` |

- import 追加：`import { formatYuan } from '../../utils/money.js'`（当前未 import）
- 本文件 A2 行（93 / 217 / 340 / 368 / 396 / 412 / 465 / 756）**不在本批**，见批 7 决策清单。

### 批 3 — ManualOrderRight.vue（1 文件）

分源模板行（桌面 + 移动明细两套，行为一致）：

| 行号 | before | after |
| --- | --- | --- |
| 143, 245 | `¥{{ ((stylePricePreview.baseCents ?? 0) / 100).toFixed(2) }}` | `{{ formatYuan(stylePricePreview.baseCents ?? 0) }}` |
| 147, 151, 249, 253 | `+¥{{ (item.amountCents / 100).toFixed(2) }}` | `+{{ formatYuan(item.amountCents) }}` |
| 155, 159, 257, 261 | `+¥{{ (…incrementCents / 100).toFixed(2) }}` | `+{{ formatYuan(...) }}` |

混合源 / 元源合计行（**统一为分后格式化**，公式见下）：

| 行号 | before | after |
| --- | --- | --- |
| 168, 270 | `¥{{ (((stylePricePreview.totalCents ?? 0) / 100) + customAddonsTotal).toFixed(2) }}` | `{{ formatYuan((stylePricePreview.totalCents ?? 0) + Math.round(customAddonsTotal * 100)) }}` |
| 180, 281 | `¥{{ customAddonsTotal.toFixed(2) }}` | `{{ formatYuan(Math.round(customAddonsTotal * 100)) }}` |

等价性：`customAddonsTotal` 由 `el-input-number :precision="2"` 录入求和（最多 2 位小数），`Math.round(x*100)` 精确转分；`(a/100 + b).toFixed(2)` 与 `((a + round(b*100))/100).toFixed(2)` 对 ≤2 位小数的业务输入逐字一致（浮点边界见风险 R4）。

私有函数：

| 行号 | before | after |
| --- | --- | --- |
| 445-448 `formatCustomAddonPrice` | `` `${v < 0 ? '-' : ''}¥${Math.abs(v).toFixed(2)}` `` | `` `${v < 0 ? '-' : ''}${formatYuan(Math.round(Math.abs(v) * 100))}` ``（符号位保留） |
| 591-593 `displayPrice` | 三支 `xxx.toFixed(2)` | ① `formatCents(Math.round(finalPriceYuan.value * 100))` ② `formatCents((stylePricePreview.value.totalCents ?? 0) + Math.round(customAddonsTotal.value * 100))` ③ `formatCents(Math.round(customAddonsTotal.value * 100))` |

说明：`displayPrice` 保持**返回裸字符串**（不含 ¥），L232 / L330 的 `¥{{ displayPrice || '—' }}` 不动；L330 空值 `'¥—'` 现状保留。

- import 追加：`import { formatCents, formatYuan } from '../../../utils/money.js'`（当前仅 import formatPrice）
- 本文件 A2 行 54 / 232 / 330 不在本批。

### 批 4 — D 类折叠 A（5 文件，可选但推荐）

统一改法：`¥{{ formatCents(x) }}` → `{{ formatYuan(x) }}`；`¥${formatCents(x)}` → `formatYuan(x)`。逐字等价，无行为变化。

| 文件 | 行号 |
| --- | --- |
| `web/src/views/client/TrackOrder.vue` | 135, 141, 146, 147, 148, 149, 210, 214, 215, 216 |
| `web/src/views/admin/ArtistManage.vue` | 98, 99, 100, 107 |
| `web/src/views/artist/ReturningClients.vue` | 20 |
| `web/src/components/artist/dashboard/GreetingHero.vue` | 21, 23 |
| `web/src/components/artist/dashboard/RevenueChart.vue` | 22, 46 |

### 批 5 — D 类折叠 B（3 文件，可选但推荐）

| 文件 | 行号与处理 |
| --- | --- |
| `web/src/components/artist/order/PaymentPanel.vue` | 15, 16, 20, 53, 55, 56 → formatYuan；**32 行 `-/+¥` 手拼符号位保留**；59（`payRefPartial` 占位，文案无 ¥）→ `formatYuan(inst.paidCents)` |
| `web/src/views/artist/OrderDetail.vue` | 130, 133, 323, 341, 358, 1210 → formatYuan；**1207, 1216, 1217 保持裸 formatCents**（文案内嵌 ¥） |
| `web/src/composables/useOrderPaymentPanel.js` | 123 → `formatYuan(payment.amount_cents)`；**71 保持裸 formatCents**（文案内嵌 ¥） |

### 批 6 — addon-utils 私有实现迁移（2 文件，需先拍板）

**`web/src/components/artist/addon-utils.js`**
- 方案：`formatCents`（L50-53，¥+整数裁剪语义）迁入 `utils/money.js` 更名 `formatYuanShort`；`formatPrice`（L42-47）迁入 `utils/money.js` 原样保留。addon-utils 改为 `export { formatPrice, formatYuanShort } from '../../utils/money.js'` 再 `export { formatYuanShort as formatCents }` 兼容既有调用方。
- 或保守方案：保持 addon-utils 不动，仅在新代码禁入。
- **铁律**：不得把 AddonPreviewDialog 切到 utils/money.formatCents（会把 `¥80` 变 `80.00`，行为变化）。

**`web/src/components/artist/AddonPreviewDialog.vue`**
- 若批 6 迁移落地：L25, 33, 40, 47 的 `formatCents(...)` import 源自动跟随，无需改行。

### 批 7 — A2 决策清单（不写代码，先拍板）

1. 确认 `base_price` / `tier.price` / `discount_value` 等后端字段**恒为整元或 ≤2 位小数**（R3）。
2. 拍板是否新增 `formatYuanValue(yuan)`（推荐），并把以下点位等价迁移：
   - `OrderForm.vue`：93, 217, 340, 368, 396, 412, 465, 756
   - `ManualOrderRight.vue`：54, 232, 330
   - `PriceCalculator.vue`：35, 67, 103, 105, 108, 116, 238-241（其中 240 的 `formatAddonPrice` 与 addon-utils.formatPrice 的 fixed 分支**行为不同**：前者恒两位小数，后者整元；不可互替，需单独决定）
   - `TplTierGrid.vue`：17, 49；`TplStyleGrid.vue`：58, 100, 185；`ArtStyleManager.vue`：97；`ArtistDetailDrawer.vue`：39；`DiscountCodeManager.vue`：26
3. 未拍板前，A2 一律保持现状。

---

## ④ 风险点清单

**R1｜i18n 文案内嵌 ¥（最高风险，双 ¥ 陷阱）**：以下文案的 ¥ 在 locale 字符串里，调用方必须保持裸 `formatCents`，绝不能换 formatYuan：
- zh-CN.js：957 `payRefundExceed`（`…已收金额 ¥{amount}`）、977 `logDetail.priceChange`（`¥{from} → ¥{to}`）、979 `paymentAdd/paymentRevoke`（`收款 ¥{amount}`）、1027 `clientSummaryPaid`（`累计 ¥{amount}`）、597 `styleSizeHint`（`¥{price}`）
- 对应调用方：`useOrderPaymentPanel.js:71`、`OrderDetail.vue:1207/1216/1217`、`ManualOrderLeft.vue:95`、`TplStyleGrid.vue:173`
- 迁移若改这些点位 → 渲染成 `¥¥80.00`。批 5 已显式排除。

**R2｜动态/字符串拼接与剪贴板文本**：`OrderForm.vue:750-756` 的 copyOrderSummary 拼接字符串会被 `navigator.clipboard` 或 ElMessage 原样输出（剪贴板不可用兜底）。迁移后格式逐字等价（`+¥80.00`），但改完需人工核对一份摘要文本；`ManualOrderRight.vue:330` 空价显示 `'¥—'` 的现状不能动。

**R3｜元源字段单位假设**：`base_price` 被 `computeSizePreview` 以 `Math.round(base_price * 100)` 使用，证明是元；`PriceCalculator` 的 `preview.totalPrice/basePrice/item.amount/multiplierTotal` 字段名与 OrderForm 的 `*Cents` 不同，**疑似元口径但需后端确认**——在确认前禁止把 PriceCalculator 迁到 formatCents。

**R4｜浮点合计边界**：`ManualOrderRight` 混合源 `(totalCents/100) + customAddonsTotal` 两式浮点路径不同（先除后加 vs 先取整再加再除），极端小数位组合存在理论性 1 分位差异；业务输入已限 `precision=2`，风险极低，但批 3 的 168/270/591-593 改造需以 `npm run test:web` 的 `ManualOrder.stylemode.test.js`（断言 `-¥50.00`、`¥180.00`）为回归锚点。

**R5｜测试断言依赖**（改代码前先跑一遍基线）：
- `useOrderForm.test.js:307-308`：`styleAddonPriceText` 输出 `¥30` / `¥15/位`（formatPrice 三态语义）
- `ManualOrder.stylemode.test.js:401`：`-¥50.00`；`:520`：`¥180.00`
- `OrderDetail.duebanner.test.js:219, 225, 232, 254, 258`：`¥133.60` / `¥18.90` / `¥50.00` / `¥103.60`

**R6｜过时注释**（非行为，建议顺手清理）：`useOrderPaymentPanel.js:11-12`、`PaymentPanel.vue:94`、`OrderDetail.vue:864`、`TrackOrder.vue:346`、`ArtistManage.vue:267`、`GreetingHero.vue:87`、`RevenueChart.vue:84` 均声称「本地 formatCents」，实际已全部 import `utils/money.js`，无本地副本——**当前不存在隐藏重复实现，注释可删**。

**R7｜两套 formatCents 并存**：`addon-utils.js:50` 的 formatCents（¥+整数裁剪）与 `utils/money.js:7`（裸两位小数）**同名不同义**。批 6 未落地前，改代码时禁止互替；收敛断言需分别覆盖。

**R8｜负数展示三态并存**：① `¥{{ formatCents(neg) }}` → `¥-12.00` ② PaymentPanel 手拼 `-¥12.00` ③ formatCustomAddonPrice `-¥12.00`。formatYuan 只保证 ①；②③ 各自保留符号位逻辑，不在本次统一。

---

## ⑤ 验证方式

执行顺序（web/ 目录下）：

```bash
npm run lint          # eslint .
npm run test:web      # vitest run（R5 三个测试文件为回归锚点）
npm run build         # vite build
npm run check:i18n    # 双语文案占位符一致性
```

收敛断言（改造完成后）：

```bash
# 1) 金额类 toFixed(2) 只允许存在于 money.js（C 类全是 toFixed(1)/(0)，天然排除）
rg -n "toFixed\(2\)" web/src -g '!**/locales/**' -g '!**/__tests__/**'
#   → 期望仅剩 web/src/utils/money.js:8（批 6 未落地时 addon-utils.js:52 亦允许）

# 2) 模板内联除法格式化清零
rg -n "¥\{\{ \(|/ 100\)\.toFixed" web/src -g '!**/locales/**' -g '!**/__tests__/**'
#   → 期望 0

# 3) 模板字面量 ¥${ 清零（reply-templates.js 的 ¥XX 是字面量不含 ${）
rg -n "¥\$\{" web/src -g '!**/locales/**' -g '!**/__tests__/**'
#   → 期望 0

# 4) formatYuan 覆盖统计
rg -n "formatYuan\(" web/src -g '!**/locales/**' -g '!**/__tests__/**'
```

人工验证点：
- OrderForm 下单摘要「复制约稿信息」文本（R2）
- ManualOrder 桌面/移动两端价格明细与自定义增项负数（R4）
- OrderDetail / PaymentPanel 收款、撤销、日志文案无双 ¥（R1）

---

## 附：行号核对说明

全部行号由 `rg -n` 于 2026-08-09 在 `refactor/format-yuan` 分支实读核对；批 2/批 3 的 before 行已逐行比对模板与脚本源码，函数行号（StandaloneIncome 178-179、ToolsExport 96-97、ManualOrderRight 445-448 / 590-593、PriceCalculator 238-241、addon-utils 42-53）均已展开原文确认。
