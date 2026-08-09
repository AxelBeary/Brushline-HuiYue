# formatYuan A2 批交付报告（02 → 01）

- 交付人：二号（前端执行）
- 日期：2026-08-09　分支：`fix/fya2`（基于 master `9a90ac7`，未 push / 未合并 / 未触碰 master）
- 依据：`docs/comms/formatYuan-施工图.md` A2 表 + A-addon 节；用户拍板：A2 元源收编 + 整数裁剪语义 + addon-utils 迁移

---

## 1. 变更总览

共 4 次 commit（3 次代码 + 1 次交付文档），全部在 `fix/fya2`：

| commit | 范围 |
| --- | --- |
| `43e4883` refactor(web): formatYuan A2 money.js 新增 formatYuanValue/formatAddonPrice/formatYuanTrimmed + addon-utils 价格格式化迁移 | money.js 扩展 + addon-utils 两个价格函数迁出 + 6 个调用方 import/调用点更新 |
| `e86ecb0` refactor(web): formatYuan A2 OrderForm.vue 元源点位迁移 formatYuanValue（含 copyOrderSummary 拼接） | OrderForm.vue 8 处 A2 点位 + 摘要复制拼接行 |
| `5fc5522` refactor(web): formatYuan A2 其余元源点位迁移 formatYuanValue（ManualOrderRight/PriceCalculator/模板/管理面） | ManualOrderRight 3 处、PriceCalculator 8 处、TplTierGrid 2 处、TplStyleGrid 3 处、ArtStyleManager/ArtistDetailDrawer/DiscountCodeManager 各 1 处 |
| `（本提交）` docs(comms): formatYuan A2 交付报告 | 本文件 |

改动面：13 个源文件，+85 / −62 行。未新增任何依赖；未格式化无关行；未触碰 B/C/D 类点位；locales 零改动。

## 2. money.js 新增函数（utils/money.js）

三个新函数，均位于 `web/src/utils/money.js`（行 22 / 35 / 46）：

**`formatYuanValue(yuan)`** — 元源格式化 + 整数裁剪：
- 整数 → `¥80`；非整数 → `¥80.50`（两位小数）；NaN/null/undefined → 按 0 处理 → `¥0`
- 负数 → `¥-12.00`（两位小数，¥ 在负号前，与 formatYuan 形态一致）

**`formatAddonPrice(price, priceMode, { controlType, unitLabel })`** — 自 addon-utils.formatPrice 原样迁入并更名：
- percent → `+N%`；quantity → `¥N/位`；fixed → `¥N`（元、整数、无 toFixed）

**`formatYuanTrimmed(cents)`** — 自 addon-utils.formatCents 原样迁入并更名：
- 分 → 元 + ¥ 前缀 + 整数裁剪（`¥80` / `¥80.50`）；与 `formatCents`（裸两位小数）语义不同，禁止互替

## 3. addon-utils 迁移

- `addon-utils.js`：移除 `formatPrice` / `formatCents` 两个函数；`addonPriceText` 内部改调 `formatAddonPrice`（自 money.js import），行为逐字不变
- 直接调用方 import 更新（formatPrice → formatAddonPrice，改源 money.js）：

| 调用方 | 变更 |
| --- | --- |
| `useOrderForm.js` | L36 import 改 `../utils/money.js`；L142 调用改 formatAddonPrice |
| `ManualOrderRight.vue` | L350 删除 addon-utils import，并入 L351 money.js import；L562 调用改 formatAddonPrice |
| `AddonTemplateManager.vue` | L21 模板调用、L98 import 改 formatAddonPrice（money.js） |
| `ArtStyleManager.vue` | L276 模板调用、L316 import 改 formatAddonPrice（money.js） |
| `AddonPreviewDialog.vue` | L25/33/40/47 的 formatCents → formatYuanTrimmed；L75 import 拆分（computeSizePreview 留 addon-utils，formatYuanTrimmed 自 money.js） |

- `AddonSettingsDialog.vue:142/144`：本分支无直接 `formatPrice` import（施工图行号来自上一基线 `refactor/format-yuan`），该两处实为 `addonPriceText` 内联调用，已由 addon-utils 内部接线完成迁移，import 无需改动（详见第 8 节）

## 4. A2 元源点位迁移清单

全部迁移为 `formatYuanValue`，¥ 前缀收进函数内：

| 文件 | 行号 | before → after |
| --- | --- | --- |
| OrderForm.vue | 93 | `¥{{ sz.base_price }}` → `{{ formatYuanValue(sz.base_price) }}` |
| OrderForm.vue | 217 | `` `-¥${discountResult.discountValue}` `` → `` `-${formatYuanValue(discountResult.discountValue)}` `` |
| OrderForm.vue | 340 / 396 / 412 / 465 | `¥{{ displayPrice.toFixed(2) }}` → `{{ formatYuanValue(displayPrice) }}` |
| OrderForm.vue | 368 | `¥{{ selectedSize.base_price.toFixed(2) }}` → `{{ formatYuanValue(selectedSize.base_price) }}` |
| OrderForm.vue | 756（copyOrderSummary） | `` `¥${displayPrice.value.toFixed(2)}` `` → `` `${formatYuanValue(displayPrice.value)}` `` |
| ManualOrderRight.vue | 54 | `¥{{ sz.base_price }}` → `{{ formatYuanValue(sz.base_price) }}` |
| ManualOrderRight.vue | 232 | `¥{{ displayPrice }}` → `{{ formatYuanValue(displayPrice) }}` |
| ManualOrderRight.vue | 330 | `¥{{ displayPrice || '—' }}` → `{{ displayPrice ? formatYuanValue(displayPrice) : '—' }}`（空值占位保留） |
| PriceCalculator.vue | 35 / 103 / 105 / 108 / 116 | `¥{{ Number(x ?? 0).toFixed(2) }}` → `{{ formatYuanValue(x) }}` |
| PriceCalculator.vue | 67 | `¥{{ opt.price }}`（裸值）→ `{{ formatYuanValue(opt.price) }}` |
| PriceCalculator.vue | 238-241 | 本地 formatAddonPrice 的 `'¥' + Number(a.price ?? 0).toFixed(2)` → `formatYuanValue(a.price ?? 0)`（quantity 单位后缀保留） |
| TplTierGrid.vue | 17 / 49 | `¥{{ tier.price }}` / `¥{{ activeTier.price }}` → formatYuanValue |
| TplStyleGrid.vue | 58 / 100 | `¥{{ sz.base_price }}` → `{{ formatYuanValue(sz.base_price) }}` |
| TplStyleGrid.vue | 185 | `` `¥${Math.min(...prices)}+` `` → `formatYuanValue(Math.min(...prices)) + '+'` |
| ArtStyleManager.vue | 97 | `¥{{ size.base_price }}` → `{{ formatYuanValue(size.base_price) }}` |
| ArtistDetailDrawer.vue | 39 | `¥{{ sz.base_price }}` → `{{ formatYuanValue(sz.base_price) }}` |
| DiscountCodeManager.vue | 26 | `` `¥${row.discount_value}` `` → `formatYuanValue(row.discount_value)` |

**TplStyleGrid.vue:173 不迁移**：i18n 文案 `styleSizeHint` 内嵌 ¥（zh-CN `¥{price}`），套 formatYuanValue 会渲染成 `¥¥80`；需同步改 locale 文案，超出「locales 保持原编码/不动」约束，保持裸 `base_price` 传参（原因见第 8 节）。

## 5. 行为变更清单（整数裁剪语义，用户已拍板接受）

**由 `¥80.00` 变 `¥80`（整数裁剪，toFixed(2) 系）**：
- OrderForm.vue 340 / 368 / 396 / 412 / 465 / 756（displayPrice / base_price.toFixed(2)）
- PriceCalculator.vue 35 / 103 / 105 / 108 / 116 / 238-241（Number(x).toFixed(2) 系 + 本地 formatAddonPrice）
- ManualOrderRight.vue 232 / 330（displayPrice 为 formatCents 两位小数串，经 formatYuanValue Number() 转换后裁剪）

**保持 `¥80` 不变（原即整元裸值）**：OrderForm 93 / 217、ManualOrderRight 54、TplTierGrid 17 / 49、TplStyleGrid 58 / 100 / 185、ArtStyleManager 97、ArtistDetailDrawer 39、DiscountCodeManager 26。

**非整数归一**（原裸值 → 两位小数，业务上罕见，属新语义）：
- OrderForm 217 / DiscountCodeManager 26 固定折扣：若出现 50.5，原显示 `-¥50.5` / `¥50.5`，现归一 `-¥50.50` / `¥50.50`
- PriceCalculator 67 radio 选项价：若出现 80.5，原 `¥80.5` → `¥80.50`

**负数**：formatYuanValue 负数恒两位小数（`¥-12.00`）；ManualOrderRight `formatCustomAddonPrice` 手拼符号位保留（`-¥50.00`，未裁剪），与 R8 三态决策一致。

## 6. 测试断言核对清单

逐条核对结果：**零断言改动**（全部命中点均不在裁剪语义范围，无迁移错误）。

| 测试断言 | 结论 | 核对说明 |
| --- | --- | --- |
| `ManualOrder.stylemode.test.js:520` `¥180.00` | 不改 | 来源 `.mo-price-sticky .price-line.total .price-amount` = ManualOrderRight.vue:168 `formatYuan((totalCents ?? 0) + Math.round(customAddonsTotal*100))`，**分源 formatYuan 两位小数点位**，非 A2 裁剪范围 |
| `ManualOrder.stylemode.test.js:401` `-¥50.00` | 不改 | 来源 `formatCustomAddonPrice(item)`（符号位手拼 + formatYuan(Math.round(\|v\|*100))），负数语义保留两位小数，非裁剪范围 |
| `OrderDetail.duebanner.test.js:219/225/232/254/258` `¥133.60/¥18.90/¥50.00/¥103.60` | 不改 | 来源 PaymentPanel/OrderDetail 的 D 类 formatCents 分源点位，本次未触碰 |
| `useOrderForm.test.js:307-308` `¥30 / ¥15/位` | 不改 | formatPrice → formatAddonPrice 输出逐字一致（percent/quantity/fixed 三态等价） |
| `OrderForm.summary.test.js` / `OrderForm.stepnav.test.js` | 不改 | 组件测试 mock `styleAddonPriceText`，未断言真实金额渲染 |

全量 `npx vitest run`：17 文件 / 254 项测试全绿，无断言修改、无批量改断言行为。

## 7. 收敛断言与验收

`web/` 目录下四项验收全绿：

| 命令 | 结果 |
| --- | --- |
| `npm run lint` | ✓ 0 error / 0 warning |
| `npx vitest run` | ✓ 17 files / 254 tests passed |
| `npm run build` | ✓ built in ~15s |
| `npm run check:i18n` | ✓ 存量违规 9 条豁免，无新增硬编码中文 |

收敛断言 grep（`web/src`，排除 locales/__tests__/dist/node_modules）：

| 断言 | 结果 |
| --- | --- |
| `toFixed(2)` | 仅剩 money.js（formatCents:8、formatYuanValue:25-26、formatYuanTrimmed:48），A2 文件清零 |
| `¥{{ (` / `/ 100).toFixed` | 0 命中 |
| `¥${` | 仅 D 类 formatCents 拼接（PaymentPanel/OrderDetail/RevenueChart/useOrderPaymentPanel）+ C 类百分比 + money.js 内部；A2 拼接形态（OrderForm 217/756、TplStyleGrid 185、DiscountCodeManager 26）清零 |

附注：`npx vitest run` 输出末尾的 `ECONNREFUSED:3000` 聚合错误为**基线存量噪音**（已在 master `9a90ac7` 工作树复跑验证同样出现且全部通过），非本次引入，不影响验收。

## 8. 遗留与说明

- **TplStyleGrid.vue:173 不迁移**：`styleSizeHint` 文案内嵌 ¥（zh-CN `¥{price}`），formatYuanValue 自带 ¥ 前缀会双 ¥（`¥¥80`）；迁需要同步改 locale 文案，超出「locales 保持原编码/不动」约束。保持裸 `base_price` 传参，属 R1 双 ¥ 陷阱显式排除点位。
- **addon-utils.js 未整文件删除**：该文件仍导出 `computeSizePreview` / `controlLabel` / `addonCategory` / `addonPriceText` 等 8 个领域纯函数，被 AddonPreviewDialog / AddonTemplateManager / ArtStyleManager / AddonSettingsDialog 引用。本次按 A-addon 节移除其中两个价格格式化函数；整文件删除需另迁其余函数，超出本任务范围。
- **AddonSettingsDialog 行号差异**：施工图基线（`refactor/format-yuan`）L142/144 为直接 `formatPrice` 调用；本分支（`fix/fya2` 基线 `9a90ac7`）为 `addonPriceText` 内联调用，迁移经 addon-utils 内部接线完成，import 无需改动。
- **ManualOrderRight 232/330**：displayPrice 为 formatCents 两位小数串，formatYuanValue 以 Number() 解析后裁剪；L330 空值 `'—'` 占位通过三元保留（防 `''` 被 Number 归 0 显示 `¥0`）。
- **formatAddonPrice 双义**：money.js 的 formatAddonPrice 与 PriceCalculator 本地同名函数语义不同（后者带 radio 文案与单位后缀），互不替换，各自保留。
- **R1/R2 复核**：未触碰文案内嵌 ¥ 的裸 formatCents 点位（useOrderPaymentPanel:71、OrderDetail:1207/1216/1217、ManualOrderLeft:95、TplStyleGrid:173）；copyOrderSummary 摘要文本经 formatYuanValue 逐字等价（整数裁剪语义下的 `¥80`）。
