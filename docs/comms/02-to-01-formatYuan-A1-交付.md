# formatYuan 统一重构 — A1 交付报告（02 → 01）

- 交付人：二号（前端执行）
- 日期：2026-08-09　分支：`refactor/format-yuan`
- 范围：施工图 A1 类（批1 / 批2 / 批3）。**A2 / A-addon / B / C / D 一律未动**；未 push、未合并、未碰 master。

## 一、变更总览（3 个 commit）

| commit | 内容 |
| --- | --- |
| `3eca32d` | 批1：`money.js` 新增 `formatYuan`；`StandaloneIncome.vue` / `ToolsExport.vue` 删除私有 `fmtYuan` |
| `ece23a8` | 批2：`OrderForm.vue` 26 个分源点位 → `formatYuan`（模板 21 + `copyOrderSummary` 字符串拼接 5）+ 新增 import |
| `3fe0c3e` | 批3：`ManualOrderRight.vue` 纯分源 10 行直接替换；混合源 4 行按施工图公式先合成整数分；私有函数 `formatCustomAddonPrice` / `displayPrice` 迁移 |

## 二、批1 明细

- `web/src/utils/money.js`：新增 `formatYuan(cents) = \`¥${formatCents(cents)}\``；`formatCents` 未改动。
- `StandaloneIncome.vue`：删除私有 `fmtYuan`（L178-179）；L71 调用点 → `formatYuan(item.amountCents)`。
- `ToolsExport.vue`：删除私有 `fmtYuan`（L96-97）；L42 调用点 → `formatYuan(overview.standaloneCents)`。
- 偏差说明（非行为差异）：施工图写「import 改 `{ formatCents, formatYuan }`」，但两个组件删除 `fmtYuan` 后 `formatCents` 已不再使用，保留会产生 `no-unused-vars` 告警，故只 import `formatYuan`。调用点唯一来源仍为 `utils/money.js`。

## 三、批2 明细（OrderForm.vue）

26 处与施工图行号一一对应：

- 模板 21 处：176、180、184、188、192、196、223、227、231、373、377、381、385、389、400、443、447、451、455、459、469
- `copyOrderSummary` 字符串拼接 5 处：750、751、752、753、754（`+¥${...}` / `-¥${...}` → `+${formatYuan(...)}` / `-${formatYuan(...)}`）
- 新增 `import { formatYuan } from '../../utils/money.js'`
- 本文件 A2 行 93 / 217 / 340 / 368 / 396 / 412 / 465 / 756 未动。

## 四、批3 明细（ManualOrderRight.vue）

### 前置调查：customAddonsTotal 小数位来源

- 唯一录入入口：`el-input-number :precision="2"`（桌面 L198 / 移动 L299）→ `customAddonPrice` → `addCustomAddon` push `priceYuan`（`Number()` 透传，≤2 位小数）。
- 草稿回填：`setDraftState` 用 `priceYuan: Number(a.priceYuan) || 0`；草稿源是 `getDraftState` 保存的本组件录入值（localStorage），无服务端或外部注入路径。
- `useOrderForm.js`：无 `customAddons` / `priceYuan` / `customAddonsTotal` 引用（rg 全量确认）。
- **结论：不存在 >2 位小数路径 → 混合源四行按施工图公式改造成立**（`Math.round(x * 100)` 精确转分）。

### 改动清单

- 纯分源 10 行直接替换：143 / 147 / 151 / 155 / 159（桌面）与 245 / 249 / 253 / 257 / 261（移动），`¥{{ (x / 100).toFixed(2) }}` → `{{ formatYuan(x) }}`（baseCents 保留 `?? 0` 兜底）。
- 混合源 4 行：
  - 168 / 270：`formatYuan((stylePricePreview.totalCents ?? 0) + Math.round(customAddonsTotal * 100))`
  - 180 / 281：`formatYuan(Math.round(customAddonsTotal * 100))`
- 私有函数：
  - `formatCustomAddonPrice`：`${v < 0 ? '-' : ''}${formatYuan(Math.round(Math.abs(v) * 100))}`（负号位保留，输出仍 `-¥xx.xx`）。
  - `displayPrice`（L591-593 三支）：改 `formatCents(...)`——保持**裸字符串不含 ¥**，L232 / L330 的 `¥{{ displayPrice || '—' }}` 与空态 `'¥—'` 原样不动。
- 本文件 A2 行 54 / 232 / 330 未动；`addon-utils.js` 与 `AddonPreviewDialog.vue` 未动。

## 五、验收记录（每批后均执行）

| 验收项 | 批1 | 批2 | 批3 |
| --- | --- | --- | --- |
| `npm run lint` | ✓ | ✓ | ✓ |
| `npx vitest run`（17 文件 / 254 用例） | ✓ | ✓ | ✓ |
| `npm run build` | ✓ | ✓ | ✓ |

### 最终收敛断言

```bash
rg -n "\( / 100\)\.toFixed\(2\)|/100\)\.toFixed" web/src \
  -g '!**/locales/**' -g '!**/__tests__/**' -g '!**/money.js'
```

→ **0 处**（无输出，`exit=1` 无匹配）。

参考断言（施工图⑤）：模板内联 `¥{{ (` 形态 = 0；`¥${` 剩余命中均为 A2 / D 类 / addon-utils 既有实现（本任务禁改范围）；`formatYuan(` 调用点共 43 处（批1:2 + 批2:26 + 批3:15）。`npm run check:i18n` OK（存量豁免 9 条，无新增硬编码中文）。

## 六、回归锚点与等价性

- 施工图 R5 锚点（`ManualOrder.stylemode.test.js` 的 `-¥50.00` / `¥180.00` 等）全部通过，**测试断言零修改**；如遇失败会先排查迁移正确性，不靠改断言蒙混。
- 无显示行为变化：`formatYuan = ¥ + formatCents` 与原 `¥{{ (x/100).toFixed(2) }}` 逐字等价；混合源在 ≤2 位小数业务输入下先取整分再格式化，与旧浮点路径逐字一致（R4 风险在 precision=2 前提下不成立）。

## 七、未执行项（用户范围外）

- 批4 / 批5（D 类折叠）、批6（addon-utils 迁移）、批7（A2 拍板）未动。
- 施工图 `docs/comms/formatYuan-施工图.md` 保持未跟踪状态，未纳入任何 commit。
