# 画师主页模板系统 — 重构规划 v2

> 创建日期：2026-07-28
> 状态：已确认，实施中
> 前置依赖：v0.9.0 模板系统已上线（defineAsyncComponent + 3 模板）
> i18n 修复：已完成（505 键中英对齐，模板硬编码文字清零）

---

## 一、核心洞察

用户反馈：「2 和 3 像是一个模板的不同颜色」。

**结论：颜色不应该是模板的区别维度。** DarkGallery 和 SinglePage 结构几乎相同（头部→作品→价格→流程→须知），只是配色不同。把"配色"硬塞进"模板"里，导致模板数量虚胖、代码重复。

**新模型：模板 = 布局 × 配色**

```
布局（Layout）— 页面怎么摆          配色（Palette）— 页面什么气质
├─ classic  经典双栏                ├─ paper  纸（暖白 + 墨字）
├─ gallery  全屏画廊                ├─ ink    墨（深炭 + 层灰）
└─ folio    单页导航                ├─ dusk   暮（蓝灰暮色）
                                    └─ moss   苔（深绿自然）

3 布局 × 4 配色 = 12 种主页风格
```

- **布局**决定结构（开场方式、栏目排布、画廊形态）
- **配色**决定气质（底色、文字色、表面色），每种配色有亮/暗两套
- **主色**（已有的五色系统）独立于配色，由访客选择，桥接为强调色
- 画师选「布局 + 配色」两个维度，客户的主色偏好依然生效

---

## 二、配色系统（Palette）

### 2.1 四种配色定义

| ID | 名称 | 亮色底 | 暗色底 | 气质 |
|----|------|--------|--------|------|
| `paper` | 纸 | `#faf8f5` | `#1c1a17` | 暖白宣纸感，墨字，安静 |
| `ink` | 墨 | `#f2f2f0` | `#0e0e0e` | 画廊深炭，层灰，克制 |
| `dusk` | 暮 | `#eef1f6` | `#131a26` | 蓝灰暮色，冷静 |
| `moss` | 苔 | `#f0f4ee` | `#141c14` | 深绿自然，温润 |

每种配色定义一组 `--pal-*` 变量（亮/暗各一套）：

```css
[data-palette="paper"] {
  --pal-bg: #faf8f5;        /* 页面底 */
  --pal-bg-alt: #f3efe9;    /* 分区底 */
  --pal-surface: #ffffff;   /* 卡片面 */
  --pal-text: #2b2622;      /* 主文字 */
  --pal-text-dim: #8a8177;  /* 次文字 */
  --pal-border: #e5ddd2;    /* 线条 */
}
html.dark [data-palette="paper"] {
  --pal-bg: #1c1a17;
  --pal-bg-alt: #24211d;
  --pal-surface: #2a2621;
  --pal-text: #e8e2d9;
  --pal-text-dim: #9a9184;
  --pal-border: #3a352e;
}
/* ink / dusk / moss 同理 */
```

### 2.2 与现有主题系统的关系

```
访客控制（客户端偏好，已有）：
  html.dark          ← 亮/暗模式
  html[data-accent]  ← 五色主色 → --color-primary

画师控制（服务端数据，新增）：
  html[data-palette] ← 配色 → --pal-* 变量

模板 CSS 规则：
  表面/文字/线条 → var(--pal-*)     ← 跟画师配色
  强调/按钮/链接 → var(--color-primary) ← 跟访客主色
```

**关键**：配色不是"硬编码的深色/浅色"，而是"有亮暗两套的气质底色"。画师选 `ink`，喜欢亮色的客户看到的是浅墨灰，喜欢暗色的客户看到的是深炭——气质一致，亮暗随客户。

### 2.3 数据模型（迁移 v9）

```sql
ALTER TABLE artists ADD COLUMN palette_id TEXT DEFAULT 'paper';
```

> 注：plan-price-calculator.md 中写的"迁移 v8"已被 v0.9.0 的 template_id 占用，价格计算器实际为 v10+。

### 2.4 后端改动

- `db/init.js`：迁移 v9（`palette_id` 列）
- `artist.service.js`：
  - `getPublicProfile` 返回 `paletteId`
  - `updateArtist` 允许 `paletteId`（白名单 + 校验 4 个合法值）
- `artist.routes.js`：PUT profile schema 加 `paletteId`（enum: paper/ink/dusk/moss）

### 2.5 前端改动

- `styles/palettes.css`：4 配色 × 亮暗变量（新文件，main.js 引入）
- `composables/usePalette.js`：
  ```js
  // ArtistHome.vue 挂载时设置 data-palette，卸载时清理
  export function usePalette(paletteId) {
    onMounted(() => { document.documentElement.dataset.palette = paletteId || 'paper' })
    onUnmounted(() => { delete document.documentElement.dataset.palette })
  }
  ```
- `ArtistHome.vue`：调用 `usePalette(artist.paletteId)`
- `Settings.vue` 模板 Tab：布局选择器（3 卡片）+ 配色选择器（4 色板）

---

## 三、三个布局的重设计

### 3.1 classic（经典）→ "工作室"

**开场**：代表作横幅（第一张作品铺满，底部渐变遮罩），画师名用霞鹜文楷大字叠在画上。不是居中头像三件套。

**结构**：
```
┌─ 代表作横幅（60vh，画 + 名字 + 状态 + 双按钮）─────┐
├──────────────┬──────────────────────────────────┤
│ 左栏（吸顶）  │  右栏（滚动）                     │
│  头像         │  价格档位（主打档位放大）          │
│  简介         │  约稿流程（复用 OverviewStrip）    │
│  社交链接     │  作品网格（可预览）                │
│  [约稿]常驻   │  约稿须知                         │
│              │  免责声明                          │
└──────────────┴──────────────────────────────────┘
移动端：左栏折叠到顶部，单栏
```

**特征**：双栏不对称、约稿按钮吸顶常驻、标题用 `--font-display`（霞鹜文楷）。

### 3.2 gallery（画廊）→ "美术馆"

**开场**：第一幅作品占满整个视口（object-fit: cover），名字像展签一样贴在左下角（小字、间距、竖排感），不是居中大标题。

**结构**：
```
┌─ 全屏画作（100vh，底部渐变，左下展签：名字/简介/状态/按钮）─┐
├──────────────────────────────────────────────────────┤
│  GALLERY（大写间距小标题）                              │
│  大幅作品（宽 85%）→ 小幅（宽 55%，右偏）→ 大幅 …       │
│  （大小交错 editorial 布局，悬停微放大，点击预览）       │
├──────────────────────────────────────────────────────┤
│  PRICING — 档位卡片（主色描边，收款比例徽章）           │
├──────────────────────────────────────────────────────┤
│  PROCESS — 编号时间线（收款节点主色高亮）               │
├──────────────────────────────────────────────────────┤
│  RULES — 须知文字                                     │
├──────────────────────────────────────────────────────┤
│  [ThemePicker] [Disclaimer]                           │
│  ── 吸底约稿条（滚过开场后浮现）──                      │
└──────────────────────────────────────────────────────┘
```

**特征**：全屏画作开场、展签式名字、大小交错画廊、悬停放大 + 点击预览。

### 3.3 folio（单页）→ "落地页"

**开场**：左文右图分屏。左边：状态标签 + 超大名字 + 简介 + 双按钮 + 社交链接；右边：代表作 2-3 张叠放预览（微旋转、层叠阴影）。不是居中三件套。

**结构**：
```
┌─ 固定导航（名字 | 关于 价格 流程 作品 | [约稿]）滚动侦测高亮 ─┐
├──────────────────────┬───────────────────────────────────┤
│  ● 接受约稿中         │   ┌────────────┐                  │
│  画师名（超大）       │   │  代表作 1   │                  │
│  简介                │   ├────────────┤                  │
│  [开始约稿 →][查进度] │   │  代表作 2   │（叠放，微旋转）   │
│  微博 · B站          │   └────────────┘                  │
├──────────────────────┴───────────────────────────────────┤
│  作品（瀑布流，可预览）                                    │
│  价格（卡片网格 + 增项预览插槽 ← 价格计算器扩展点）         │
│  流程（编号 + 收款比例）                                   │
│  须知                                                     │
│  [深色 CTA 区 + ThemePicker + Disclaimer]                  │
└──────────────────────────────────────────────────────────┘
移动端：汉堡菜单 + 吸底约稿条
```

**特征**：分屏开场、滚动侦测导航高亮、汉堡菜单、吸底约稿条。

### 3.4 三个布局的真正差异

| 维度 | classic | gallery | folio |
|------|---------|---------|-------|
| 开场 | 代表作横幅 + 名字叠画 | 全屏画作 + 角落展签 | 左文右图分屏 |
| 栏目 | 桌面双栏（吸顶信息卡） | 单栏全宽 | 单栏 + 固定导航 |
| 画廊 | 等高网格 | 大小交错 editorial | 瀑布流 |
| CTA | 左栏吸顶常驻 | 吸底条 | 吸底条 + 导航按钮 |
| 导航 | 无（滚动） | 无（滚动） | 滚动侦测高亮 |
| 移动端 | 单栏折叠 | 单栏 | 汉堡菜单 |

配色（paper/ink/dusk/moss）独立叠加在任意布局上。

---

## 四、目标架构（分层）

```
web/src/
├── composables/                    ← 新建
│   ├── useArtistData.js            ← 数据适配（字段映射、默认值、imgUrl、statusText）
│   ├── usePalette.js               ← data-palette 设置/清理
│   ├── useScrollReveal.js          ← IntersectionObserver 滚动渐入
│   └── useStickyCta.js             ← 吸底/吸顶 CTA 可见性
│
├── components/templates/           ← 新建：布局共享组件
│   ├── TplStatusBadge.vue          ← 状态点 + i18n 文字
│   ├── TplHero.vue                 ← 头部（variant: banner/fullscreen/split）
│   ├── TplTierGrid.vue             ← 档位网格（主打放大 + addons 插槽）
│   ├── TplGallery.vue              ← 画廊（layout: grid/editorial/masonry，el-image 预览）
│   ├── TplRules.vue                ← 须知 v-html
│   └── TplStickyCta.vue            ← 吸底约稿条
│
├── views/client/
│   ├── ArtistHome.vue              ← 容器（加 paletteId + addons/multipliers props）
│   └── templates/
│       ├── ArtistHomeClassic.vue   ← 原 Default 重写
│       ├── ArtistHomeGallery.vue   ← 原 DarkGallery 重写
│       └── ArtistHomeFolio.vue     ← 原 SinglePage 重写
│
└── styles/
    ├── theme.css                   ← 已有（不动）
    ├── palettes.css                ← 新建：4 配色 × 亮暗
    └── templates.css               ← 新建：模板共享变量 + 动效 keyframes
```

### 4.1 数据适配层（防 Bug 核心）

模板不直接碰 props 字段名，全走 `useArtistData(props)`：

```js
const {
  artist, tiers, artworks, workflowStages,
  statusText, statusType, imgUrl, socialLinks, heroArtwork
} = useArtistData(props)
```

- `imgUrl(path)` 统一拼 `/uploads/` 前缀
- `statusText(status)` 走 i18n
- `socialLinks` computed 过滤空值
- `heroArtwork` 取第一张作品（开场用）
- 未来价格计算器上线 → 这里加 `addons`/`multipliers`/`formatPrice()`，模板零改动

### 4.2 后端扩展接入流程（增量，不回归）

```
1. 后端加字段 → API 返回新数据
2. ArtistHome.vue 加一个 ref + fetch
3. <component :is> 多传一个 prop（default: []）
4. useArtistData 加一个适配函数
5. 共享组件加一个可选 prop（v-if 守卫，空不渲染）
6. 模板里一行 <TplXxx :new-data="newData" />
```

每步增量添加，不改现有代码 → 不出回归 Bug。

### 4.3 模板注册表

```js
const TEMPLATES = {
  'classic': defineAsyncComponent(() => import('./templates/ArtistHomeClassic.vue')),
  'gallery': defineAsyncComponent(() => import('./templates/ArtistHomeGallery.vue')),
  'folio':   defineAsyncComponent(() => import('./templates/ArtistHomeFolio.vue')),
}
// 兼容旧值：default→classic, dark-gallery→gallery, single-page→folio
```

旧 `template_id` 值（default/dark-gallery/single-page）做映射兼容，老数据不炸。

---

## 五、实施阶段

| Phase | 内容 | 产出 | 验证 |
|-------|------|------|------|
| **0** | 基础设施 | composables（4 个）+ Tpl*.vue（6 个）+ palettes.css + templates.css | 构建通过 |
| **1** | 配色系统后端 | 迁移 v9 + artist.service/routes 的 paletteId + Settings 配色选择器 | 测试通过 + 手动切换 |
| **2** | classic 布局 | ArtistHomeClassic.vue（代表作横幅 + 双栏 + 吸顶 CTA） | 截图验收 |
| **3** | gallery 布局 | ArtistHomeGallery.vue（全屏画作 + 展签 + editorial 画廊 + 吸底条） | 截图验收 |
| **4** | folio 布局 | ArtistHomeFolio.vue（分屏 Hero + 滚动侦测 + 汉堡 + 吸底条） | 截图验收 |
| **5** | 收尾 | 旧值映射兼容 + i18n 完整性 + 移动端 + 文档 + 提交 | 测试 + 构建 + 三布局×四配色抽查 |

每个 Phase 完成后：`npx vitest run` + `npm run build` + 手动验证。**做一个验收一个。**

---

## 六、i18n 键（已补全）

`artistHome` 命名空间新增（中英对齐，505 键）：
```
about, navPricing, navProcess, navWork,
heroOpen, heroFull, heroBreak,
startCommission, trackOrder, howItWorks, ctaSubtitle,
weiboPlain, bilibiliPlain
```

配色相关键（Phase 1 补）：
```
templates.palette, templates.paletteHint,
templates.palettePaper/paletteInk/paletteDusk/paletteMoss + Desc
templates.layout, templates.layoutClassic/layoutGallery/layoutFolio + Desc
```

---

## 七、不做的事（明确排除）

- ❌ 不引入新依赖（无 Tailwind / GSAP / 新动画库）
- ❌ 不做模板在线编辑器 / 拖拽布局
- ❌ 不做视频背景 / 3D 效果
- ❌ 不改 ArtistHome.vue 容器的数据获取逻辑（只加 prop 传递）
- ❌ 配色不做"自定义色值输入"（只给 4 个预设，画师不碰色号）
- ❌ 不做每个布局独立的亮暗开关（亮暗跟访客偏好，配色跟画师）

---

## 八、风险与对策

| 风险 | 对策 |
|------|------|
| 共享组件过度抽象抹平差异 | 组件用 props + slots 控制差异，布局保留自己的 scoped style |
| 旧 template_id 值（default 等）失效 | 注册表做映射兼容（default→classic 等） |
| data-palette 全局污染（离开主页残留） | usePalette 在 onUnmounted 清理 |
| 滚动渐入低端机卡顿 | will-change + prefers-reduced-motion 降级 |
| 全屏 Hero 图加载慢 | loading="lazy" + --pal-bg 占位色 |
| 价格计算器上线 prop 爆炸 | useArtistData 统一适配 + 组件可选 prop |
