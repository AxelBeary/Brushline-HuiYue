# 派工：五号 · Beta 冲刺批 1 —— 客户模板页体检修复 + 研报模板部分

> 分支：`beta/template-polish` · worktree：`../artist-commission-w5`
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。
> 参考主文档：`docs/comms/02-to-01-前端全页面研判报告-20260806.md`（研报 M4/F3/U2/F4）+ 四号模板体检清单（T2/T3/T5/T6，原文在 git 历史 `git show 1a8806b:docs/comms/04-to-01-模板体检清单-20260806.md`，已按用户拍板精简进本派工）。

---

## 任务摘要

修客户 4 模板页（classic/gallery/folio/atelier）的交互缺陷与视觉走样：folio 导航动态化、档位按钮状态禁用、atelier 字体统一、动画时长收敛、死 CSS 清理、公告浮层移动端重叠、hero 双图遮挡。**不碰后端、不碰流程页（OrderForm/TrackOrder/DeliveryPage——二号并行批在改）。**

## 授权文件（只动这些）

- `web/src/views/client/templates/ArtistHomeClassic.vue`
- `web/src/views/client/templates/ArtistHomeGallery.vue`
- `web/src/views/client/templates/ArtistHomeFolio.vue`
- `web/src/views/client/templates/ArtistHomeAtelier.vue`
- `web/src/components/templates/TplHero.vue`
- `web/src/components/templates/TplTierGrid.vue`
- `web/src/components/templates/TplStyleGrid.vue`
- `web/src/components/templates/TplGallery.vue`（仅 U2 需要时）
- `web/src/styles/templates.css`（仅必要小改，优先 scoped）

**不要动**：`web/src/views/client/OrderForm.vue`/`TrackOrder.vue`/`DeliveryPage.vue`/`LandingPage.vue`/`NotFound.vue`（二号并行批在改）、`web/src/styles/theme.css`（二号批在改）、`palettes.css`、`artist-tokens.css`、服务端任何文件。

---

## 任务 1：T2【P1】folio 导航动态化（空数据死链 + 锚点不全）

**现状**：`ArtistHomeFolio.vue` L163-166：
```js
const navItems = computed(() => [
  { id: 'gallery', label: t('artistHome.navWork') },
  { id: 'pricing', label: t('artistHome.navPricing') }
])
```
空数据态（无作品/无画风）时 `#gallery`/`#pricing` 锚点不存在 → 点击无反应；有数据态缺「约稿须知」「留言板」锚点。

**改法**：navItems 按数据动态生成（页面已有作品/画风/须知/留言板数据对象，参照现有变量名）：
```js
const navItems = computed(() => {
  const items = []
  if (hasWorks) items.push({ id: 'gallery', label: t('artistHome.navWork') })
  if (hasTiers) items.push({ id: 'pricing', label: t('artistHome.navPricing') })
  if (hasRules) items.push({ id: 'rules', label: t('artistHome.navRules') })
  items.push({ id: 'guestbook', label: t('artistHome.navGuestbook') })
  return items
})
```
- 变量名按页面实际数据源改（作品列表/画风列表/须知文本/留言板组件存在性），**先读文件确认数据对象名再写**。
- 页面实际区块 id：`gallery`/`pricing`/`rules`/`guestbook`（先 grep 页面确认这 4 个 id 存在；若 `rules` 区块无 id，给它补 `id="rules"`）。
- i18n 键：`artistHome.navRules`/`artistHome.navGuestbook` 若不存在则新增（zh-CN: `约稿须知`/`留言板`，en: `How to order`/`Guestbook`）。
- 空数据态至少保留留言板一项（guestbook 恒有），导航不整体消失。

**验证**：空数据画师（无作品无画风）→ 导航只显示留言板，无死链；有数据画师 → 导航含作品/价格/须知/留言板，点击平滑滚动到对应区块。

---

## 任务 2：T3【P2】档位按钮未随画师状态禁用

**现状**：`TplTierGrid.vue` L58-64：
```html
<button
  class="tpl-tier-select-btn"
  :disabled="activeTier.visibility === 'showcase'"
  @click="goOrder()"
>
```
只判断 showcase，没查 `artist.status`。`TplStyleGrid.vue` L62 附近「选择此画风约稿」同缺。

**改法**：两处 `:disabled` 都加 status 判断（组件需能拿到 artist.status——先读组件 props；TplTierGrid 的 `useArtistData(props)` 已含 artist，确认后取 `props.artist?.status` 或页面传入）：
```html
:disabled="activeTier.visibility === 'showcase' || artistStatus !== 'open'"
```
- `artistStatus` 定义为组件内 computed，来源：`props.artist?.status ?? props.status ?? 'open'`（按实际 props 结构定，先读文件）。
- TplStyleGrid 同法。

**验证**：bob（status=full）主页 → 档位区「选择此档位」disabled、画风区「选择此画风约稿」disabled；alice（open）→ 可点。

---

## 任务 3：T6【P3】atelier 硬编码宋体 → var(--font-display)

**现状**：`ArtistHomeAtelier.vue` L212/233/310 等标题/公告/留言板正文硬编码 `'Noto Serif SC', 'STSong', 'SimSun', serif`。

**改法**：全部替换为 `var(--font-display)`。先 `Select-String -Path web\src\views\client\templates\ArtistHomeAtelier.vue -Pattern 'Noto Serif|STSong|SimSun'` 找出全部出现点（不止 3 处），逐个替换。

**验证**：`Select-String ... -Pattern 'Noto Serif|STSong|SimSun'` 在 atelier 文件零命中；atelier 标题字体与三模板一致（文楷）。

---

## 任务 4：T5【P3】TplHero 按钮动画时长 0.25s → 0.15s

**现状**：`TplHero.vue` L115：`.tpl-btn { transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1) }`——违反动画纪律 0.15s。

**改法**：`0.25s` → `0.15s`（仅 `.tpl-btn` 一处，其他不动）。

**验证**：`grep -n "0.25s" web/src/components/templates/TplHero.vue` 零命中。

---

## 任务 5：M4【P2】4 模板残留死 CSS 删除

**现状**：v0.36 画廊改版后 4 模板各残留「封面精选」死样式（已无对应元素）：
- `ArtistHomeClassic.vue` L133-164（`.classic-covers`/`.classic-cover-show`）
- `ArtistHomeGallery.vue` L128-169（`.gallery-covers`/`.gallery-cover-frame`）
- `ArtistHomeFolio.vue` L214-269（`.folio-covers`/`.folio-cover-show`）
- `ArtistHomeAtelier.vue` L144-195（`.atelier-covers`/`.atelier-cover-polaroid`）

**做法**：
1. 每个文件先 `Select-String -Pattern 'covers|cover-show|cover-frame|cover-polaroid'` 确认引用点：模板区（`<template>`）应零引用，只有 `<style>` 里有。
2. 若有模板区引用 → **停手**，在交付报告标注「发现活引用」不删。
3. 纯样式块 → 整个删除（按行号块删）。

**验证**：4 文件模板区 `covers` 零引用；`npm run build` 正常；4 模板页面截图无变化。

---

## 任务 6：U2【P2】移动端公告浮层重叠风险

**现状**：`ArtistHomeGallery.vue` L171-189 公告 `absolute; top:32px; left:32px; max-width:320px`；`ArtistHomeAtelier.vue` L197-218 公告 `absolute; right:40px; bottom:40px; max-width:280px`——窄屏（375px）可能与展签/CTA 重叠。

**改法**：在各自 scoped 样式加窄屏断点，公告回到文档流或收窄：
```css
@media (max-width: 640px) {
  .gallery-announcement { /* 或实际类名 */
    position: relative;
    top: auto; left: auto; right: auto; bottom: auto;
    max-width: calc(100% - 32px);
    margin: 12px auto;
  }
}
```
类名按实际文件读（先 grep `.announcement` 或公告元素 class）。

**验证**：375px 宽浏览器打开 gallery/atelier 有公告画师的页面，公告不与展签/CTA 重叠。

---

## 任务 7：F4【P2】TplHero split 变体双图叠放遮挡风险

**现状**：`TplHero.vue` L72-81 split 变体两张作品图各 `width: 78%` 对角摆放（rotate ±1.25deg），宽高比接近时可能重叠。

**做法**：先看当前代码，若两张图确实 `width: 78%` 且 `position: absolute` 对角——改为第二张图缩窄（如 `width: 56%`）并保持交错（第二张 bottom-right 时 `left: auto; right: -2%` 之类，按现状微调）。**小改，不重构布局**；若实测 4 模板数据均无重叠风险（作品少），可在交付报告标注「观察项未触发，未改」并附截图证据。

**验证**：多作品画师 split hero 双图无遮挡，附图。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果）。
2. 视觉变化任务（T2 导航 / T6 字体 / U2 公告 / F4 双图）**附 before/after 截图**，截图放 `docs/audit-screenshots/beta-templates/`。
3. 交付报告：`docs/comms/05-to-01-交付-Beta冲刺批1-模板.md`。
4. commit 信息带「beta:」前缀，如 `beta: 模板体检T2/T3/T6修复+死CSS清理+U2/F4视觉`。
