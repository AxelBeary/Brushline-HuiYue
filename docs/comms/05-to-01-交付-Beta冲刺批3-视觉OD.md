# 五号交付：Beta 冲刺批3 —— OD-01 五色换色 + 藤黄调深 + T8 封面提示

> 分支 `beta/visual-od01` · worktree `../artist-commission-w7`
> 开工前已 `git merge master`（fast-forward 49c7824，含批2拍板落档 + 三号批1 T8 后端）
> 验证环境：隔离 server 3999（DB_PATH/UPLOAD_DIR/AUTH_DEV_MODE 隔离）+ vite 5175，seed 测试库，已清理
> 视觉验收 = 量化证据 + before/after 截图，**用户口述判定**（vision 服务 404 属已知降级，不影响截图素材）

---

## 任务 1：OD-01 客户端五色主色换色（1/2/3 号，4/5 保留）✅

**改动**：
- `web/src/styles/theme.css` 五色块：亮色 1/2/3 换 `#356B69`/`#3F5E80`/`#5E5494`，暗色 1/2/3 换 `#8FBDBA`/`#90A9C9`/`#A9A0D6`；4/5 亮暗原样保留（L79-90）
- 同步 `:root` 默认 1 号块（L23-26）：默认 accent=1，若不改会残留旧值兜底（已确认 `theme.js` detectAccent 默认 '1' 且 applyTheme 恒设置 data-accent，此处为无 JS 兜底，改后保持一致）
- `:root:root` 覆写块**未动**（派工警告）

**验证（浏览器实测 computed style，亮暗 × 5 色）**：
| | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 亮 | #356B69 ✓ | #3F5E80 ✓ | #5E5494 ✓ | #346edb 保留 ✓ | #3445db 保留 ✓ |
| 暗 | #8FBDBA ✓ | #90A9C9 ✓ | #A9A0D6 ✓ | #4d82e8 保留 ✓ | #4d5ce8 保留 ✓ |

全部与派工 after 值逐字一致。

## 任务 2：OD-05 后台藤黄警告色调深 ✅

**改动**：`web/src/styles/artist-tokens.css` L41 亮色 `--th: #A8790B → #966C0A`。暗色 `#D9B36A` 未动；`--th-t` 软底 `#F7EFDA` 未动（深字浅底对比度充足）；`--color-warning`/`--el-color-warning` 自动跟随 var(--th) 无需改。

**验证（浏览器实测，后台纸墨盘主题 paper）**：
- `--th` = `#966C0A`、`--color-warning` = `#966C0A`、`--el-color-warning` = `#966C0A`、`--th-t` = `#F7EFDA` ✓
- 实际渲染点：订单管理列表「优先级=中」标签文字色 before `rgb(168,121,11)`(#A8790B) → after `rgb(150,108,10)`(#966C0A) ✓
- `Select-String '#A8790B'` 全库零命中（含注释已清理）

## 任务 3：T8 封面上限前端提示 ✅

**改动**：`web/src/locales/zh-CN.js` + `en.js` 新增 `errors.COVER_LIMIT_REACHED` 键（zh: `封面最多 6 张，请先取消部分封面` / en: `Maximum 6 covers, please unset some first`）。

**验证（实测）**：造 7 作品 + 6 封面 → 对第 7 张点「设为封面」→ MutationObserver 捕获提示 **「封面最多 6 张，请先取消部分封面」**（拦截器 errors.* 翻译链路生效）；DB 复查第 7 张 is_cover=0（后端拦截，6 封面保持）。

---

## ⚠️ 两处与派工模板的偏差（请一号审核）

### 偏差 A：ThemePicker.vue 在授权列表外，按派工正文条件授权执行

派工任务 1 ⚠️ 与交付要求 5 均明示：「若 ThemePicker 显示色值硬编码，**必须同步更新**（否则色板与实际不符）」。实测硬编码属实（`ThemePicker.vue` L60-66 accents 数组 + L74 fallback）→ 已同步 1/2/3 号圆点色 + fallback `#356B69`，4/5 保留。**该文件不在授权列表，特此显著标注，请一号确认**。浏览器实测色板圆点渲染色与 data-accent 渲染色一致（rgb 53,107,105 / 63,94,128 / 94,84,148 / 52,110,219 / 52,69,219）。

### 偏差 B：T8 未照抄派工代码模板（axios 拦截器机制下模板为死代码）

派工模板 `e?.response?.data?.code === 'COVER_LIMIT_REACHED'` **永不命中**：axios 响应拦截器（`web/src/api/index.js` L16-68）统一按 `errors.${code}` 翻译错误码并 `reject(new Error(msg))`——**吞掉了 `.response` 结构**，调用方 catch 里拿不到 response。照抄 = 死代码（违背不产屎山底线）。按派工授权「先读代码，按项目实际错误结构调整」，采用拦截器既有 `errors.*` 键机制（键名从派工的 `artworks.coverLimitReached` 调整为 `errors.COVER_LIMIT_REACHED`），**ArtworkManage.vue 零改动**，实测提示正常显示。派工字面键名若照加会成死键。

## ⚠️ 已知联动缺口（未动，交一号决策）

**画师设置页色板（Settings.vue ACCENT_PRESETS）显示旧 hex，与客户端实际渲染色不一致**。未改原因：后端 accent_color 白名单硬编码旧 5 hex（`artist.service.ts:196`），改前端色板值 → 画师保存新值被后端 400 拒绝 + 已存数据回显断。当前链路功能完整（画师存旧 hex → ArtistHome 映射索引 → 渲染新色），仅设置页色板观感滞后。彻底一致需**后端同步批**：白名单换新 hex + Settings.vue + ArtistHome.vue ACCENT_INDEX + 存量数据迁移——跨服务端/前端/数据，建议三号排批或一号裁决。

---

## 验证门禁

| 项 | 结果 |
|---|---|
| ESLint（web 全量） | ✅ 零错误零警告 |
| web vitest | ✅ **215/215**（13 文件，与基线一致） |
| build | ✅ 成功（6.74s） |
| server 测试 | 未跑（本批纯前端，server 零改动） |

## 截图（`docs/audit-screenshots/beta-od01/`，12 张，供用户口述验收）

- 任务1 客户端主页：`client-light-1/2/3/4-after.png`、`client-dark-1-after.png`、`client-light-1-before.png`、`client-light-2-before.png`、`client-dark-1-before.png`（before 为旧色 #34dbcb/#34c2db/#4de8d9 实测确认后截图）
- ThemePicker 色板：`picker-after.png`（圆点 1/2/3 新色 + 4/5 原色）
- 任务2 后台订单列表：`admin-orderlist-th-before.png`（#A8790B）/ `admin-orderlist-th-after.png`（#966C0A）
- 任务3 作品管理：`admin-artworks-t8.png`（7 作品 6 封面）

## 清理

隔离进程已停、测试库/uploads/日志已删、临时脚本（TOTP/造数/校验）已删、vite 临时配置已删、package-lock.json 已还原。`git status` 仅剩 5 个改动文件 + 截图目录。
