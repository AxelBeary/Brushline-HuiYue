# 派工：二号 · Beta 冲刺批 3 —— 查单体验增强（A1 订单号找回 + U1 需求回顾前端）

> 分支：新建 `beta/client-query-enhance` · worktree：`../artist-commission-w6`（一号已建）
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

两个查单页（`TrackOrder.vue`）体验增强：① A1——客户不记得订单号时，只填 QQ 列出"我的订单"（后端 `/orders/my` 能力已就绪，纯前端接线）；② U1——查单结果补「需求描述/参考图」回顾（后端字段由三号并行批补，前端先写好 v-if 守卫区块）。**纯前端，不碰后端。**

## 授权文件（只动这些）

- `web/src/views/client/TrackOrder.vue`
- `web/src/api/index.js`（仅加 API 封装，不删不改既有函数）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（仅新增键）
- 新建 `web/src/utils/track.js`（轻量埋点 util，见任务 3——本次先建骨架 + 换色埋点实际调用）

**不要动**：`web/src/views/client/OrderForm.vue`/`DeliveryPage.vue`/`LandingPage.vue`（五号并行批不动这些，但保持只动授权范围）、`web/src/styles/*`（五号并行批改 theme.css/artist-tokens.css）、服务端任何文件（三号并行批补 U1 后端字段）、`web/src/views/artist/*`（五号并行批改 ArtworkManage.vue）。

---

## 任务 1：A1【P2】查单页「只填 QQ 列出我的订单」

**现状**：`TrackOrder.vue` 查询区（L13-21 附近）有 `qq` 输入 + `orderNo` 输入，客户必须填订单号才能查。后端 `/orders/my?qq=` 已存在（order.routes.ts:254），前端 API 封装 `myOrders` 已在 `web/src/api/index.js:236`，但**全 UI 零调用**。

**做法**（在查询区加"我的订单"入口）：

1. **API 封装确认**：`web/src/api/index.js:236` 已有 `myOrders: (subdomain, qq) => api.get('/orders/my', { params: { subdomain, qq } })`——确认存在即可复用，无需新增。

2. **UI**：在查询表单下方（订单号输入行之后、查询按钮区之前）加一行"我的订单"触发入口：
   ```html
   <div class="my-orders-trigger">
     <el-button size="small" text type="primary" :disabled="!qq.trim()" @click="loadMyOrders">
       {{ $t('track.myOrdersBtn') }}
     </el-button>
   </div>
   ```
   - `qq.trim()` 为空时禁用（必须有 QQ 才能查）。

3. **逻辑**：
   ```js
   const myOrders = ref([])
   const myOrdersLoading = ref(false)
   const showMyOrders = ref(false)

   async function loadMyOrders() {
     if (!qq.value.trim()) return
     myOrdersLoading.value = true
     try {
       const res = await orderApi.myOrders(subdomain, qq.value.trim())
       myOrders.value = res?.orders || res || []
       showMyOrders.value = true
     } catch (e) {
       ElMessage.warning(t('track.myOrdersFailed'))
     } finally {
       myOrdersLoading.value = false
     }
   }
   ```
   ⚠️ **先看 `/orders/my` 实际返回结构再写 `myOrders.value` 赋值**（GET 请求 `web/src/api/index.js:236` 返回的是什么形状——数组还是 `{orders: []}`？以实测为准，别猜）。

4. **展示**：`showMyOrders` 为 true 时，在查询结果区（`order` 卡片上方或下方）渲染"我的订单"列表：
   ```html
   <el-card v-if="showMyOrders" class="my-orders-card" style="margin-top: 16px">
     <template #header><span>{{ $t('track.myOrdersTitle') }}</span></template>
     <el-empty v-if="!myOrders.length && !myOrdersLoading" :description="$t('track.myOrdersEmpty')" />
     <div v-loading="myOrdersLoading">
       <div v-for="o in myOrders" :key="o.orderNo" class="my-order-item" @click="fillAndSearch(o)">
         <div class="my-order-no">{{ o.orderNo }}</div>
         <div class="my-order-meta">{{ o.tierName }} · {{ formatDate(o.createdAt) }}</div>
       </div>
     </div>
   </el-card>
   ```
   - `fillAndSearch(o)`：点某条订单 → 填 `orderNo.value = o.orderNo` → 调既有查询流程（复用现有 lookup/search 函数，先读代码找到查询函数名）。
   - 列表项字段按 `/orders/my` 实际返回结构写（orderNo/tierName/createdAt 是猜测，以实测为准）。
   - 样式 `.my-order-item` 可点击（cursor pointer + hover 背景）。

5. **i18n 键**（zh-CN + en 双语新增）：
   - `track.myOrdersBtn`：`我的订单` / `My orders`
   - `track.myOrdersTitle`：`我的订单` / `My orders`
   - `track.myOrdersEmpty`：`该 QQ 暂无订单` / `No orders found for this QQ`
   - `track.myOrdersFailed`：`加载订单失败，请重试` / `Failed to load orders, please retry`

**验证**：dev server 查单页只填 QQ → 点「我的订单」→ 列出该 QQ 全部订单 → 点一条自动填订单号并查询。无订单 QQ → 空态提示。需真实造两笔订单测试。

---

## 任务 2：U1 查单结果「需求回顾」区块（前端，v-if 守卫）

**现状**：track 响应当前不含 description/references——**三号并行批正在补后端字段**（getClientQueuePosition 返回物加 description + references，仅 source='client'）。本批先把前端区块写好（`v-if` 守卫：字段没回来就不显示，后端合入后自然生效）。

**做法**（`TrackOrder.vue` 结果区，状态步骤/时间线之后、价格区块之前加）：
```html
<div v-if="order.description || order.references?.length" class="brief-block">
  <h4 class="brief-title">{{ $t('track.briefTitle') }}</h4>
  <p v-if="order.description" class="brief-desc">{{ order.description }}</p>
  <div v-if="order.references?.length" class="brief-refs">
    <img
      v-for="(ref, i) in order.references"
      :key="i"
      :src="ref.url || ref"
      class="brief-ref-img"
      :alt="$t('track.briefRefAlt')"
    />
  </div>
</div>
```
- references 结构按三号交付的实际形状写（可能是 `[{url, originalName}]` 或纯 url 数组——先写兼容 `ref.url || ref`，交付报告里标注实际形状）。
- scoped 样式：浅色块（`background: var(--pal-surface)` 或类似）、圆角、参考图 80px 缩略图带间距。
- i18n 键：`track.briefTitle`（`需求回顾` / `Your brief`）、`track.briefRefAlt`（`参考图` / `Reference image`）。

**验证**：后端字段合入前不显示（守卫生效）；三号合入后联调（可等三号合入 master 后 merge 再验，或本批交付报告标注"待联调"）。**交付时若三号尚未合入，写清"前端已就绪，待三号后端字段联调验证"。**

---

## 任务 3：轻量埋点 util 骨架 + 换色埋点（`theme_accent_change`）

**背景**：用户拍板 3 处埋点全做（OD-01），本次先建骨架 + 埋点①（换色率）。项目无现成业务埋点设施（仅 Sentry 错误监控），需自建轻量 util。

**做法**：

1. 新建 `web/src/utils/track.js`：
   ```js
   /**
    * 轻量业务埋点（2026-08-06 用户拍板 OD-01）
    * 当前实现：console.debug 输出 + 可选远程端点（后续接入）。
    * 避免依赖 Sentry（错误监控 ≠ 业务分析）。
    */
   const EVENT_VERSION = 'natural-v2' // 当前五色值版本：neon-v1 旧 / natural-v2 换色后

   export function trackEvent(name, payload = {}) {
     const event = { name, ts: Date.now(), version: EVENT_VERSION, ...payload }
     // eslint-disable-next-line no-console
     console.debug('[track]', event)
     // TODO(埋点后端): 接入服务端收集端点后启用 window.fetch('/api/events', ...)
     return event
   }
   ```

2. `ThemePicker.vue` 换色调用处（`@click="themeStore.setAccent(a.id)"`，约 L30）——**在 setAccent 调用后加换色埋点**：
   ```js
   import { trackEvent } from '../utils/track.js'
   // ... 换色按钮处
   @click="themeStore.setAccent(a.id); trackEvent('theme_accent_change', { accent: a.id })"
   ```
   ⚠️ 先读 ThemePicker.vue 确认 `setAccent` 的调用位置与 `accents` 结构（a.id 是 1-5 数字），按实际写。**埋点 util 骨架 + 换色埋点本次交付；漏斗/后台使用率埋点等一号后续派工。**

**验证**：切换主色 → console 输出 `[track] {name: 'theme_accent_change', accent: 1, version: 'natural-v2'}`；无控制台报错。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果）。
2. **A1 列表交互**必须实测（造数据走一遍"只填 QQ → 列表 → 点击查询"）；截图非必须（功能型改动）。
3. 交付报告：`docs/comms/02-to-01-交付-Beta冲刺批3-查单增强.md`。
4. commit 信息带「beta:」前缀，如 `beta: 查单页我的订单+需求回顾区块+换色埋点`。
5. ⚠️ 若 `/orders/my` 返回结构与你预期不符，**以实测为准**调整赋值，交付报告写明实际结构。
