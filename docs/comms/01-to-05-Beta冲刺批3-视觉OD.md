# 派工：五号 · Beta 冲刺批 3 —— OD-01 五色换色 + 藤黄调深 + T8 封面提示（视觉批）

> 分支：新建 `beta/visual-od01` · worktree：`../artist-commission-w7`（一号已建）
> 开工第一步：`git merge master` 再读本文件。
> 只动下面「授权文件」列表内文件，不推送不合并，干完写交付报告 commit 到自己分支。

---

## 任务摘要

三个已拍板视觉/功能项：① OD-01 客户端五色主色换色（**只换 1/2/3 号**，4/5 保留，对比度修复）；② OD-05 后台藤黄警告色调深（`#A8790B → #966C0A`）；③ T8 封面上限 6 张前端提示（后端三号批 1 已就绪，`COVER_LIMIT_REACHED` 错误码）。**纯前端。**

## 授权文件（只动这些）

- `web/src/styles/theme.css`（仅五色块，见任务 1；⚠️ 已有 `:root:root` 覆写块，别动它）
- `web/src/styles/artist-tokens.css`（仅 `--th` 藤黄值，见任务 2）
- `web/src/views/artist/ArtworkManage.vue`（仅封面设置错误提示，见任务 3）
- `web/src/locales/zh-CN.js`、`web/src/locales/en.js`（仅新增键）

**不要动**：`web/src/views/client/*`（二号并行批改 TrackOrder.vue 等）、`web/src/components/templates/*`（批 1 已收，非本次）、服务端任何文件、`web/src/styles/templates.css`/`palettes.css`。

---

## 任务 1：OD-01 客户端五色主色换色（只换 1/2/3 号亮色，暗色 1/2/3 换 v2 值）

**背景**：用户 2026-08-06 拍板「选 b」——1/2/3 号亮色不达标（1.73/2.12/3.15:1）换低饱和自然色，4/5 号已达标（4.77/6.95:1）**保留**。验收铁律：新值 ≥4.5:1 且不低于旧值。

### 1a. 亮色（`theme.css` L79-83 附近，`html[data-accent="1..5"]` 五条）

**before（当前）**：
```css
html[data-accent="1"] { --color-primary: #34dbcb; --color-primary-hover: #2ec4b6; --color-primary-soft: rgba(52, 219, 203, 0.10); --color-primary-rgb: 52, 219, 203; }
html[data-accent="2"] { --color-primary: #34c2db; --color-primary-hover: #2eaec4; --color-primary-soft: rgba(52, 194, 219, 0.10); --color-primary-rgb: 52, 194, 219; }
html[data-accent="3"] { --color-primary: #3498db; --color-primary-hover: #2e88c4; --color-primary-soft: rgba(52, 152, 219, 0.10); --color-primary-rgb: 52, 152, 219; }
html[data-accent="4"] { --color-primary: #346edb; --color-primary-hover: #2e62c4; --color-primary-soft: rgba(52, 110, 219, 0.10); --color-primary-rgb: 52, 110, 219; }
html[data-accent="5"] { --color-primary: #3445db; --color-primary-hover: #2e3ec4; --color-primary-soft: rgba(52, 69, 219, 0.10); --color-primary-rgb: 52, 69, 219; }
```

**after（1/2/3 换新值；4/5 原样保留）**：
```css
html[data-accent="1"] { --color-primary: #356B69; --color-primary-hover: #2d5a58; --color-primary-soft: rgba(53, 107, 105, 0.10); --color-primary-rgb: 53, 107, 105; }
html[data-accent="2"] { --color-primary: #3F5E80; --color-primary-hover: #354f6d; --color-primary-soft: rgba(63, 94, 128, 0.10); --color-primary-rgb: 63, 94, 128; }
html[data-accent="3"] { --color-primary: #5E5494; --color-primary-hover: #50487e; --color-primary-soft: rgba(94, 84, 148, 0.10); --color-primary-rgb: 94, 84, 148; }
html[data-accent="4"] { --color-primary: #346edb; --color-primary-hover: #2e62c4; --color-primary-soft: rgba(52, 110, 219, 0.10); --color-primary-rgb: 52, 110, 219; }
html[data-accent="5"] { --color-primary: #3445db; --color-primary-hover: #2e3ec4; --color-primary-soft: rgba(52, 69, 219, 0.10); --color-primary-rgb: 52, 69, 219; }
```
（hover = 主色略深；soft = 主色 10% 透明；rgb = 主色静态 triplet。数值已算好，直接照抄。）

### 1b. 暗色（`theme.css` L86-90 附近，`html.dark[data-accent="1..5"]` 五条）

**before（当前）**：
```css
html.dark[data-accent="1"] { --color-primary: #4de8d9; --color-primary-hover: #63ece0; --color-primary-soft: rgba(77, 232, 217, 0.12); --color-primary-rgb: 77, 232, 217; }
html.dark[data-accent="2"] { --color-primary: #4dd0e8; --color-primary-hover: #63d8ec; --color-primary-soft: rgba(77, 208, 232, 0.12); --color-primary-rgb: 77, 208, 232; }
html.dark[data-accent="3"] { --color-primary: #4da8e8; --color-primary-hover: #63b4ec; --color-primary-soft: rgba(77, 168, 232, 0.12); --color-primary-rgb: 77, 168, 232; }
html.dark[data-accent="4"] { --color-primary: #4d82e8; --color-primary-hover: #6392ec; --color-primary-soft: rgba(77, 130, 232, 0.12); --color-primary-rgb: 77, 130, 232; }
html.dark[data-accent="5"] { --color-primary: #4d5ce8; --color-primary-hover: #636eec; --color-primary-soft: rgba(77, 92, 232, 0.12); --color-primary-rgb: 77, 92, 232; }
```

**after（1/2/3 换第三方 v2 暗色建议值；4/5 原样保留）**：
```css
html.dark[data-accent="1"] { --color-primary: #8FBDBA; --color-primary-hover: #a3cbc9; --color-primary-soft: rgba(143, 189, 186, 0.12); --color-primary-rgb: 143, 189, 186; }
html.dark[data-accent="2"] { --color-primary: #90A9C9; --color-primary-hover: #a4bad5; --color-primary-soft: rgba(144, 169, 201, 0.12); --color-primary-rgb: 144, 169, 201; }
html.dark[data-accent="3"] { --color-primary: #A9A0D6; --color-primary-hover: #bab3e0; --color-primary-soft: rgba(169, 160, 214, 0.12); --color-primary-rgb: 169, 160, 214; }
html.dark[data-accent="4"] { --color-primary: #4d82e8; --color-primary-hover: #6392ec; --color-primary-soft: rgba(77, 130, 232, 0.12); --color-primary-rgb: 77, 130, 232; }
html.dark[data-accent="5"] { --color-primary: #4d5ce8; --color-primary-hover: #636eec; --color-primary-soft: rgba(77, 92, 232, 0.12); --color-primary-rgb: 77, 92, 232; }
```
（暗色 1/2/3 v2 建议值来自第三方 §2.2.4：`#8FBDBA`/`#90A9C9`/`#A9A0D6`，已确认达标。hover = 主色略亮；soft 保持 0.12。直接照抄。）

⚠️ **改动后 ThemePicker 五色圆点会变**（ThemePicker.vue 的 `accents` 数组可能有硬编码色值显示——**先查**：若 ThemePicker 显示色值来自 CSS 变量则自动生效；若硬编码 `#34dbcb` 等则需要同步改 ThemePicker 的显示色，**一并更新**，保持色板与实际一致）。

**验证**：
- `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')`（data-accent=1 亮色）= `#356B69`；暗色 = `#8FBDBA`
- 4/5 号亮暗不变
- ThemePicker 色板圆点与实际主色一致（截图留证）
- 白字按钮对比度：主色按钮文字在亮色下可读（截图留证，用户口述验收）

---

## 任务 2：OD-05 后台藤黄警告色调深

**背景**：用户 2026-08-06 拍板「2 调深」——后台 `--warning`（藤黄）`#A8790B` 白字对比度 3.89:1 不达标，调深至 `#966C0A`（6.28:1 达标）。暗色 `#D9B36A` 保持不动。

**做法**（`artist-tokens.css`）：

1. 亮色 `--th` 定义（约 L41）：`--th: #A8790B;` → `--th: #966C0A;`（**只改这一个值**）
2. ⚠️ 检查 `--th-t`（约 L42 `#F7EFDA` 软底）是否需微调：**先看实际用在哪**（待确认状态软底标签），若软底+深字对比度仍够（≥4.5）则不动；不够则报告建议值，不擅自改。
3. 确认 `--color-warning`（L84 `var(--th)`）与 `--el-color-warning`（L103 `var(--th)`）自动跟随，无需改。
4. **暗色 `--th: #D9B36A`（约 L150）不动**。

**验证**：`Select-String -Path web\src\styles\artist-tokens.css -Pattern '#A8790B'` 零命中；亮色下待确认状态/警告按钮可见可读（截图留证）。

---

## 任务 3：T8 封面上限前端提示

**背景**：三号批 1 已实现后端校验——`PUT /api/artist/artworks/:id/cover` 设满 6 张后抛 `400 { code: 'COVER_LIMIT_REACHED', error: '封面最多 6 张' }`。前端 `ArtworkManage.vue` 的 `toggleCover(art)` 目前会静默失败（或只显示通用错误），需补提示。

**做法**（`web/src/views/artist/ArtworkManage.vue`）：
1. 找到 `toggleCover(art)`（约 L67 附近被调用）——先读函数体，确认它调用哪个 API（`setCover`/`cover` 相关）。
2. 在错误处理里加 `COVER_LIMIT_REACHED` 分支：
   ```js
   catch (e) {
     if (e?.response?.data?.code === 'COVER_LIMIT_REACHED') {
       ElMessage.warning(t('artworks.coverLimitReached'))
     } else {
       // 保持既有错误处理
     }
   }
   ```
   （按项目实际错误结构调整——axios 拦截器可能已统一处理，先读代码。）
3. i18n 键：`artworks.coverLimitReached`（zh-CN: `封面最多 6 张，请先取消部分封面` / en: `Maximum 6 covers, please unset some first`）。

**验证**：测试库给画师设 6 张封面 → 对第 7 张点「设为封面」→ 出现提示「封面最多 6 张…」，且第 7 张未被设封面（后端拦截）。需造 7 个作品测试。

---

## 交付要求

1. 每个任务一行交付说明（改了什么 + 验证结果）。
2. **视觉变化任务（任务 1 换色 / 任务 2 藤黄）必须附 before/after 截图**（放 `docs/audit-screenshots/beta-od01/`，供用户口述验收）。
3. 交付报告：`docs/comms/05-to-01-交付-Beta冲刺批3-视觉OD.md`。
4. commit 信息带「beta:」前缀，如 `beta: OD-01五色换色1-3号+藤黄调深+T8封面提示`。
5. ⚠️ 若 ThemePicker 显示色值硬编码，**必须同步更新**（否则色板与实际不符，用户会看到两个颜色）。
