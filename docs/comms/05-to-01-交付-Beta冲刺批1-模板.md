# 交付：五号 · Beta 冲刺批 1 —— 客户模板页体检修复 + 研报模板部分

> 分支：`beta/template-polish` · worktree：`artist-commission-w5` · 开工前已 merge master（`df26d7d`）
> 派工：`docs/comms/01-to-05-Beta冲刺批1-模板.md` · 参考：研报 M4/F3/U2/F4 + 四号模板体检清单（T2/T3/T5/T6）
> 状态：**7/7 任务完成，未推送未合并**，等待一号审核

---

## 门禁自检

| 项 | 结果 |
|----|------|
| ESLint（web） | ✅ 0 错误 0 警告（复跑确认） |
| Build（web） | ✅ 成功（`vite build`） |
| 后端测试 | 未动后端，不适用（本批纯前端） |
| 改动文件 | 9 授权文件 + 2 locale（越权说明见下）+ 14 张截图 |

## 各任务交付说明

### T2【P1】folio 导航动态化 —— ✅ 完成
- `ArtistHomeFolio.vue` L163-170：navItems 由硬编码 2 项改为按数据动态生成——`galleryArtworks`（作品）、`styles||tiers||workflowStages`（价格）、`rules`（须知）、留言板恒有。
- 新增 i18n 键 `artistHome.navRules`（约稿须知/How to order）、`artistHome.navGuestbook`（留言板/Guestbook），zh-CN + en 双语。
- **实测**（隔离实例 3100 + seed 库）：alice（3 作品/3 档位/须知）导航 = 作品/价格/约稿须知/留言板 4 项与区块一一对应；empty（无数据）导航仅剩留言板、无死链；点击平滑滚动到 `#gallery/#pricing/#rules/#guestbook`。
- 截图：`docs/audit-screenshots/beta-templates/t2-nav-alice-{before,after}.png`、`t2-nav-empty-{before,after}.png`

> ⚠️ **自修 bug（1/2）**：初版 navItems 用 `galleryArtworks.length`（computed ref 对象无 length，恒 undefined），「作品」导航永不显示、但模板区块正常——经编译产物反查 + 浏览器实测定位，修为 `galleryArtworks.value.length`。此 bug 只在本次新增逻辑中出现，原模板无同类写法（其余模板未在 script 中裸读 ref 属性）。

### T3【P2】档位/画风按钮未随画师状态禁用 —— ✅ 完成
- `TplTierGrid.vue`：props 新增 `artist`（Object, default null），computed `artistStatus = props.artist?.status ?? 'open'`；选择按钮 `:disabled="activeTier.visibility === 'showcase' || artistStatus !== 'open'"`。
- `TplStyleGrid.vue`：同法（多画风 + 单画风两处 order-btn 均加 disabled）；补 `.tpl-style-order-btn:disabled` 样式与 hover `:not(:disabled)`（与 TplTierGrid 一致，防 disabled 后 hover 视觉异常）。
- 4 模板（Classic/Gallery/Folio/Atelier）调用处均传 `:artist="artist"`。
- **实测**：bob（status=full）→「选择此档位」disabled ✅；alice（open）→ 可点 ✅。
- 截图：`docs/audit-screenshots/beta-templates/t3-tier-bob-{before,after}.png`

### T6【P3】atelier 硬编码宋体 → var(--font-display) —— ✅ 完成
- `ArtistHomeAtelier.vue` 全文件 10 处 `'Noto Serif SC', 'STSong', 'SimSun', serif` → `var(--font-display)`（公告/章节标题/作品题注/页码/留言板全套）。
- **验证**：`Select-String 'Noto Serif|STSong|SimSun'` 零命中；实测 atelier 页标题/公告 computed fontFamily = `"LXGW WenKai", KaiTi, STKaiti, serif`（与三模板一致）。
- 截图：`docs/audit-screenshots/beta-templates/t6-font-atelier-{before,after}.png`

### T5【P3】TplHero 按钮动画 0.25s → 0.15s —— ✅ 完成
- `TplHero.vue` L115 `.tpl-btn` transition 一处 `0.25s → 0.15s`（仅此一处，其他 transition 未动）。
- **验证**：grep `0.25s` 零命中。

### M4【P2】4 模板残留死 CSS 删除 —— ✅ 完成
- 4 模板各删「封面精选」死样式整块（先确认模板区零引用、纯样式块）：Classic `.classic-covers/.classic-cover-show`、Gallery `.gallery-covers/.gallery-cover-frame/.gallery-cover-show`、Folio `.folio-covers` 系列、Atelier `.atelier-covers/.atelier-cover-polaroid/.atelier-cover-show`（含各自移动端 @media）。
- **验证**：4 文件模板区 `covers` 零引用（grep 全文件仅剩 ArtworkManage.js 的 JS 变量名，非 CSS）；build 正常；截图对比无页面变化。

### U2【P2】移动端公告浮层重叠 —— ✅ 完成
- `ArtistHomeGallery.vue` `.gallery-announcement`、`ArtistHomeAtelier.vue` `.atelier-announcement` 各加 `@media (max-width: 640px)` 断点：absolute 转 relative、top/left/right/bottom auto、`max-width: calc(100% - 32px)`、`margin: 12px auto`（公告回文档流）。
- **几何量化实测**（375×667，Playwright boundingBox）：after 公告 position=relative、y≈676-679（落 hero 之后文档流），与展签（y≈400）无相交；before atelier 公告 absolute y=567 与展签区接近。
- 截图：`docs/audit-screenshots/beta-templates/u2-gallery-mobile-{before,after}.png`、`u2-atelier-mobile-{before,after}.png`

### F4【P2】TplHero split 双图叠放遮挡 —— ✅ 完成（缩窄交错）
- `TplHero.vue` `.tpl-hero-split-img:nth-child(2)` 补 `width: 56%`（原 78%，与第一张对角叠放时遮挡作品主体）。
- **几何量化实测**（1280×800）：双图重叠面积占比 **before 55% → after 21%**（第二张 394px→283px 宽）；21% 为交错布局固有可见重叠，符合派工「缩窄+保持交错」预期。
- 截图：`docs/audit-screenshots/beta-templates/f4-split-hero-{before,after}.png`

---

## ⚠️ 越权说明（需一号确认）

`web/src/locales/zh-CN.js`、`web/src/locales/en.js` **不在派工授权文件列表**，但派工 T2 正文明确要求「i18n 键 navRules/navGuestbook 若不存在则新增（zh-CN/en）」，故按派工正文执行新增 2 键。若一号认为 locale 越权，可回退此 2 处 + 将导航须知/留言板改用已有键（如 `guestbook.title`）。

## 自修 bug 汇总（2 个，均在交付前修复并验证）

1. navItems 裸读 computed ref `.length` → 改 `.value.length`（T2，见上）。
2. `<script setup>` 内裸用 props 变量（styles/tiers/workflowStages/rules）触发 ESLint no-undef → 改 `props.xxx`（首轮 ESLint 抓出）。

## 环境说明（验证用，已清理）

- 隔离实例：`DB_PATH=server/data/test-tpl-batch.db`（seed 造 alice/bob/empty/atelier 画师）+ `WEB_DIST` 直出 + PORT 3100/3111（before=HEAD 版对比），验证完已 kill。
- 测试作品图：从主仓回收站复制（5 张 ≤16B 损坏占位不可用）→ 改用 `web/src/assets/logo.webp` 副本；测试库/测试图在 `.gitignore` 内，未进 git。
- 临时脚本（temp-tpl-setup.mjs / temp-tpl-screenshots.mjs / temp-tpl-geometry.mjs）已删除；before worktree 已移除；package-lock.json 因 install 产生的改动已 `git checkout` 还原。

## 交付物清单（本次 commit 内容）

```
web/src/views/client/templates/ArtistHomeFolio.vue
web/src/views/client/templates/ArtistHomeClassic.vue
web/src/views/client/templates/ArtistHomeGallery.vue
web/src/views/client/templates/ArtistHomeAtelier.vue
web/src/components/templates/TplHero.vue
web/src/components/templates/TplTierGrid.vue
web/src/components/templates/TplStyleGrid.vue
web/src/locales/zh-CN.js
web/src/locales/en.js
docs/audit-screenshots/beta-templates/*.png（14 张 before/after）
```

> 截图视觉结论依赖几何量化 + 无 vision 路线（vision 模型 503 不可用），截图留存供用户口述验收；建议一号有条件时人眼复核。
