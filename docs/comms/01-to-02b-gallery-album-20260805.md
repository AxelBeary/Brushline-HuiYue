# 派工：v0.36 波 2-A — 客户画廊改画册翻页（用户拍板：替换网格 + 模板区分度）

> 来自：一号 | 2026-08-05
> Worktree：`D:\Hermes Agent CN Desktop\workspace\artist-commission-w2b`
> 分支：`feat/v036-gallery-album`（已建好，基于 master 48b1c27）
> **开工第一步**：cd 进 worktree 先 `git merge master`，再读本文件。

---

## 需求（用户原话）

1. 客户主页的作品画廊**替换**现有网格/瀑布流，改成**画册式左右翻页**：一次一张大图 + 左右箭头，像翻画册
2. **不同模板要有区分度**：四个主页模板的翻页要有各自的视觉主题
3. 用户追问"挑一个模板做大小交错可以吗"→ 一号拍板：**Gallery 模板**做大小交错（editorial）节奏——它名字和 i18n 描述本来就是 editorial，正好归位

## 现状

- 四个模板（`web/src/views/client/templates/ArtistHomeClassic/Gallery/Folio/Atelier.vue`）都用 `<TplGallery :artworks :gallery :subdomain />`，没传 layout，全走默认 masonry 瀑布流
- `web/src/components/templates/TplGallery.vue`：layout prop（grid/editorial/masonry）+ 点图开 lightbox（灯箱里已有左右箭头）+ F6 画廊档位筛选（filteredArtworks）
- Gallery 模板注释写"大小交错 editorial"、Folio 注释写"瀑布流"（与实际默认值不一致的历史遗留）

## 方案

1. **先 grep `TplGallery` 全项目引用**，确认只有四个主页模板在用（若有其他使用点，grid 行为保留不动）
2. TplGallery.vue 新增画册模式：
   - 一次展示一张大图，居中含容器，配左右箭头按钮（复用现有 `tpl-lb-arrow` 的样式思路）
   - 键盘 ←/→、触摸滑动（pointer events，手机端必须能滑）、页码指示（`3 / 12`）
   - 切图带过渡动画（淡入+微位移即可，别过度）
   - **保留 F6 筛选行**：筛选切换后翻页重置到第一张；保留点大图开 lightbox 放大（画册是浏览，灯箱是细看，两层都在）
   - 单张作品时隐藏箭头/页码
3. 四个模板全部切到画册模式，**区分度**靠各自模板文件里的 CSS 覆盖实现：
   - **Gallery**：大小交错（editorial）节奏——当前页大图，相邻页缩小侧露（用户点名要的）
   - **Classic**：端正素雅，细边框 + 文字题注
   - **Folio**：沉浸暗调，图占满、元信息压角
   - **Atelier**：画室感，轻旋转纸片/工作台质感
   - 四套视觉在现有模板风格语言内做，不引入新设计系统
4. 顺手修正历史不一致：Gallery 模板注释已符合（editorial），Folio 注释"瀑布流"改成实际行为描述；i18n `galleryDesc`（en.js L816 附近）描述更新为翻页画廊，zh-CN 对应键同步
5. 网格/masonry 的 CSS 是否删除：grep 确认无其他引用后删；拿不准就留着并在交付报告标注

## 授权文件

`web/src/components/templates/TplGallery.vue`、`web/src/views/client/templates/ArtistHome{Classic,Gallery,Folio,Atelier}.vue`、`web/src/locales/zh-CN.js` + `en.js`

**禁区**：`QueueBoard.vue`（波 1 二号正在改，撞车）、server/ 全部、其他模板组件。

## 验证

worktree 内 `npm install` 后：`npx vitest run`（web 基线 144）+ `npx eslint .`（零警告零错误硬规则）+ `npm run build`。vite dev 起服务，四个模板逐一切换手动验证翻页/滑动/筛选/lightbox。

## 完工

git add 授权文件逐个加（禁 `git add -A`）→ commit（`feat(client): 中文描述` 单行，可多个）→ `docs/comms/02b-to-01-gallery-album-交付-20260805.md` 交付报告并 commit。不推送、不合并。返回摘要：commit hash、测试结果、四模板区分度说明、遗留。
