# 派工：五号 · Beta 冲刺批 4 —— 后台视觉批（F2 对比度 + F5a 观感 + F1 字号）

> 分支：`beta/batch4-admin-visual` · worktree：`../artist-commission-w12`
> 开工第一步：`git merge master` 再读本文件。
> 依据：内测反馈核实记录 `docs/comms/核实-内测反馈-20260806.md`（F2/F5a/F1 三项）。
> 只动授权文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

三个内测反馈，都是画师后台视觉/可用性：① F2 纸墨盘辅助文字对比度不足（`--ink3`/`--ink4` 调深）；② F5a 后台观感（头像兜底「画」字太丑 + 品牌区复核 + 按钮动效）；③ F1 后台字号调节（老年人看不清小字）。**纯前端。**

## 授权文件（只动这些）

- `web/src/styles/artist-tokens.css`（F2 调深）
- `web/src/components/ArtistLayout.vue`（F5a 头像兜底/品牌区 + F1 字号入口）
- `web/src/views/artist/Preferences.vue`（F1 字号设置 UI，若该页合适）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（仅新增键）

**不要动**：`web/src/views/artist/ManualOrder.vue`/`OrderList.vue`/`ArtworkManage.vue`/`Settings.vue`（二号并行批改 ManualOrder；Settings 涉及 F3 快捷入口四号在议，不动）、`web/src/styles/theme.css`/`palettes.css`（客户端轨道，本批后台）、服务端任何文件、`web/src/components/artist/dashboard/*`（除非 F5a 必须）。

---

## 任务 1：F2 纸墨盘辅助文字对比度调深

**背景**：`--ink3 #8D887A` 在宣纸背景对比度 3.21-3.54:1、`--ink4 #B3AE9F` 仅 2.22:1（不达 WCAG AA 正文 4.5:1）。用户反馈"淡色对比度太低，很舒服但看不清，特别是按钮"。

**做法**（`artist-tokens.css` 亮色纸墨变量，约 L24-27 附近）：
- `--ink3`：调深到对比度 ≥4.5:1（on `--paper2 #FBFAF6` 卡片底）。建议候选 `#7A756A` 或 `#6F6A5F`——**用项目自带 contrast 脚本或在线公式实测**（WCAG 相对亮度公式），交付报告写实测对比度值（before 3.2x → after ≥4.5）。
- `--ink4`：同上调深（建议 `#9A9488` 附近，≥4.5:1 on 白卡；若只能用于 disabled/占位可放宽到 3:1 但交付报告说明用途）。
- ⚠️ **只调这两个变量的值，不动其他**；暗色纸墨盘（ink 主题）若对应变量也低对比，按同标准微调并写实测值。
- ⚠️ 检查使用面：`--ink3`/`--ink4` 用在哪些地方（提示文字/占位/disabled/标签），确保调深后视觉仍协调（**截图 before/after**，用户口述验收）。

**验证**：computed-style 实测关键提示文字（如录单页 paste-hint、设置页 hint）对比度 ≥4.5:1；截图。

---

## 任务 2：F5a 后台观感（第一印象）

**背景**：内测用户吐槽——① 未传头像画师左下角头像就一个「画」字（`ArtistLayout.vue:334` `avatarChar = artistName[0]`）；② 左上角品牌区没被认出是 logo；③ 按钮控件丑、动画一点没有。用户明确"颜色其他都挺好的"（已换标签色），本批只修这三样。

### 2a. 头像兜底改品牌印章 SVG（而非首字母）

**做法**（`ArtistLayout.vue` L65-66/L106-107/L179-180 三处头像兜底）：
- 未传头像时，用**品牌印章 SVG 占位**（仓库已有 `web/src/components/shared/visual/SealStamp.vue`——朱砂「绘」印章，直接复用或简化版），替代 `{{ avatarChar }}` 首字母
- 印章尺寸适配当前 avatar 类（大/小折叠态），颜色用 `--zs` 朱砂或 `--hq` 花青（观感统一）
- ⚠️ 若 SealStamp 组件参数不匹配（尺寸/颜色），先读它源码，必要时传参或 scoped 样式调整；**尽量不改 SealStamp 本身**（其他页面在用），优先在 ArtistLayout 包一层

### 2b. 品牌区可辨识复核

**做法**（`ArtistLayout.vue` L9-15 品牌区）：
- 展开态：朱砂印章「绘」+ 绘约（文楷）+ BRUSHLINE——已存在。复核观感：印章是否太小/太淡，是否加 hover 微效（轻微放大/颜色加深 150ms）让它像"可点的 logo"
- 折叠态（只剩印章）：确认印章清晰可辨（尺寸 ≥28px、朱砂色足）
- 截图 before/after（展开+折叠两态）

### 2c. 按钮/交互动效（150ms 纪律）

**做法**（`ArtistLayout.vue` scoped 样式 + 必要的全局后台按钮样式）：
- 侧边栏 nav-item：hover/active 已有（花青软底+3px 竖条）——检查是否有 transition，无则补 `transition: background-color 0.15s, color 0.15s`
- 折叠按钮/登出按钮/语言按钮：补 hover 微效（`opacity 0.85` 或背景淡变，150ms）
- 顶栏/身份区如果有可交互元素同理
- ⚠️ 不动 EP 全局按钮样式（theme.css 已有批 1 处理）；只补侧边栏/顶栏局部
- 截图 before/after（hover 态可用 CSS 规则存在性 + computed-style 佐证，不需要真实指针）

---

## 任务 3：F1 后台字号调节（无障碍）

**背景**：内测反馈"后台需要字体调节（有老年人看不清小字）"——真实缺失，后台无字号设置。

**做法（最小实现）**：
1. **字号档位**：`Preferences.vue`（偏好页）加「界面字号」选择：标准 / 大 / 特大（三档），存 `localStorage`（键 `huiyue_admin_font_size`，值 `normal|large|xlarge`）。
   - ⚠️ 先读 Preferences.vue 现有结构（有主题/语言设置），复用其保存模式（themeStore 或直接 localStorage——按页面实际）。
2. **生效机制**：`ArtistLayout.vue` 挂载时读档位，给布局根节点设 `data-font-size` 属性（`document.documentElement.dataset.fontSize = size` 或布局容器 class）：
   ```css
   html[data-font-size='large'] .artist-layout { font-size: 15px; }
   html[data-font-size='xlarge'] .artist-layout { font-size: 17px; }
   ```
   ⚠️ 先确认 ArtistLayout 字号体系（是否有根 font-size 变量），用**最小侵入**：优先覆盖布局根字号变量（如 `--font-size-base` 若存在），EP 组件内部字号跟随 `:root` font-size 的会自适应；不跟随的（EP 硬编码 14px）需报告说明哪些区域不受控，不强行全改。
3. **i18n 键**：`preferences.fontSize`/`fontSizeNormal`/`fontSizeLarge`/`fontSizeXLarge` 双语。
4. 切换即时生效（watch 档位 → 设 dataset）。

**验证**：偏好页切「特大」→ 后台整体字号变大（computed-style 实测布局文字 font-size 变化）；刷新后保持；切回标准恢复。截图 before/after。

---

## 交付要求

1. 每个任务交付说明（改了什么 + 验证结果）。
2. **视觉任务（F2/F5a）必须附 before/after 截图**（`docs/audit-screenshots/beta-batch4/`），供用户口述验收。
3. 交付报告：`docs/comms/05-to-01-交付-Beta冲刺批4-后台视觉.md`。
4. commit 信息带「beta:」前缀，如 `beta: 纸墨盘对比度调深+头像印章兜底+后台字号档位`。
5. eslint + web vitest 215/215 + build 通过。
