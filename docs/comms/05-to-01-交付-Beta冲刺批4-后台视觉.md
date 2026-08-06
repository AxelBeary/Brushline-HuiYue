# 交付：五号 · Beta 冲刺批 4 —— 后台视觉（F2 对比度 / F5a 印章 / F1 字号）

> 派工：`docs/comms/01-to-05-Beta冲刺批4-后台视觉.md`
> 分支：`beta/batch4-admin-visual`（worktree `../artist-commission-w12`）
> 交付日期：2026-08-06
> 代码提交：`9976624`（`beta: 纸墨盘对比度调深+头像印章兜底+后台字号档位`）
> 报告提交：`docs: 后台视觉批交付报告`（本文件）

---

## 一、F2 纸墨盘文字对比度调深（`web/src/styles/artist-tokens.css`）

| Token | 亮色（宣纸 #FFF 背景） | 实测对比度 | 达标线 |
|---|---|---|---|
| `--ink3` | `#8D887A` → **`#757062`** | **4.94:1** | AA 4.5:1 ✅ |
| `--ink4` | `#B3AE9F` → **`#807B6C`** | **4.23:1** | 3:1（大字号/占位）✅ |

- 暗色反向提亮（保证暗背景可读性，避免过暗糊成一团）：
  - `--ink3` → **`#8F8977`**（4.89:1 ✅）
  - `--ink4` → **`#726D5D`**（3.15:1 ✅）
- 亮色 `--ink3` 已过 AA（4.5:1）；`--ink4` 属次级文字/占位，4.23:1 超 3:1 达标线。

## 二、F5a 头像兜底 + 印章视觉（`web/src/components/ArtistLayout.vue`）

- **三处头像兜底**（侧边栏收起/展开/顶栏）：无头像时由「首字母」改为 **SealStamp「绘」印章**（scoped 样式适配 32px 尺寸、圆角 9）。
- **brand-seal**：hover 补 150ms 过渡 + 加深可点感。
- **logout-btn**：补 150ms 过渡。
- **侧边栏 nav-item**：复核已有 150ms 过渡，无遗漏。

## 三、F1 后台字号三档（`web/src/views/artist/Preferences.vue` + `ArtistLayout.vue`）

- Preferences 新增字号三档 `el-radio`（标准 / 大 / 特大），写入 `localStorage.huiyue_admin_font_size`。
- `watch` 即时生效：`large` → 15px、`xlarge` → 17px，EP 变量跟随；`normal` → 清除。
- ArtistLayout 挂载时应用 + 刷新保持。
- 实测：三档 computed-style 值正确（15px / 17px / 默认），刷新后持久化生效。
- i18n：`zh-CN.js` / `en.js` 同步新增档位文案。

## 四、验证

- ✅ web vitest **215/215 全绿**（一号独立复跑确认）
- ✅ eslint：4 个改动文件 0 error
- ✅ 截图已提交：`docs/audit-screenshots/beta-batch4/`
  - `f1-preferences-before.png` / `f1-preferences-after-standard.png` / `after-large.png` / `after-xlarge.png`（F1 三档前后）
  - `f2-ordersnew-before.png`（F2 before）
  - `f5a-sidebar-collapsed-before.png` / `f5a-sidebar-expanded-before.png`（F5a before）

## 五、未触碰

- ManualOrder / OrderList / ArtworkManage / Settings 页面
- `theme.css` / `palettes.css`
- 服务端（server/）代码

---

## ⚠️ 诚实标注（待一号补验收）

前序子代理执行截图时会话截断，**F2 orders-new 的 after 截图、F5a 的 after 截图可能未完成拍摄**，本次提交仅含上列 before 与 F1 三档 after 截图。**建议一号后续补浏览器验收**（F2 对比度实际观感、F5a 印章三处渲染效果），必要时补拍 after 截图归档。本报告不虚构任何未实际拍摄的截图。

## 六、收尾说明（五号）

- 临时文件已清理（`server/scripts/hermes-totp-batch4.mjs` / `web/vite.batch4.config.mjs` / `server/data/test-batch4.db*` / `web/data/vite-batch4.log`），未提交。
- 本分支未推送、未合并，等一号审核。
