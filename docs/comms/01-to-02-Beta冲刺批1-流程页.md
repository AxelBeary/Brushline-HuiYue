# 派工：二号 · Beta 冲刺批 1 —— 客户流程页视觉一致性（研报批次 A+B 合并）

> 分支：`beta/client-flow-polish` · worktree：`../artist-commission-w2`
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。
> 参考主文档：`docs/comms/02-to-01-前端全页面研判报告-20260806.md`（已合入 master，worktree 内可直接读）。

---

## 任务摘要

修二号前端全页面研判报告的「客户流程页」视觉一致性问题。客户从画师主页（宣纸/美术馆风格）点进下单/查单/交付页时，页面变成 EP 默认后台灰白风——两套视觉语言。本批把流程页统一进画师 palette 配色 + 修 6 处硬编码中文 + 删死样式 + 修小 bug。**不碰后端，纯前端。**

## 授权文件（只动这些）

- `web/src/views/client/OrderForm.vue`
- `web/src/views/client/TrackOrder.vue`
- `web/src/views/client/DeliveryPage.vue`
- `web/src/views/client/LandingPage.vue`
- `web/src/views/client/NotFound.vue`
- `web/src/styles/theme.css`（⚠️ 只加不删，见任务 M2）
- `web/vite.config.js`（仅修注释乱码）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（仅新增键，不删键）

**不要动**：`web/src/components/templates/*`（五号并行批在改）、`web/src/views/client/templates/*`（五号并行批在改）、`web/src/styles/templates.css`、`palettes.css`、`artist-tokens.css`、服务端任何文件。

---

## 任务 1：M2【P1】流程页挂接画师 palette 配色

**现状**：`ArtistHome.vue` 用 `usePalette(paletteId)` 在 html 上设 `data-palette` 激活 `--pal-*` 变量（`web/src/composables/usePalette.js` 已存在，`ArtistHome.vue:79-82` 是用法范例）。但 `OrderForm.vue` / `TrackOrder.vue` / `DeliveryPage.vue` 都没挂 → 流程页显示后台灰白。

**做法**（三个流程页各加 4 样东西）：

1. `import { usePalette } from '../../composables/usePalette.js'`
2. 从路由取 subdomain：`const route = useRoute()`（OrderForm 需确认是否已有 route 对象，没有就加 `const route = useRoute()`；三个页面都有 `:subdomain` 参数）
3. 加一个可响应的 paletteId 计算：页面若已加载画师数据（OrderForm 有 `artist`，TrackOrder/DeliveryPage 有 `subdomain`），则：
   ```js
   const paletteId = computed(() => artist.value?.paletteId || 'paper')
   usePalette(paletteId)
   ```
   若页面只有 subdomain 没有 artist 数据（TrackOrder/DeliveryPage），改从公开 API 拉画师信息（`GET /api/artists/:subdomain` 已返回 paletteId，见 artist.routes.ts:63）：
   ```js
   // TrackOrder.vue / DeliveryPage.vue 已有 artistApi 或类似调用处，复用同一请求
   const paletteId = computed(() => artist.value?.paletteId || 'paper')
   usePalette(paletteId)
   ```
   ⚠️ TrackOrder/DeliveryPage 的 artist 数据：若页面完全没有加载画师信息，则在 `<script setup>` 里加一个轻量请求（`GET /api/artists/${subdomain}`，前端 API 文件 `web/src/api/index.js` 里找现成 artist 获取函数；没有就加一个）。**要求：不额外加独立请求也行——若页面已有任何拿到 artist 的途径（如查询结果含 artist 信息），优先复用**。核心是 `data-palette` 在流程页挂上。
4. ⚠️ 别忘清理：`usePalette` 卸载时自动清理 `data-palette`（composable 已实现），无需额外处理。

**验证**：dev server 起流程页，`document.documentElement.dataset.palette` 应为 `paper/ink/dusk/moss` 之一，流程页背景跟随 `--pal-bg`（暖宣纸色）而非 `#f5f5f5`。

---

## 任务 2：M1【P1】EP 组件主色覆写（theme.css 双伪类）

**现状**：`theme.css` 已存在 `:root:root` 块（第 93-102 行左右），已验证覆写有效（EP base.css 后注入也不覆盖双伪类）。本任务**只需确认，通常无改动**。若发现 `:root:root` 块缺失（检查第 93 行附近），按研报 M1 修法补：
```css
:root:root {
  --el-color-primary: var(--color-primary);
  --el-color-primary-rgb: var(--color-primary-rgb);
  --el-color-primary-light-3: color-mix(in srgb, var(--color-primary) 70%, var(--bg-page));
  --el-color-primary-light-5: color-mix(in srgb, var(--color-primary) 50%, var(--bg-page));
  --el-color-primary-light-7: color-mix(in srgb, var(--color-primary) 30%, var(--bg-page));
  --el-color-primary-light-8: color-mix(in srgb, var(--color-primary) 20%, var(--bg-page));
  --el-color-primary-light-9: color-mix(in srgb, var(--color-primary) 10%, var(--bg-page));
  --el-color-primary-dark-2: color-mix(in srgb, var(--color-primary) 80%, var(--text-primary));
}
```
（当前 `--color-primary-rgb` 是静态 triplet 变量，`theme.css` 顶部已有定义，别改它。）

**验证**：浏览器 console `getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary')` → `#34dbcb`（亮）或 `#4de8d9`（暗），不是 `#409eff`。

---

## 任务 3：F1【P1】OrderForm 旧档位倍率区 6 处硬编码中文 → i18n

**现状**：`OrderForm.vue` 约第 72-127 行旧档位模式倍率区硬编码中文，同文件画风模式区已全走 `$t()`。**i18n 键已存在，零新增键**（`multiplierLabel`/`usageLabel`/`personal`/`rushLabel`/`noRush`/`receiptTotal` 在 zh-CN.js:320/333/334/626 和 en.js 同位置）。

**逐处替换**：
- `label="用途与加急"` → `:label="$t('orderForm.multiplierLabel')"`
- `<span class="multiplier-label">用途：</span>` → `{{ $t('orderForm.usageLabel') }}`
- `>个人</el-radio-button>` → `>{{ $t('orderForm.personal') }}</el-radio-button>`
- `<span class="multiplier-label">加急：</span>` → `{{ $t('orderForm.rushLabel') }}`
- `>不加急</el-radio-button>` → `>{{ $t('orderForm.noRush') }}</el-radio-button>`
- `<span>总价</span>`（倍率区总价行，约 L127）→ `{{ $t('orderForm.receiptTotal') }}`

**验证**：dev server 英文界面（`?lang=en` 或切换器）打开无画风数据画师的下单页，倍率区无残留中文；`grep -n "用途\|加急\|个人\|总价" web/src/views/client/OrderForm.vue` 倍率区应无中文残留（画风区已合规）。跑 `npx eslint web/src/views/client/OrderForm.vue`。

---

## 任务 4：F5【P2】查单页「无订单」3 秒锁 → 缩短

**现状**：`TrackOrder.vue` L264-265 `noOrdersCountdown.value = 3`，弹窗 `:show-close="noOrdersCountdown <= 0"` 强制 3 秒不可关。

**改法**：3 → 2（保留防滥用下限，减轻惩罚）。
- `web/src/views/client/TrackOrder.vue` L265：`noOrdersCountdown.value = 3` → `noOrdersCountdown.value = 2`

**验证**：查一个不存在订单，弹窗 2 秒后可关闭。

---

## 任务 5：U4【P2】查单页双进度组件并存 → 主从明确

**现状**：`TrackOrder.vue` L63-69 通用 5 步 `el-steps` 无条件渲染 + L72-88 画师自定义流程 `OrderTimeline`（`v-if="order.workflowStages?.length"`）。客户看到两套进度。

**改法**：有自定义流程时隐藏通用 5 步：
```html
<!-- 状态步骤（基于订单状态，始终可用） -->
<el-steps v-if="!order.workflowStages?.length" :active="stepActive" finish-status="success" simple style="margin-top: 20px">
```
（L63 那行 `<el-steps ...>` 加 `v-if="!order.workflowStages?.length"`，其余不动。）

**验证**：有自定义流程画师的订单 → 只显示时间线；无自定义流程 → 仍显示通用 5 步。

---

## 任务 6：U1【P2】查单结果页补「需求描述/参考图」回顾

**现状**：`TrackOrder.vue` 结果卡片只有画师/档位/时间/价格，客户看不到自己提交的需求描述和参考图。

**做法**（后端 track 响应是否已含 description/references 待你实测确认）：
1. 先查 track 响应：下单 API 创建订单时是否存了 description/references（查 `orderApi.lookup` 返回值）。
2. **若响应已含 description/references**：在结果卡片加一段展示（放状态步骤下方或价格上方）：
   ```html
   <div v-if="order.description || order.references?.length" class="brief-block">
     <h4 class="brief-title">{{ $t('track.briefTitle') }}</h4>
     <p v-if="order.description" class="brief-desc">{{ order.description }}</p>
     <div v-if="order.references?.length" class="brief-refs">
       <img v-for="(ref, i) in order.references" :key="i" :src="ref.url || ref" class="brief-ref-img" alt="参考图" />
     </div>
   </div>
   ```
   配套 scoped 样式（浅色块、圆角、参考图 80px 缩略图）。新增 i18n 键 `track.briefTitle`（zh-CN: `需求回顾`，en: `Your brief`）。
3. **若响应不含**：在交付报告里写清楚「需后端补字段」，不擅自改后端。`orderService.getClientQueuePosition` 返回物加 description/references 是后端改动，本批**不做**，留三号后续。

**验证**：下单带需求描述+参考图 → 查单页能看到；无需求 → 不显示该块。

---

## 任务 7：F6【P3】交付/查单下载失败反馈

**现状**：`DeliveryPage.vue` L71-73、`TrackOrder.vue` L251-253 直接 `window.open(url, '_blank')`——签名 URL 过期 → 403/空白，无提示。

**改法**：改 fetch→blob 下载 + 失败 ElMessage 提示。两处各加一个下载函数：
```js
async function downloadFile(url, fileName) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName || 'download'
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e) {
    ElMessage.error(t('delivery.downloadFailed'))
  }
}
```
- `DeliveryPage.vue`：`@click="download(d.url)"` 改为 `@click="downloadFile(d.url, d.fileName)"`
- `TrackOrder.vue`：同样替换（若有下载按钮）
- 新增 i18n 键 `delivery.downloadFailed`（zh-CN: `下载失败，请重试或联系画师`，en: `Download failed, please retry or contact the artist`）

**验证**：正常文件可下载；手工改坏签名 URL → 出现失败提示不白屏。

---

## 任务 8：M6【P3】NotFound 按钮硬编码白 → token

**现状**：`web/src/views/client/NotFound.vue` L96 附近 `.not-found-home-btn { color: #fff }`。

**改法**：`color: #fff` → `color: var(--pal-bg)`（与 TplHero 主按钮文字一致，随 palette 变）。

**验证**：404 页按钮文字在暗色 palette 下仍可读。

---

## 任务 9：U3【P3】落地页画师卡片懒加载

**现状**：`LandingPage.vue` L12-40 `el-card` 网格 + `el-avatar` 无 lazy。

**改法**：avatar 加 `lazy` 属性（EP el-avatar 支持 `:lazy="true"` + 骨架占位 `v-loading` 可保留现状）。

**验证**：落地页头像图片网络请求带 lazy 属性，首屏无阻塞。

---

## 任务 10：F2【P2】vite.config.js 注释乱码修复

**现状**：`web/vite.config.js` L8-10 注释 GBK 被当 UTF-8 读乱码（`"EP 鎸夐渶寮曞叆"` 等）。

**改法**：重写这三行注释为正确中文（意思按上下文推断：EP 按需引入/按需导入相关），**不要动配置逻辑**。用 write_file 全量重写文件前先 `Get-Content web/vite.config.js` 读全文，只改注释行，其他行原样保留。

**验证**：`Get-Content web/vite.config.js` 前 12 行无乱码；`npm run build` 正常。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果）。
2. 有视觉变化的任务（M2/M6/U1 区块）**附 before/after 截图**（无截图说明不了视觉，一号不放行）。截图放 `docs/audit-screenshots/beta-client-flow/` 目录随 commit 交付。
3. 交付报告文件名：`docs/comms/02-to-01-交付-Beta冲刺批1-流程页.md`。
4. commit 信息带「beta:」前缀，如 `beta: 流程页挂接palette配色+6处i18n+查单体验优化`。
